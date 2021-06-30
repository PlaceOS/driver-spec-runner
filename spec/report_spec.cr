require "./spec_helper"

module PlaceOS::Drivers
  describe "report" do
    with_server do
      it "should have expected output" do
        io = IO::Memory.new
        Process.run("crystal", {"run", "./src/report.cr", "--", "-p 6000"}, output: io)
        output = io.to_s
        output.should contain("1 drivers")
        output.should contain("0 failures")
        output.should contain("0 timeouts")
        output.should contain("0 without spec")
      end
    end
  end
end
