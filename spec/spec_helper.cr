require "action-controller/spec_helper"
require "spec"

# Your application config
# If you have a testing environment, replace this with a test config file
require "../src/config"

# Helper methods for testing controllers (curl, with_server, context)
# require "../lib/action-controller/spec/curl_context"

require "placeos-compiler"

module PlaceOS::Api::SpecClient
  # Can't use ivars at top level, hence this hack
  private CLIENT = ActionController::SpecHelper.client

  def client
    CLIENT
  end
end

include PlaceOS::Api::SpecClient

abstract class ActionController::Base
  macro inherited
    macro finished
      {% begin %}
      def self.base_route
        NAMESPACE[0]
      end
      {% end %}
    end
  end
end

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

::CURL_CONTEXT__ = [] of ActionController::Server

macro with_server(&block)
  if ::CURL_CONTEXT__.empty?
    %app = ActionController::Server.new
    ::CURL_CONTEXT__ << %app
    %channel = Channel(Nil).new(1)

    Spec.before_each do
      %app.reload
      %app.socket.bind_tcp("127.0.0.1", 6000, true)
      begin
        File.delete("/tmp/spider-socket.sock")
      rescue
      end
      %app.socket.bind_unix "/tmp/spider-socket.sock"
      spawn do
        %channel.send(nil)
        %app.run
      end
      %channel.receive
    end

    Spec.after_each do
      %app.close
    end
  end

  %app = ::CURL_CONTEXT__[0]

  {% if block.args.size > 0 %}
    {{block.args[0].id}} = %app
  {% end %}

  {{block.body}}
end
