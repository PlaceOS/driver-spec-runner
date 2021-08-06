require "option_parser"

require "./report/*"

OptionParser.parse(ARGV.dup) do |parser|
  parser.banner = "Usage: #{PROGRAM_NAME} [arguments] [<file>]"
  parser.on("-h HOST", "--host=HOST", "Specifies the server host") { |h| Settings.host = h }
  parser.on("-p PORT", "--port=PORT", "Specifies the server port") { |p| Settings.port = p.to_i }
  parser.on("-t TESTS", "--tests=TESTS", "Number of tests to run in parallel") { |t| Settings.tests = t.to_i }
  parser.on("--no-colour", "Removes colour from the report") { Settings.no_colour = true }
  parser.on("--basic-render", "Stop CLI rendering tricks") { Settings.standard_render = false }

  parser.unknown_args do |before_dash, after_dash|
    filenames = (before_dash + after_dash).sort!.uniq!
    Settings.passed_files = filenames
  end
end

# Disable fancy rendering in CI
Settings.standard_render = false unless ENV["CI"]?.presence.nil?

puts "running report on drivers in `./drivers` against #{Settings.host}:#{Settings.port}"

drivers, specs = { {"/build", "drivers"}, {"/test", "specs"} }.map do |path, type|
  print "discovering #{type}... "
  response = PlaceOS::Drivers::Report.with_runner_client &.get(path)
  abort("failed to obtain #{type} list") unless response.success?
  Array(String).from_json(response.body).tap { |found| puts "found #{found.size}" }
end

unless Settings.passed_files.empty?
  # Intersect passed files, including specs passed that may have drivers
  drivers = drivers & Settings.passed_files.map(&.gsub("_spec.cr", ".cr"))
end

report = PlaceOS::Drivers::Report.new

Signal::INT.trap do |signal|
  signal.ignore
  puts ">"
  report.stop
end

exit 1 unless report.run(drivers, specs)
