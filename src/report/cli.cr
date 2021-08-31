require "colorize"
require "griffith"
require "http"
require "json"
require "uri"

require "./settings"

module Griffith
  class ConsoleReporter
    private def write(text, line_number)
      if Settings.standard_render?
        previous_def
      else
        @mutex.synchronize do
          @io.puts text
          @io.flush
        end
      end
    end
  end
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
        Tested
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
    getter build_channel : Channel(Build) = Channel(Build).new(Settings.builds)
    getter test_channel : Channel(Test) = Channel(Test).new(Settings.tests)

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
      state_channel.send Datum.tested(unit.driver)

      params = URI::Params{
        "driver" => unit.driver,
        "spec"   => unit.spec,
        "force"  => "true",
      }

      uri = URI.new(path: "/test", query: params)

      response = self.class.with_runner_client do |client|
        client.read_timeout = 6.minutes
        begin
          client.post(uri.to_s)
        rescue IO::TimeoutError
          unit.task.fail(red "timeout")
          state_channel.send Datum.timeout(unit.driver)
          nil
        end
      end

      if response
        if response.success?
          unit.task.done(green "passed")
        else
          spawn { log_compilation_failure(unit, response.body) }
          unit.task.fail(red "failed")
          state_channel.send Datum.failed(unit.driver)
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
      Settings.tests.times do
        spawn do
          while unit = test_channel.receive?
            test(unit)
          end
        end
      end

      Fiber.yield

      # Feed units through pipeline in batches
      spawn do
        drivers.in_groups_of(Settings.builds).each do |group|
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
        {% unless status == "tested" %}
        puts "\n\n{{ status.gsub(/_/, " ") }}:\n * #{{{ status }}.join("\n * ")}" unless {{ status }}.empty?
        {% end %}
      {% end %}

      result_string = "\n\n#{tested.size} tested, #{failed.size + no_compile.size} failures, #{timeout.size} timeouts, #{compile_only.size} without spec"

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
