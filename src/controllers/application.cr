require "action-controller"
require "placeos-models/executable"
require "file_utils"
require "uuid"

module PlaceOS::Drivers::Api
  abstract class Application < ActionController::Base
    macro inherited
      Log = ::Log.for({{ @type }})
    end

    class_getter binary_store = PlaceOS::Build::Filesystem.new

    getter binary_store : PlaceOS::Build::Filesystem { Application.binary_store }

    @driver_path : String? = nil

    # Params
    ###########################################################################

    getter? force : Bool do
      !!(params["force"]?.presence || params["force_recompile"]?.presence).presence.try(&.downcase.in?("1", "true"))
    end

    getter driver : String { params["driver"] }

    getter commit : String? { params["commit"]? }

    ###########################################################################

    getter request_id : String do
      request.headers["X-Request-ID"]? || UUID.random.to_s
    end

    # This makes it simple to match client requests with server side logs.
    # When building microservices this ID should be propagated to upstream services.
    @[AC::Route::Filter(:before_action)]
    def set_request_id
      Log.context.set(
        client_ip: client_ip,
        request_id: request_id
      )
      response.headers["X-Request-ID"] = request_id
    end

    @[AC::Route::Filter(:before_action)]
    def set_date_header
      response.headers["Date"] = HTTP.format_time(Time.utc)
    end

    getter working_directory : String = Path["./repositories"].expand.to_s

    getter repository : String do
      params["repository"]?.presence || "local"
    end

    # Builds and validates the path to the repository
    getter repository_path : String do
      Compiler::Git.repository_path(repository, working_directory)
    end

    def with_temporary_repository(&)
      temporary_working_directory = File.join(Dir.tempdir, UUID.random.to_s)
      Dir.mkdir_p(temporary_working_directory)

      # Copy the repository to the temporary working directory
      destination = File.join(temporary_working_directory, repository)
      unless Process.run("cp", {"-R", repository_path, destination}).success?
        raise "Failed to run `cp -R #{repository_path} #{destination}`"
      end

      yield(temporary_working_directory, repository)
    ensure
      temporary_working_directory.try { |d| FileUtils.rm_rf(d) rescue nil }
    end

    def compilation_response(result)
      case result
      in PlaceOS::Build::Compilation::Success
        path = result.path
        @driver_path = path
        response.headers["Location"] = URI.encode_www_form(path)
        render :created, json: binary_store.info(PlaceOS::Model::Executable.new(result.path))
      in PlaceOS::Build::Compilation::NotFound
        head :not_found
      in PlaceOS::Build::Compilation::Failure
        render :not_acceptable, json: result.error
      end
    end

    def build_driver(driver, commit, force_recompile : Bool) : PlaceOS::Build::Compilation::Result
      commit = commit.presence

      if commit.nil? || commit == "HEAD"
        commit = PlaceOS::Compiler::Git.current_repository_commit(repository, working_directory)
      end

      PlaceOS::Build::Client.client do |client|
        client.repository_path = repository_path
        client.compile(file: driver, url: "local", repository_path: Path[working_directory, repository].to_s, commit: commit, force_recompile: force_recompile) do |key, io|
          binary_store.write(key, io)
        end
      end
    end
  end
end
