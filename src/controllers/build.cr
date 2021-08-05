require "./application"

require "placeos-build/driver_store/filesystem"
require "placeos-build/client"

module PlaceOS::Drivers::Api
  class Build < Application
    base "/build"

    id_param :driver

    # Build a drvier, optionally based on the version specified
    #
    def create
      Api::Build.build_driver
    end

    # Delete a built driver
    #
    def destroy
      entrypoint = URI.decode(route_params["driver"])
      commit = params["commit"]?.presence

      binary_store.query(entrypoint: entrypoint, commit: commit).each do |e|
        File.delete binary_store.path(e) rescue nil
      end

      head :ok
    end

    # list the available files
    def index
      compiled = params["compiled"]?
      if compiled
        render json: PlaceOS::Build::Client.client &.query.map(&.filename)
      else
        result = Dir.cd(repository_path) do
          Dir.glob("drivers/**/*.cr").reject! do |path|
            path.ends_with?("_spec.cr") || !File.read_lines(path).any? &.includes?("< PlaceOS::Driver")
          end
        end

        render json: result
      end
    end

    def show
      entrypoint = URI.decode(params["driver"])
      render json: binary_store.query(entrypoint: entrypoint)
    end

    # grab the list of available repositories
    get "/repositories", :list_repositories do
      render json: PlaceOS::Compiler.repositories
    end

    # grab the list of available versions of file / which are built
    get "/:driver/commits", :commits do
      driver_source = URI.decode(params["driver"])
      count = (params["count"]? || 50).to_i
      commits = with_temporary_repository do |directory, repo|
        PlaceOS::Compiler::Git.commits(driver_source, repo, directory, count)
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

    ################################################################################################

    class_getter binary_store = PlaceOS::Build::Filesystem.new
    getter binary_store : PlaceOS::Build::Filesystem { Api::Build.binary_store }
    getter driver_path : String = ""

    macro build_driver
      commit = params["commit"]?.presence
      entrypoint = params["driver"]
      force_recompile = params["force_recompile"]?.presence.try &.downcase.in?("1", "true")

      unless force_recompile || (existing = binary_store.query(entrypoint: entrypoint, commit: commit).first?).nil?
        path = binary_store.path(existing)
        @driver_path = path
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
        @driver_path = path
        response.headers["Location"] = URI.encode_www_form(path)
        render :created, json: binary_store.info(PlaceOS::Build::Executable.new(result.path))
      in PlaceOS::Build::Compilation::NotFound
        head :not_found
      in PlaceOS::Build::Compilation::Failure
        render :not_acceptable, json: result
      end
    end
  end
end
