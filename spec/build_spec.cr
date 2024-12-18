require "./spec_helper"

module PlaceOS::Drivers::Api
  describe Build do
    describe "GET /build" do
      it "should list drivers" do
        resp = client.get(Build.base_route + "?repository=private_drivers")
        drivers = Array(String).from_json(resp.body)
        drivers.should_not be_empty
        drivers.should contain("drivers/place/private_helper.cr")
      end
    end

    describe "POST /build" do
      it "should build a driver" do
        params = HTTP::Params.encode({"commit" => DRIVER_COMMIT, "repository" => "private_drivers", "driver" => "drivers/place/private_helper.cr"})
        resp = client.post(Build.base_route + "?#{params}")
        resp.status_code.should eq(201)
      end
    end

    describe "GET /build/driver/:driver" do
      it "should list compiled versions" do
        params = HTTP::Params.encode({"commit" => DRIVER_COMMIT, "repository" => "private_drivers", "driver" => "drivers/place/private_helper.cr"})
        resp = client.post(Build.base_route + "?#{params}")
        resp.status
          .success?
          .should be_true

        params = HTTP::Params.encode({"driver" => "drivers/place/private_helper.cr"})
        resp = client.get(Build.base_route + "/#{params}")
        Array(PlaceOS::Model::Executable)
          .from_json(resp.body)
          .tap(&.should_not be_empty)
          .first
          .filename
          .should start_with "private_helper"
      end
    end

    describe "GET /build/driver/:driver/commits" do
      it "should list commits" do
        resp = client.get(Build.base_route + "/src%2Fplace%2Fprivate_helper.cr/commits?repository=private_drivers")
        resp.status
          .success?
          .should be_true
        Array(PlaceOS::Compiler::Git::Commit).from_json(resp.body).should_not be_empty
      end
    end
  end
end
