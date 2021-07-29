require "spec"

# Your application config
# If you have a testing environment, replace this with a test config file
require "../src/config"

# Helper methods for testing controllers (curl, with_server, context)
require "../lib/action-controller/spec/curl_context"

require "placeos-compiler"

abstract class PlaceOS::Drivers::Api::Application < ActionController::Base
  def self.with_request(verb, path, json_headers = nil, expect_failure : Bool = false)
    io = IO::Memory.new
    ctx = context(verb, path, json_headers)
    ctx.response.output = io
    yield new(ctx)
    ctx.response.status.success?.should (expect_failure ? be_false : be_true)
    ctx
  end
end

Spec.before_suite do
  ::Log.setup("*", :debug, ActionController.default_backend)
  # Clone the private drivers
  PlaceOS::Compiler.clone_and_install(
    "private_drivers",
    "https://github.com/placeos/private-drivers"
  )
end
