require "./application"

require "placeos-build/driver_store/filesystem"
require "placeos-build/client"

module PlaceOS::Drivers::Api
  class Build < Application
    base "/build"

    # List the available files
    @[AC::Route::GET("/")]
    def index
      compiled = params["compiled"]?
      result = PlaceOS::Build::Client.client do |client|
        if compiled
          client.query.map(&.filename)
        else
          client.repository_path = repository_path
          client.discover_drivers("local")
        end
      end
      render json: result
    end

    @[AC::Route::GET("/:driver")]
    def show
      entrypoint = route_params["driver"]
      render json: PlaceOS::Build::Client.client(&.query(file: entrypoint))
    end

    # Build a drvier, optionally based on the version specified
    #
    @[AC::Route::POST("/")]
    def create
      result = build_driver(driver, commit, force?)
      compilation_response(result)
    end

    # grab the list of available repositories
    get "/repositories", :list_repositories do
      render json: PlaceOS::Compiler.repositories
    end

    # grab the list of available versions of file / which are built
    get "/:driver/commits", :commits do
      driver_source = route_params["driver"]
      count = (params["count"]? || 50).to_i
      commits = with_temporary_repository do |directory, repo|
        PlaceOS::Compiler::Git.commits(
          file_name: driver_source,
          repository: repo,
          working_directory: directory,
          count: count,
        )
      end

      render json: commits
    end

    # Commits at repo level
    get "/repository_commits", :repository_commits do
      count = (params["count"]? || 50).to_i
      commits = with_temporary_repository do |directory, repo|
        PlaceOS::Compiler::Git.repository_commits(repo, directory, count)
      end

      render json: commits
    end
  end
end
