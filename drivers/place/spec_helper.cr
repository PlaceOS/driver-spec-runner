require "placeos-driver"

class SpecHelper < PlaceOS::Driver
  def implemented_in_driver
    "woot!"
  end
end
