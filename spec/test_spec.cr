require "./spec_helper"

module PlaceOS::Drivers
  describe Api::Test do
    describe "GET /test" do
      it "should list driver specs" do
        resp = client.get(Api::Test.base_route + "?repository=private_drivers")
        resp.status.success?.should be_true
        drivers = Array(String).from_json(resp.body)
        drivers.should_not be_empty
        drivers.should contain("drivers/place/private_helper_spec.cr")
      end
    end

    describe "POST /test" do
      it "should build and test a driver" do
        params = HTTP::Params.encode({"spec_commit" => SPEC_COMMIT, "commit" => DRIVER_COMMIT, "repository" => "private_drivers", "driver" => "drivers/place/private_helper.cr", "spec" => "drivers/place/private_helper_spec.cr", "enforce" => "true"})
        resp = client.post(Api::Test.base_route + "?#{params}")
        resp.status
          .success?
          .should be_true
      end
    end
  end
end
