require "./spec_helper"

require "../src/report/cli"

module PlaceOS::Drivers
  describe Report do
    with_server do
      it "tests all drivers in `./drivers`" do
        io = IO::Memory.new
        Process.run("crystal", {"run", "./src/report.cr", "--", "-p 6000"}, output: io)
        output = io.to_s
        output.should contain("1 tested")
        output.should contain("0 failures")
        output.should contain("0 timeouts")
        output.should contain("0 without spec")
      end
    end
  end
end
