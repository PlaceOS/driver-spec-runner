require "action-controller"
require "file_utils"
require "uuid"

module PlaceOS::Drivers::Api
  abstract class Application < ActionController::Base
    before_action :set_request_id

    class_getter binary_store = PlaceOS::Build::Filesystem.new
    getter binary_store : PlaceOS::Build::Filesystem { Application.binary_store }
    getter driver_path : String = ""

    # Support request tracking
    def set_request_id
      Log.context.set(client_ip: client_ip)
      response.headers["X-Request-ID"] = Log.context.metadata[:request_id].as_s
    end

    getter working_directory : String = Path["./repositories"].expand.to_s

    getter repository : String do
      params["repository"]?.presence || "local"
    end

    # Builds and validates the path to the repository
    getter repository_path : String do
      Compiler::Git.repository_path(repository, working_directory)
    end

    def with_temporary_repository
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
        render :created, json: binary_store.info(PlaceOS::Build::Executable.new(result.path))
      in PlaceOS::Build::Compilation::NotFound
        head :not_found
      in PlaceOS::Build::Compilation::Failure
        render :not_acceptable, json: result
      end
    end

    def build_driver(driver, commit, force_recompile) : PlaceOS::Build::Compilation::Result
      commit = commit.presence
      force_recompile = force_recompile.presence.try &.downcase.in?("1", "true")

      unless force_recompile || (existing = binary_store.query(entrypoint: driver, commit: commit).first?).nil?
        path = binary_store.path(existing)
        return PlaceOS::Build::Compilation::Success.new(path, File.info(binary_store.path(existing)).modification_time)
      end

      # TODO: deprecate?
      commit = "HEAD" if commit.nil?

      PlaceOS::Build::Client.client do |client|
        client.repository_path = repository_path
        client.compile(file: driver, url: "local", commit: commit) do |key, io|
          binary_store.write(key, io)
        end
      end
    end
  end
end
