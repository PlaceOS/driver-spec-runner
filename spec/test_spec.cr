require "./spec_helper"

module PlaceOS::Drivers
  describe Api::Test do
    describe "GET /test" do
      it "should list drivers" do
        context = Api::Test.with_request("GET", "/test?repository=private_drivers", &.index)
        drivers = Array(String).from_json(context.response.output.to_s)
        drivers.should_not be_empty
        drivers.should contain("drivers/place/private_helper_spec.cr")
      end
    end

    describe "POST /test" do
      it "should build a driver" do
        Api::Test.with_request("POST", "/test?repository=private_drivers&driver=drivers/place/private_helper.cr&spec=drivers/place/private_helper_spec.cr&force=true") do |api|
          api.ensure_driver_compiled
          api.ensure_spec_compiled
          api.create
        end
      end
    end
  end
end
