require "./spec_helper"

module PlaceOS::Drivers::Api
  describe Test do
    with_server do
      it "should list drivers" do
        result = curl("GET", "/test?repository=private_drivers")
        drivers = Array(String).from_json(result.body)
        (drivers.size > 0).should be_true
        drivers.includes?("drivers/place/private_helper_spec.cr").should be_true
      end

      it "should build a driver" do
        result = curl("POST", "/test?repository=private_drivers&driver=drivers/place/private_helper.cr&spec=drivers/place/private_helper_spec.cr&force=true")
        result.status_code.should eq(200)
      end

      it "should have expected output using private_drivers repo" do
        io = IO::Memory.new
        Process.run("crystal", {"run", "./src/report.cr", "-p", "6000"}, output: io)
        output = io.to_s
        output.should contain("1 drivers")
        output.should contain("0 failures")
        output.should contain("0 without spec")
      end
    end
  end
end
