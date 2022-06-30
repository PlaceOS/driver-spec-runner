require "./application"

module PlaceOS::Drivers::Api
  class Test < Application
    base "/test"

    id_param :driver

    @driver_path : String = ""
    @spec_path : String = ""

    PLACE_DRIVERS_DIR = "../../#{Path[Dir.current].basename}"

    getter? force : Bool do
      !!(params["force"]?.presence || params["force_recompile"]?.presence).presence.try(&.downcase.in?("1", "true"))
    end

    getter? debug : Bool do
      !!params["debug"]?.presence.try(&.downcase.in?("1", "true"))
    end

    getter count : Int32 { params["count"]?.presence.try &.to_i? || 50 }

    getter driver : String { params["driver"] }

    getter commit : String? { params["commit"]? }

    getter spec : String { params["spec"] }

    getter spec_commit : String? { params["spec_commit"]? }

    # Specs available
    def index
      result = Dir.cd(repository_path) do
        Dir.glob("drivers/**/*_spec.cr")
      end
      render json: result
    end

    # grab the list of available versions of the spec file
    get "/:driver/commits", :test_commits do
      spec = route_params["driver"]

      commits = with_temporary_repository do |directory, repo|
        PlaceOS::Compiler::Git.commits(spec, repo, directory, count)
      end

      render json: commits
    end

    # Run the spec and return success if the exit status is 0
    def create
      driver_result = build_driver(driver, commit, force?)
      return compilation_response(driver_result) unless driver_result.is_a? PlaceOS::Build::Compilation::Success
      @driver_path = binary_store.path(driver_result.executable)

      spec_result = build_driver(spec, spec_commit, force?)
      return compilation_response(spec_result) unless spec_result.is_a? PlaceOS::Build::Compilation::Success
      @spec_path = binary_store.path(spec_result.executable)

      io = IO::Memory.new
      exit_code = launch_spec(io, debug?)
      if exit_code.zero?
        render text: io.to_s
      else
        render :not_acceptable, text: io.to_s
      end
    end

    struct CompilationResponse
      include JSON::Serializable

      getter status : String

      @[JSON::Field(converter: String::RawConverter)]
      getter output : String?

      def initialize(@status, @output)
      end

      def self.from_result(result)
        output = case result
                 in PlaceOS::Build::Compilation::Success
                   binary_store.info(PlaceOS::Build::Executable.new(result.path))
                 in PlaceOS::Build::Compilation::NotFound
                   nil
                 in PlaceOS::Build::Compilation::Failure
                   result.error
                 end

        new(
          status: result.class.name.split("::").last.underscore,
          output: output
        )
      end
    end

    # WS watch the output from running specs
    ws "/run_spec", :run_spec do |socket|
      # Run the spec and pipe all the IO down the websocket
      spawn do
        driver_result = build_driver(driver, commit, force?)

        socket.send(CompilationResponse.from_result(driver_result).to_json)
        unless driver_result.is_a?(PlaceOS::Build::Compilation::Success)
          socket.close
          next
        end

        @driver_path = binary_store.path(driver_result.executable)

        socket.send(CompilationResponse.from_result(spec_result).to_json)
        unless spec_result.is_a?(PlaceOS::Build::Compilation::Success)
          socket.close
          next
        end

        @spec_path = binary_store.path(spec_result.executable)

        pipe_spec(socket, debug?)
      end
    end

    def pipe_spec(socket, debug)
      output, output_writer = IO.pipe
      finished_channel = Channel(Nil).new(capacity: 1)

      socket.on_close do
        finished_channel.close unless finished_channel.closed?
      end

      spawn do
        launch_spec(output_writer, debug, finished_channel)
        finished_channel.close unless finished_channel.closed?
      end

      spawn do
        # Read data coming in from the IO and send it down the websocket
        raw_data = Bytes.new(1024)
        begin
          until output.closed? || finished_channel.closed?
            bytes_read = output.read(raw_data)
            break if bytes_read == 0 # IO was closed
            socket.send String.new(raw_data[0, bytes_read])
          end
        rescue IO::Error
          # Input stream closed. This should only occur on termination
        end
      end

      finished_channel.receive?

      # Yield and wait for all remaining IO to drain
      sleep 150.milliseconds
      output.close

      # Once the process exits, close the websocket
      socket.close unless socket.closed?
    end

    GDB_SERVER_PORT = ENV["GDB_SERVER_PORT"]? || "4444"

    def launch_spec(io, debug, closed_channel = Channel(Nil).new(capacity: 1))
      memory = IO::Memory.new
      io = IO::MultiWriter.new(io, memory)
      io << "\nLaunching spec runner\n"
      if debug
        exit_code = Process.run(
          "gdbserver",
          {"0.0.0.0:#{GDB_SERVER_PORT}", @spec_path},
          {"SPEC_RUN_DRIVER" => @driver_path},
          input: Process::Redirect::Close,
          output: io,
          error: io
        ).exit_code
        io << "spec runner exited with #{exit_code}\n"
        io.close
        exit_code
      else
        channel = Channel(Nil).new
        process = nil
        status = nil

        spawn(same_thread: true) do
          Process.run(
            @spec_path,
            nil,
            {"SPEC_RUN_DRIVER" => @driver_path},
            input: Process::Redirect::Close,
            output: io,
            error: io
          ) do |ref|
            process = ref
            nil
          end
          status = $?
          channel.send(nil)
        end

        select
        when channel.receive
        when closed_channel.receive?
          process.not_nil!.signal(:kill)
          channel.receive
        when timeout(5.minutes)
          process.not_nil!.signal(:kill)
          channel.receive
        end

        exit_code = status.not_nil!.exit_code
        io << "spec runner exited with #{exit_code}\n"
        Log.error { memory.to_s } unless exit_code.zero?

        io.close
        exit_code
      end
    end
  end
end
