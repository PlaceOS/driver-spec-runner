require "./application"

module PlaceOS::Drivers::Api
  class Test < Application
    base "/test"

    id_param :driver

    @driver_path : String? = nil
    @spec_path : String? = nil

    PLACE_DRIVERS_DIR = "../../#{Path[Dir.current].basename}"

    getter? debug : Bool do
      !!params["debug"]?.presence.try(&.downcase.in?("1", "true"))
    end

    getter count : Int32 { params["count"]?.presence.try &.to_i? || 50 }

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
      @driver_path, @spec_path = {
        {driver, commit},
        {spec, spec_commit},
      }.map do |file, file_commit|
        result = build_driver(file, file_commit, force?)
        return compilation_response(result) unless result.is_a? PlaceOS::Build::Compilation::Success
        binary_store.path(result.executable)
      end

      io = IO::Memory.new
      exit_code = launch_spec(io, debug?)
      if exit_code.zero?
        render text: io.to_s
      else
        render :not_acceptable, text: io.to_s
      end
    end

    struct TestMessage
      include JSON::Serializable

      getter type : String

      @[JSON::Field(converter: String::RawConverter)]
      getter output : String?

      def initialize(@type, @output)
      end

      def self.from_result(result, binary_store, is_spec : Bool)
        output = case result
                 in PlaceOS::Build::Compilation::Failure  then result.to_json
                 in PlaceOS::Build::Compilation::NotFound then nil
                 in PlaceOS::Build::Compilation::Success
                   if is_spec
                     {path: result.path}.to_json
                   else
                     binary_store.info(PlaceOS::Model::Executable.new(result.path)).to_json
                   end
                 end

        new(
          type: result.class.name.split("::").last.underscore,
          output: output
        )
      end
    end

    # WS watch the output from running specs
    ws "/run_spec", :run_spec do |socket|
      # Run the spec and pipe all the IO down the websocket
      spawn { run_ws_spec(socket) }
    end

    protected def run_ws_spec(socket)
      paths = {
        {driver, commit, false},
        {spec, spec_commit, true},
      }.map do |file, file_commit, is_spec|
        result = build_driver(file, file_commit, force?)
        socket.send(TestMessage.from_result(result, binary_store, is_spec).to_json)
        break unless result.is_a?(PlaceOS::Build::Compilation::Success)

        binary_store.path(result.executable)
      end

      if paths.nil? || (@driver_path = paths.first).nil? || (@spec_path = paths.last).nil?
        # Close socket and early exit from the fiber
        socket.close
        return
      end

      output, output_writer = IO.pipe
      finished_channel = Channel(Nil).new(capacity: 1)

      socket.on_close do
        finished_channel.close unless finished_channel.closed?
      end

      spawn do
        launch_spec(output_writer, debug?, finished_channel)
        finished_channel.close unless finished_channel.closed?
      end

      spawn do
        # Read data coming in from the IO and send it down the websocket
        raw_data = Bytes.new(1024)
        begin
          while bytes_read = output.read(raw_data)
            break if bytes_read == 0 # IO was closed
            socket.send(TestMessage.new(
              type: "test_output",
              output: String.new(raw_data[0, bytes_read].dup).to_json
            ).to_json)
          end
        rescue IO::Error
          # Input stream closed. This should only occur on termination
        rescue error
          Log.warn { "Error processing #{error.inspect_with_backtrace}" }
        end
      end

      finished_channel.receive?

      # Yield and wait for all remaining IO to drain
      sleep 150.milliseconds
      output.close
    rescue error
      Log.warn { "unexpected error running spec: #{error.inspect_with_backtrace}" }
    ensure
      # Once the process exits, close the websocket
      socket.close unless socket.closed?
    end

    GDB_SERVER_PORT = ENV["GDB_SERVER_PORT"]? || "4444"

    def launch_spec(io, debug, closed_channel = Channel(Nil).new(capacity: 1))
      memory = IO::Memory.new
      io = IO::MultiWriter.new(io, memory)
      io << "\nLaunching spec runner\n"

      unless (spec_path = @spec_path) && (driver_path = @driver_path)
        io.puts "The driver and/or spec paths were not defined"
        return 1
      end

      if debug
        exit_code = Process.run(
          "gdbserver",
          {"0.0.0.0:#{GDB_SERVER_PORT}", spec_path},
          env: {"SPEC_RUN_DRIVER" => driver_path},
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
            spec_path,
            nil,
            env: {"SPEC_RUN_DRIVER" => driver_path},
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
