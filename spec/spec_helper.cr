require "spec"

# Your application config
# If you have a testing environment, replace this with a test config file
require "../src/config"

# Helper methods for testing controllers (curl, with_server, context)
require "../lib/action-controller/spec/curl_context"

require "placeos-compiler"

class MockServer
  include ActionController::Router

  def initialize
    init_routes
  end

  private def init_routes
    {% for klass in ActionController::Base::CONCRETE_CONTROLLERS %}
      {{klass}}.__init_routes__(self)
    {% end %}
  end
end

abstract class PlaceOS::Drivers::Api::Application < ActionController::Base
  def self.with_request(verb, path, expect_failure = false)
    io = IO::Memory.new
    context = context(verb.upcase, path)
    MOCK_SERVER.route_handler.search_route(verb, path, "#{verb}#{path}", context)
    context.response.output = io

    yield new(context)

    context.response.status.success?.should(expect_failure ? be_false : be_true)
    context
  end
end

MOCK_SERVER = MockServer.new

DRIVER_COMMIT = "265518b"
SPEC_COMMIT   = "d1b51ac"

Spec.before_suite do
  ::Log.setup("*", :debug, ActionController.default_backend)
  # Clone the private drivers
  PlaceOS::Compiler.clone_and_install(
    "private_drivers",
    "https://github.com/placeos/private-drivers"
  )
end
