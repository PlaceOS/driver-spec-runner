require "uuid"
require "action-controller"

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
      params["repository"]
    end

    # Builds and validates the path to the repository
    getter repository_path : String do
      Compiler::Git.repository_path(repository, working_directory)
    end
  end
end
