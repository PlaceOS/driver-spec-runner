require "action-controller"
require "file_utils"
require "uuid"

module PlaceOS::Drivers::Api
  abstract class Application < ActionController::Base
    before_action :set_request_id

    # Support request tracking
    def set_request_id
      Log.context.set(client_ip: client_ip)
      response.headers["X-Request-ID"] = Log.context.metadata[:request_id].as_s
    end

    getter working_directory : String = Path["./repositories"].expand.to_s

    getter repository : String do
      params["repository"]?.presence || "drivers"
    end

    # Builds and validates the path to the repository
    getter repository_path : String do
      Compiler::Git.repository_path(repository, working_directory)
    end

    def with_temporary_repository
      temporary_working_directory = File.join(Dir.tempdir, UUID.random.to_s)
      Dir.mkdir_p(temporary_working_directory)

      # Copy the repository to the temporary working directory
      FileUtils.cp_r(repository_path, File.join(temporary_working_directory, repository))

      yield(temporary_working_directory, repository)
    ensure
      temporary_working_directory.try { |d| FileUtils.rm_rf(d) rescue nil }
    end
  end
end
