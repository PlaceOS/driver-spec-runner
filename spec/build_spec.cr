require "./spec_helper"

module PlaceOS::Drivers::Api
  describe Build do
    describe "GET /build" do
      it "should list drivers" do
        context = Api::Build.with_request("GET", "/build?repository=private_drivers", &.index)

        drivers = Array(String).from_json(context.response.output.to_s)
        drivers.should_not be_empty
        drivers.should contain("drivers/place/private_helper.cr")
      end
    end

    describe "POST /build" do
      it "should build a driver" do
        Api::Build
          .with_request("POST", "/build?commit=#{DRIVER_COMMIT}&repository=private_drivers&driver=drivers/place/private_helper.cr", &.create)
          .response
          .status_code.should eq(201)
      end
    end

    describe "GET /build/driver/:driver" do
      it "should list compiled versions" do
        Api::Build
          .with_request("POST", "/build?commit=#{DRIVER_COMMIT}&repository=private_drivers&driver=src/place/private_helper.cr", &.create)
          .response.status
          .success?
          .should be_true

        context = Api::Build.with_request("GET", "/build/src%2Fplace%2Fprivate_helper.cr", route_params: {"driver" => "src/place/private_helper.cr"}, &.show)

        Array(PlaceOS::Model::Executable)
          .from_json(context.response.output.to_s)
          .tap(&.should_not be_empty)
          .first
          .filename
          .should start_with "private_helper"
      end
    end

    describe "GET /build/driver/:driver/commits" do
      it "should list commits" do
        context = Api::Build.with_request("GET", "/build/src%2Fplace%2Fprivate_helper.cr/commits?repository=private_drivers", route_params: {"driver" => "src/place/private_helper.cr"}, &.commits)
        Array(PlaceOS::Compiler::Git::Commit).from_json(context.response.output.to_s).should_not be_empty
      end
    end
  end
end
