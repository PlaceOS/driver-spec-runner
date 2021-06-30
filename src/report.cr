require "colorize"
require "griffith"
require "http"
require "json"
require "option_parser"
require "uri"
require "atomic"

module Settings
  class_property host = "localhost"
  class_property port = 8080
  class_property repo = ""
end

OptionParser.parse(ARGV.dup) do |parser|
  parser.banner = "Usage: #{PROGRAM_NAME} [arguments]"

  parser.on("-h HOST", "--host=HOST", "Specifies the server host") { |h| Settings.host = h }
  parser.on("-p PORT", "--port=PORT", "Specifies the server port") { |p| Settings.port = p.to_i }
  parser.on("-r REPO", "--repo=REPO", "Specifies the repository to report on") { |r| Settings.repo = r }
end

puts "running report against #{Settings.host}:#{Settings.port} (#{Settings.repo.presence ? "default " : Settings.repo + " "}repository)"

# Driver discovery
###################################################################################################

print "discovering drivers... "

response = with_runner_client &.get("/build")
if !response.success?
  puts "failed to obtain driver list"
  exit 1
end

drivers = Array(String).from_json(response.body)
puts "found #{drivers.size}"

# Spec discovery
###################################################################################################

print "locating specs... "

response = with_runner_client &.get("/test")
if !response.success?
  puts "failed to obtain spec list"
  exit 2
end

specs = Array(String).from_json(response.body)
puts "found #{specs.size}"

###################################################################################################

record Datum, state : State, value : String do
  enum State
    CompileOnly
    Failed
    NoCompile
    Timeout
  end

  forward_missing_to state

  {% for state in State.constants %}
    # Create a `State::{{ state }}`
    def self.{{ state.underscore }}(value : String)
      new State::{{ state }}, value
    end
  {% end %}
end

###################################################################################################

Griffith.config do |c|
  # c.running_message "waiting"
end

tasks_lock = Mutex.new
tasks = [] of Griffith::Task
state_lock = Mutex.new
state = [] of Datum

record CompileOnly, driver : String, task : Griffith::Task
record Test, driver : String, spec : String, task : Griffith::Task

alias Build = CompileOnly | Test

build_channel = Channel(Build).new(4)
test_channel = Channel(Test).new(10)

Signal::INT.trap do |signal|
  build_channel.close
  test_channel.close
  tasks_lock.synchronize { tasks.each &.fail("cancelled") }
  signal.ignore
end

tested = Atomic(Int32).new(0)

# Build the drivers
spawn do
  loop do
    break unless build = build_channel.receive?
    build.task.details("compiling")
    with_runner_client do |client|
      client.read_timeout = 6.minutes
      begin
        if build?(build, client)
          if build.is_a?(Test)
            build.task.details("builds")
            test_channel.send(build)
          else
            build.task.done("builds")
          end
        else
          state_lock.synchronize { state << Datum.no_compile(build.driver) }
        end
      rescue IO::TimeoutError
        build.task.fail("timeout")
        state_lock.synchronize { state << Datum.timeout(build.driver) }
      end
    end
    tasks_lock.synchronize { tasks.delete(build.task) } if build.is_a? CompileOnly
  end
end

# Test the drivers
spawn do
  loop do
    break unless build = test_channel.receive?
    build.task.done("testing")
    tested.add(1)

    params = URI::Params.new({
      "driver" => [build.driver],
      "spec"   => [build.spec],
      "force"  => ["true"],
    })

    params["repository"] = Settings.repo unless Settings.repo.blank?
    uri = URI.new(path: "/test", query: params)

    with_runner_client do |client|
      client.read_timeout = 6.minutes
      begin
        if client.post(uri.to_s).success?
          build.task.done("done")
        else
          build.task.fail("failed")
        end
      rescue IO::TimeoutError
        build.task.fail("timeout")
        state_lock.synchronize { state << Datum.timeout(build.driver) }
      end
    end
    tasks_lock.synchronize { tasks.delete(build.task) }
  end
end

drivers.each do |driver|
  task = Griffith.create_task(driver)
  tasks_lock.synchronize { tasks << task }
  spec = "#{driver.rchop(".cr")}_spec.cr"
  build = if !specs.includes? spec
            CompileOnly.new(driver, task)
          else
            Test.new(driver, spec, task)
          end

  build_channel.send(build) rescue nil
end

# Output report
###################################################################################################

failed = state.select &.failed?
timeout = state.select &.timeout?
no_compile = state.select &.no_compile?
compile_only = state.select &.compile_only?

puts "\n\nspec failures:\n * #{failed.join("\n * ")}" if !failed.empty?
puts "\n\nspec timeouts:\n * #{timeout.join("\n * ")}" if !timeout.empty?
puts "\n\nfailed to compile:\n * #{no_compile.join("\n * ")}" if !no_compile.empty?
result_string = "\n\n#{tested.lazy_get} drivers, #{failed.size + no_compile.size} failures, #{timeout.size} timeouts, #{compile_only.size} without spec"
if timeout.empty? && failed.empty? && no_compile.empty?
  puts result_string
else
  puts result_string
end

# Helpers
###################################################################################################

def with_runner_client
  HTTP::Client.new(Settings.host, Settings.port) do |client|
    yield client
  end
end

def build?(build : Build, client)
  response = client.post("/build?driver=#{build.driver}")
  response.success?.tap do |built|
    unless built
      build.task.fail("failed to compile!")
      build.task.details("\n#{response.body}\n")
    end
  end
end
