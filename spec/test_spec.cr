require "./spec_helper"

module PlaceOS::Drivers
  describe Api::Test do
    it "should list drivers" do
      context = with_context("GET", "/test?repository=private_drivers") do |ctx|
        Api::Test.new(ctx).index
      end

      drivers = Array(String).from_json(context.response.output.to_s)
      (drivers.size > 0).should be_true
      drivers.includes?("drivers/place/private_helper_spec.cr").should be_true
    end

    it "should build a driver" do
      _context = with_context("POST", "/test?repository=private_drivers&driver=drivers/place/private_helper.cr&spec=drivers/place/private_helper_spec.cr&force=true") do |ctx|
        instance = Api::Test.new(ctx)
        instance.ensure_driver_compiled
        instance.ensure_spec_compiled
        instance.create
      end
    end
  end
end
