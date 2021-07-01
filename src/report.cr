require "atomic"
require "colorize"
require "griffith"
require "http"
require "json"
require "option_parser"
require "uri"

module Settings
  class_property host = "localhost"
  class_property port = 8080
  class_property repo = ""
end

module PlaceOS::Drivers
  class Report
    getter log_directory : Path

    def initialize(log_directory : String = "./report_failures")
      @log_directory = Path[log_directory].expand
      Dir.mkdir_p(@log_directory)
    end

    # Fail states
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

    getter state_channel : Channel(Datum) = Channel(Datum).new
    getter state : Array(Datum) = [] of Datum

    # Rendering
    ###################################################################################################

    getter tasks_lock : Mutex = Mutex.new
    getter tasks : Array(Griffith::Task) = [] of Griffith::Task

    # CSP
    ###################################################################################################

    record CompileOnly, driver : String, task : Griffith::Task
    record Test, driver : String, spec : String, task : Griffith::Task

    alias Build = CompileOnly | Test

    getter done_channel : Channel(Nil) = Channel(Nil).new
    getter build_channel : Channel(Build) = Channel(Build).new(1)
    getter test_channel : Channel(Test) = Channel(Test).new(10)

    getter tested : Atomic(Int32) = Atomic(Int32).new(0)

    def stop
      build_channel.close
      test_channel.close
      tasks_lock.synchronize { tasks.each &.fail("cancelled") }
    end

    def build(unit)
      unit.task.done("compiling")
      self.class.with_runner_client do |client|
        client.read_timeout = 6.minutes
        begin
          client.post("/build?driver=#{unit.driver}") do |response|
            if response.success?
              unit.task.done("builds")

              if unit.is_a?(Test)
                test_channel.send(unit)
                return
              end
            else
              unit.task.fail("failed to compile!")
              state_channel.send Datum.no_compile(unit.driver)
              spawn { log_compilation_failure(unit, response.body_io) }
            end
          end
        rescue IO::TimeoutError
          unit.task.fail("timeout")
          state_channel.send Datum.timeout(unit.driver)
        end
      end

      mark_finished(unit)
    end

    def test(unit)
      unit.task.done("testing")
      tested.add(1)

      params = URI::Params.new({
        "driver" => [unit.driver],
        "spec"   => [unit.spec],
        "force"  => ["true"],
      })

      params["repository"] = Settings.repo unless Settings.repo.blank?
      uri = URI.new(path: "/test", query: params)

      self.class.with_runner_client do |client|
        client.read_timeout = 6.minutes
        begin
          if client.post(uri.to_s).success?
            unit.task.done("done")
          else
            state_channel.send Datum.failed(unit.driver)
            unit.task.fail("failed")
          end
        rescue IO::TimeoutError
          unit.task.fail("timeout")
          state_channel.send Datum.timeout(unit.driver)
        end
      end

      mark_finished(unit)
    end

    def run(drivers : Array(String), specs : Array(String)) : Nil
      # Collect statistics
      spawn do
        while result = state_channel.receive?
          state << result
        end
      end

      # Build the drivers
      spawn do
        loop do
          break unless unit = build_channel.receive?
          build(unit)
        end
      end

      # Test the drivers
      spawn do
        loop do
          break unless unit = test_channel.receive?
          test(unit)
        end
      end

      drivers.each do |driver|
        task = Griffith.create_task(driver)
        tasks_lock.synchronize { tasks << task }
        spec = "#{driver.rchop(".cr")}_spec.cr"
        unit = if !specs.includes? spec
                 state_channel.send Datum.compile_only(driver)
                 CompileOnly.new(driver, task)
               else
                 Test.new(driver, spec, task)
               end

        build_channel.send(unit) rescue nil
      end

      drivers.size.times do
        done_channel.receive?
      end

      state_channel.close

      # Output report summary

      {% begin %}

      {% for status in Datum::State.constants.map(&.underscore) %}
        {{ status }} = state.select(&.{{ status }}?).map(&.value)
        puts "\n\n{{ status.gsub(/_/, " ") }}:\n * #{{{ status }}.join("\n * ")}" unless {{ status }}.empty?
      {% end %}

      result_string = "\n\n#{tested.lazy_get} drivers, #{failed.size + no_compile.size} failures, #{timeout.size} timeouts, #{compile_only.size} without spec"
      if timeout.empty? && failed.empty? && no_compile.empty?
        puts result_string.colorize.green
      else
        puts result_string.colorize.red
      end

      {% end %}
    end

    # Helpers
    ###################################################################################################

    def mark_finished(unit)
      tasks_lock.synchronize { tasks.delete(unit.task) }
      done_channel.send(nil)
    end

    def log_compilation_failure(unit, io) : Nil
      path = unit.driver.lchop("drivers/").rchop(".cr").gsub('/', '_') + ".log"
      File.open(log_directory / path, mode: "w+") do |file_io|
        IO.copy(io, file_io)
      end
    rescue
      nil
    end

    def self.with_runner_client
      HTTP::Client.new(Settings.host, Settings.port) do |client|
        yield client
      end
    end
  end
end

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

puts "running report against #{Settings.host}:#{Settings.port} (#{Settings.repo.presence ? Settings.repo + " " : "default "}repository)"

# Driver discovery

print "discovering drivers... "

response = PlaceOS::Drivers::Report.with_runner_client &.get("/build")
if !response.success?
  abort("failed to obtain driver list")
end

drivers = Array(String).from_json(response.body)
puts "found #{drivers.size}"

# Spec discovery

print "locating specs... "

response = PlaceOS::Drivers::Report.with_runner_client &.get("/test")
if !response.success?
  abort("failed to obtain spec list")
end

specs = Array(String).from_json(response.body)
puts "found #{specs.size}"

report = PlaceOS::Drivers::Report.new

Signal::INT.trap do |signal|
  report.stop
  signal.ignore
end

report.run(drivers, specs)
