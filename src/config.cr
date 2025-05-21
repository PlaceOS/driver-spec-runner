# Application dependencies
require "action-controller"
require "placeos-compiler"

# Application code
require "./controllers/application"
require "./controllers/*"

# Server required after application controllers
require "action-controller/server"

PROD = ENV["SG_ENV"]? == "production"

# Configure logging
Log.setup do |config|
  config.bind "*", :warn, ActionController.default_backend
  config.bind "action-controller.*", :info, ActionController.default_backend
end

filters = PROD ? ["bearer_token", "secret", "password"] : [] of String

# Add handlers that should run before your application
ActionController::Server.before(
  HTTP::ErrorHandler.new(PROD),
  ActionController::LogHandler.new(filters, ActionController::LogHandler::Event.all),
)

class IndexFallbackHandler
  include HTTP::Handler

  def initialize(@fallback_file : String, public_dir : String)
    @file_handler = HTTP::StaticFileHandler.new(public_dir, directory_listing: false)
  end

  def call(context) : Nil
    unless context.request.method.in?("GET", "HEAD")
      call_next(context)
      return
    end

    context.request.path = @fallback_file

    @file_handler.call(context)
  end
end

# Optional support for serving of static assests
static_file_path = ENV["PUBLIC_WWW_PATH"]? || "./www"
if File.directory?(static_file_path)
  # Optionally add additional mime types
  ::MIME.register(".yaml", "text/yaml")

  # Check for files if no paths matched in your application
  ActionController::Server.before(
    ::HTTP::StaticFileHandler.new(static_file_path, directory_listing: false)
  )

  ActionController::Server.after(
    IndexFallbackHandler.new("/index.html", static_file_path)
  )
end

# Configure session cookies
ActionController::Session.configure do |settings|
  settings.key = ENV["COOKIE_SESSION_KEY"]? || "_spider_gazelle_"
  settings.secret = ENV["COOKIE_SESSION_SECRET"]? || "4f74c0b358d5bab4000dd3c75465dc2c"
  settings.secure = PROD
end

APP_NAME = "Drivers Test Harness"
VERSION  = `shards version`
