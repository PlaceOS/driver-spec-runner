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
  class_property? no_colour = false
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
      unit.task.done(yellow "compiling")
      response = self.class.with_runner_client do |client|
        client.read_timeout = 6.minutes
        begin
          client.post("/build?driver=#{unit.driver}")
        rescue IO::TimeoutError
          unit.task.fail(red "timeout")
          state_channel.send Datum.timeout(unit.driver)
          nil
        end
      end

      if response
        if response.success?
          unit.task.done(green "builds")
          if unit.is_a?(Test)
            test_channel.send(unit)
            return
          end
        else
          spawn { log_compilation_failure(unit, response.body) }
          unit.task.fail(red "failed to compile!")
          state_channel.send Datum.no_compile(unit.driver)
        end
      end

      mark_finished(unit)
    end

    def test(unit)
      unit.task.done(yellow "testing")
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
            unit.task.done(green "done")
          else
            state_channel.send Datum.failed(unit.driver)
            unit.task.fail(red "failed")
          end
        rescue IO::TimeoutError
          unit.task.fail(red "timeout")
          state_channel.send Datum.timeout(unit.driver)
        end
      end

      mark_finished(unit)
    end

    def run(drivers : Array(String), specs : Array(String)) : Bool
      # Collect statistics
      spawn do
        while result = state_channel.receive?
          state << result
        end
      end

      # Build the drivers
      spawn do
        while unit = build_channel.receive?
          build(unit)
        end
      end

      # Test the drivers
      spawn do
        while unit = test_channel.receive?
          test(unit)
        end
      end

      Fiber.yield

      # Feed units through pipeline in batches
      spawn do
        drivers.in_groups_of(6).each do |group|
          units = group.compact.map do |driver|
            task = Griffith.create_task(driver)
            task.done(blue "waiting...")
            tasks_lock.synchronize { tasks << task }
            spec = "#{driver.rchop(".cr")}_spec.cr"
            if specs.includes? spec
              Test.new(driver, spec, task)
            else
              state_channel.send Datum.compile_only(driver)
              CompileOnly.new(driver, task)
            end
          end

          units.each { |unit| build_channel.send(unit) rescue nil }
        end
      end

      Fiber.yield

      drivers.size.times do |i|
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


      (timeout.empty? && failed.empty? && no_compile.empty?).tap do |passed|
        puts passed ? green result_string : red result_string
      end
      {% end %}
    end

    # Helpers
    ###################################################################################################

    {% for colour in {:red, :yellow, :green, :blue} %}
      def {{ colour.id }}(string)
        Settings.no_colour? ? string : string.colorize.{{ colour.id }}.to_s
      end
    {% end %}

    def mark_finished(unit)
      tasks_lock.synchronize { tasks.delete(unit.task) }
      done_channel.send(nil)
    end

    def log_compilation_failure(unit, output) : Nil
      path = unit.driver.lchop("drivers/").rchop(".cr").gsub('/', '_') + ".log"
      File.open(log_directory / path, mode: "w+") do |file_io|
        file_io << output
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
  class_property passed_files = [] of String
end

OptionParser.parse(ARGV.dup) do |parser|
  parser.banner = "Usage: #{PROGRAM_NAME} [arguments] [<file>]"
  parser.on("-h HOST", "--host=HOST", "Specifies the server host") { |h| Settings.host = h }
  parser.on("-p PORT", "--port=PORT", "Specifies the server port") { |p| Settings.port = p.to_i }
  parser.on("--no-colour", "Removes colour from the report") { Settings.no_colour = true }

  parser.unknown_args do |before_dash, after_dash|
    filenames = (before_dash + after_dash).sort!.uniq!
    Settings.passed_files = filenames
  end
end

puts "running report on drivers in `./drivers` against #{Settings.host}:#{Settings.port}"

# Driver discovery
print "discovering drivers... "
response = PlaceOS::Drivers::Report.with_runner_client &.get("/build")
abort("failed to obtain drivers list") unless response.success?

found_drivers = Array(String).from_json(response.body)
puts "found #{found_drivers.size}"

# Spec discovery
print "discovering specs... "
response = PlaceOS::Drivers::Report.with_runner_client &.get("/test")
abort("failed to obtain specs list") unless response.success?

specs = Array(String).from_json(response.body)
puts "found #{specs.size}"

drivers = if Settings.passed_files.empty?
            found_drivers
          else
            # Find specs passed that may have drivers
            potential_drivers = Settings.passed_files.map &.gsub("_spec.cr", ".cr")
            found_drivers.select do |driver|
              driver.in?(potential_drivers) || driver.in?(Settings.passed_files)
            end
          end

report = PlaceOS::Drivers::Report.new

Signal::INT.trap do |signal|
  signal.ignore
  puts ">"
  report.stop
end

exit 1 unless report.run(drivers, specs)
