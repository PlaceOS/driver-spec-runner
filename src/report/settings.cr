module Settings
  class_property host = "localhost"
  class_property passed_files = [] of String
  class_property port = 8080
  class_property tests = 10
  class_property builds = 1
  class_property? no_colour = false
  class_property? output_errors = false
  class_property? standard_render = true
end
