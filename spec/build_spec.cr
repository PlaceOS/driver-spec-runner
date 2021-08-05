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
          .with_request("POST", "/build?repository=private_drivers&driver=drivers/place/private_helper.cr", &.create)
          .response
          .status_code.should eq(201)
      end
    end

    describe "GET /build/driver/:driver" do
      it "should list compiled versions" do
        context = Api::Build.with_request("GET", "/build/drivers%2Fplace%2Fprivate_helper.cr?repository=private_drivers", &.show)

        Array(String).from_json(context.response.output.to_s).first.should start_with "drivers_place_private_helper_"
      end
    end

    describe "GET /build/driver/:driver/commits" do
      it "should list possible versions" do
        context = Api::Build.with_request("GET", "/build/drivers%2Fplace%2Fprivate_helper.cr/commits?repository=private_drivers", &.commits)
        Array(String).from_json(context.response.output.to_s).size.should eq(1)
      end
    end

    describe "DELETE /build/driver/:driver" do
      it "should delete all compiled versions of a driver" do
        Api::Build.with_request("DELETE", "/build/drivers%2Fplace%2Fprivate_helper.cr?repository=private_drivers", &.destroy)

        context = Api::Build.with_request("GET", "/build/drivers%2Fplace%2Fprivate_helper_spec.cr?repository=private_drivers", &.show)
        Array(String).from_json(context.response.output.to_s).should be_empty
      end
    end
  end
end
