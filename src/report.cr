require "colorize"
require "http"
require "json"
require "option_parser"
require "uri"

module Settings
  class_property host = "localhost"
  class_property port = 8080
  class_property repo = ""
  class_property? no_colour = false
end

OptionParser.parse(ARGV.dup) do |parser|
  parser.banner = "Usage: #{PROGRAM_NAME} [arguments]"

  parser.on("-h HOST", "--host=HOST", "Specifies the server host") { |h| Settings.host = h }
  parser.on("-p PORT", "--port=PORT", "Specifies the server port") { |p| Settings.port = p.to_i }
  parser.on("-r REPO", "--repo=REPO", "Specifies the repository to report on") { |r| Settings.repo = r }
  parser.on("--no-colour", "Removes colour from the report") { Settings.no_colour = true }
end

puts "running report against #{Settings.host}:#{Settings.port} (#{Settings.repo.presence ? "default" : Settings.repo} repository)"

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

compile_only = [] of String
failed = [] of String
no_compile = [] of String
timeout = [] of String

tested = 0
success = 0

# Detect ctrl-c, complete current work and output report early
###################################################################################################

skip_remaining = false
Signal::INT.trap do |signal|
  skip_remaining = true
  signal.ignore
end

drivers.each do |driver|
  break if skip_remaining

  spec = "#{driver.rchop(".cr")}_spec.cr"
  if !specs.includes? spec
    compile_only << driver
    next
  end

  tested += 1
  print "testing #{driver}... "

  params = URI::Params.new({
    "driver" => [driver],
    "spec"   => [spec],
    "force"  => ["true"],
  })
  params["repository"] = Settings.repo unless Settings.repo.blank?
  uri = URI.new(path: "/test", query: params)

  with_runner_client do |client|
    client.read_timeout = 6.minutes
    begin
      response = client.post(uri.to_s)
      if response.success?
        success += 1
        puts green("passed")
      else
        # A spec not passing isn't as critical as a driver not compiling
        if build?(driver, client)
          puts red("failed")
          failed << driver
        else
          no_compile << driver
        end
      end
    rescue IO::TimeoutError
      puts red("failed with timeout")
      timeout << driver
    end
  end
end

compile_only.each do |driver|
  break if skip_remaining

  print "compile #{driver}... "
  with_runner_client do |client|
    client.read_timeout = 6.minutes
    begin
      if build?(driver, client)
        success += 1
        puts green("builds")
      else
        no_compile << driver
      end
    rescue IO::TimeoutError
      puts red("failed with timeout")
      timeout << driver
    end
  end
end

# Output report
###################################################################################################

puts "\n\nspec failures:\n * #{failed.join("\n * ")}" if !failed.empty?
puts "\n\nspec timeouts:\n * #{timeout.join("\n * ")}" if !timeout.empty?
puts "\n\nfailed to compile:\n * #{no_compile.join("\n * ")}" if !no_compile.empty?
puts "\n\n* #{tested} tested"
puts "* #{failed.size + no_compile.size} failures"
puts "* #{timeout.size} timeouts"
puts "* #{compile_only.size} without spec"

# Helpers
###################################################################################################

def with_runner_client
  HTTP::Client.new(Settings.host, Settings.port) do |client|
    yield client
  end
end

def build?(driver : String, client)
  response = client.post("/build?driver=#{driver}")
  response.success?.tap do |built|
    unless built
      puts red("failed to compile!")
      puts "\n#{response.body}\n"
    end
  end
end

def red(string)
  Settings.no_colour? ? string : string.colorize.red
end

def green(string)
  Settings.no_colour? ? string : string.colorize.green
end
