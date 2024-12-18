require "./spec_helper"
require "file_utils"

module PlaceOS::Drivers
  describe Compiler do
    describe "POST /build" do
      it "should compile a private driver using the build API" do
        PlaceOS::Compiler.clone_and_install("private_drivers", "https://github.com/placeos/private-drivers.git")
        File.file?(File.expand_path("./repositories/private_drivers/drivers/place/private_helper.cr")).should be_true

        params = HTTP::Params.encode({"repository" => "private_drivers", "driver" => "drivers/place/private_helper.cr"})
        resp = client.post(Api::Build.base_route + "?#{params}")
        resp.status_code.should eq(201)
      end
    end
  end
end
