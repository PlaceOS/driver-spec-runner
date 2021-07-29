require "./application"

module PlaceOS::Drivers::Api
  class Test < Application
    base "/test"

    id_param :driver

    before_action :ensure_driver_compiled, only: [:run_spec, :create]
    before_action :ensure_spec_compiled, only: [:run_spec, :create]

    @driver_path : String = ""
    @spec_path : String = ""

    PLACE_DRIVERS_DIR = "../../#{Path[Dir.current].basename}"

    # Specs available
    def index
      result = Dir.cd(repository_path) do
        Dir.glob("drivers/**/*_spec.cr")
      end
      render json: result
    end

    # grab the list of available versions of the spec file
    get "/:driver/commits", :test_commits do
      spec = URI.decode(params["driver"])
      count = (params["count"]? || 50).to_i

      commits = with_temporary_repository do |directory, repo|
        PlaceOS::Compiler::Git.commits(spec, repo, directory, count)
      end

      render json: commits
    end

    # Run the spec and return success if the exit status is 0
    def create
      debug = params["debug"]? == "true"

      io = IO::Memory.new
      exit_code = launch_spec(io, debug)
      if exit_code.zero?
        render text: io.to_s
      else
        render :not_acceptable, text: io.to_s
      end
    end

    # WS watch the output from running specs
    ws "/run_spec", :run_spec do |socket|
      debug = params["debug"]? == "true"

      # Run the spec and pipe all the IO down the websocket
      spawn { pipe_spec(socket, debug) }
    end

    def pipe_spec(socket, debug)
      output, output_writer = IO.pipe
      spawn { launch_spec(output_writer, debug) }

      # Read data coming in from the IO and send it down the websocket
      raw_data = Bytes.new(1024)
      begin
        while !output.closed?
          bytes_read = output.read(raw_data)
          break if bytes_read == 0 # IO was closed
          socket.send String.new(raw_data[0, bytes_read])
        end
      rescue IO::Error
        # Input stream closed. This should only occur on termination
      end

      # Once the process exits, close the websocket
      socket.close
    end

    GDB_SERVER_PORT = ENV["GDB_SERVER_PORT"]? || "4444"

    def launch_spec(io, debug)
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
        when timeout(5.minutes)
          process.not_nil!.signal(:kill)
          channel.receive
        end

        exit_code = status.not_nil!.exit_code
        io << "spec runner exited with #{exit_code}\n"
        io.close
        exit_code
      end
    end

    getter binary_store : PlaceOS::Build::Filesystem { Api::Build.binary_store }

    def ensure_driver_compiled
      Api::Build.build_driver
    end

    def ensure_spec_compiled
      commit = params["spec_commit"]?.presence || "HEAD"
      force_recompile = (params["force"]?.presence || params["force_recompile"].presence).try &.downcase.in?("1", "true")
      entrypoint = params["spec"]

      unless force_recompile || (existing = binary_store.query(entrypoint: entrypoint, commit: commit).first?).nil?
        path = binary_store.path(existing)
        @spec_path = path
        response.headers["Location"] = URI.encode_www_form(path)
        head :ok
        return
      end

      commit = "HEAD" if commit.nil?

      result = PlaceOS::Build::Client.client do |client|
        client.repository_path = repository_path
        client.compile(file: entrypoint, url: "local", commit: commit) do |key, io|
          binary_store.write(key, io)
        end
      end

      case result
      in PlaceOS::Build::Compilation::Success
        path = result.path
        @spec_path = path
        response.headers["Location"] = URI.encode_www_form(path)
        render :created, json: binary_store.info(PlaceOS::Build::Executable.new(path))
      in PlaceOS::Build::Compilation::NotFound
        head :not_found
      in PlaceOS::Build::Compilation::Failure
        render :not_acceptable, json: result
      end
    end
  end
end
