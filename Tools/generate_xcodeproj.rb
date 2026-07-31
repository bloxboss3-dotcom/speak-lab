#!/usr/bin/env ruby
# frozen_string_literal: true

# Generates ios/SpeakLab.xcodeproj from the source tree.
#
# The generated project is committed, so day to day you just open it. Re-run
# this after adding, moving or deleting source files:
#
#   gem install xcodeproj      # once
#   ruby Tools/generate_xcodeproj.rb
#
# Using a generator rather than hand-editing project.pbxproj means the file
# stays deterministic and merge conflicts in it are never worth resolving by
# hand — regenerate instead.

require 'xcodeproj'
require 'fileutils'

ROOT          = File.expand_path('..', __dir__)
IOS_DIR       = File.join(ROOT, 'ios')
APP_NAME      = 'SpeakLab'
APP_SOURCES   = File.join(IOS_DIR, APP_NAME)
TEST_SOURCES  = File.join(ROOT, 'Tests', 'SpeakLabCoreTests')
PROJECT_PATH  = File.join(IOS_DIR, "#{APP_NAME}.xcodeproj")
DEPLOYMENT    = '17.0'

# Deliberately not Swift 6: the UI layer is written for Swift 5 language mode,
# and flipping the whole app to Swift 6 strict concurrency is a separate piece
# of work rather than a side effect of generating a project.
SWIFT_VERSION = '5.0'

FileUtils.rm_rf(PROJECT_PATH)

# objectVersion 56 is the Xcode 14+ format. The gem's default is much older and
# makes Xcode offer to "upgrade" the project on first open.
project = Xcodeproj::Project.new(PROJECT_PATH, false, 56)
project.root_object.compatibility_version = 'Xcode 14.0'

# ---------------------------------------------------------------- file groups

# Mirrors a directory into project groups so the navigator matches the disk.
def add_directory(project, group, dir, swift_files, resource_files)
  Dir.children(dir).sort.each do |entry|
    path = File.join(dir, entry)

    if File.directory?(path)
      # Asset catalogues are a single resource, not a folder to descend into.
      if entry.end_with?('.xcassets')
        ref = group.new_reference(path)
        resource_files << ref
        next
      end
      next if entry.start_with?('.')

      child = group.new_group(entry, path)
      add_directory(project, child, path, swift_files, resource_files)
    else
      next if entry.start_with?('.')
      next if entry == 'Info.plist'                # referenced via INFOPLIST_FILE
      next if entry.end_with?('.example.xcconfig') # template only

      ref = group.new_reference(path)
      swift_files << ref if entry.end_with?('.swift')
    end
  end
end

app_group = project.new_group(APP_NAME, APP_SOURCES)
app_swift = []
app_resources = []
add_directory(project, app_group, APP_SOURCES, app_swift, app_resources)

# Info.plist is visible in the navigator even though it isn't compiled.
app_group.new_reference(File.join(APP_SOURCES, 'Resources', 'Info.plist'))

test_group = project.new_group('SpeakLabTests', TEST_SOURCES)
test_swift = []
test_resources = []
add_directory(project, test_group, TEST_SOURCES, test_swift, test_resources)

# --------------------------------------------------------------------- targets

app_target = project.new_target(:application, APP_NAME, :ios, DEPLOYMENT)
app_target.add_file_references(app_swift)
app_target.add_resources(app_resources)

test_target = project.new_target(:unit_test_bundle, 'SpeakLabTests', :ios, DEPLOYMENT)
test_target.add_file_references(test_swift)
test_target.add_dependency(app_target)

# The gem links Foundation via an absolute path containing whichever iOS SDK
# version happened to be current when the project was generated. That path
# won't exist on a machine with a different Xcode, and the build fails with
# "framework not found". Swift links Foundation implicitly, so drop the lot.
[app_target, test_target].each do |target|
  target.frameworks_build_phase.files.to_a.each(&:remove_from_project)
end
project.frameworks_group&.children&.to_a&.each(&:remove_from_project)

# -------------------------------------------------------------- build settings

COMMON = {
  'SWIFT_VERSION' => SWIFT_VERSION,
  'IPHONEOS_DEPLOYMENT_TARGET' => DEPLOYMENT,
  'CODE_SIGN_STYLE' => 'Automatic',
  # Left blank on purpose: Xcode fills it in from the signing certificate the
  # first time you pick a team, and committing a team ID would break every
  # other machine.
  'DEVELOPMENT_TEAM' => '',
  'SWIFT_EMIT_LOC_STRINGS' => 'NO'
}.freeze

APP_SETTINGS = COMMON.merge(
  'PRODUCT_NAME' => '$(TARGET_NAME)',
  'PRODUCT_BUNDLE_IDENTIFIER' => 'com.speaklab.app',
  'INFOPLIST_FILE' => "#{APP_NAME}/Resources/Info.plist",
  'GENERATE_INFOPLIST_FILE' => 'NO',
  'ASSETCATALOG_COMPILER_APPICON_NAME' => 'AppIcon',
  'ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME' => 'AccentColor',
  'TARGETED_DEVICE_FAMILY' => '1,2',
  'ENABLE_PREVIEWS' => 'YES',
  'MARKETING_VERSION' => '1.0',
  'CURRENT_PROJECT_VERSION' => '1',
  'CLANG_ENABLE_MODULES' => 'YES',
  'SWIFT_OPTIMIZATION_LEVEL' => '-Onone',
  'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks']
).freeze

TEST_SETTINGS = COMMON.merge(
  'PRODUCT_NAME' => '$(TARGET_NAME)',
  'PRODUCT_BUNDLE_IDENTIFIER' => 'com.speaklab.app.tests',
  'GENERATE_INFOPLIST_FILE' => 'YES',
  'TEST_HOST' => "$(BUILT_PRODUCTS_DIR)/#{APP_NAME}.app/#{APP_NAME}",
  'BUNDLE_LOADER' => '$(TEST_HOST)',
  'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks', '@loader_path/Frameworks']
).freeze

app_target.build_configurations.each do |config|
  APP_SETTINGS.each { |key, value| config.build_settings[key] = value }
  # Release builds get real optimisation; debug stays fast to compile.
  config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O' if config.name == 'Release'
  config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = 'DEBUG' if config.name == 'Debug'
end

test_target.build_configurations.each do |config|
  TEST_SETTINGS.each { |key, value| config.build_settings[key] = value }
end

project.build_configurations.each do |config|
  config.build_settings['SWIFT_VERSION'] = SWIFT_VERSION
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT
  config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'YES'
end

project.save

# ------------------------------------------------------------------- scheme

# A shared scheme means "open and press Run" works on a fresh clone, and that
# the test target is wired to Cmd-U without anyone configuring it.
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app_target)
scheme.add_test_target(test_target)
scheme.set_launch_target(app_target)
scheme.save_as(PROJECT_PATH, APP_NAME, true)

puts "Generated #{PROJECT_PATH}"
puts "  app sources:  #{app_swift.count} Swift files"
puts "  test sources: #{test_swift.count} Swift files"
puts "  resources:    #{app_resources.map { |r| File.basename(r.path) }.join(', ')}"
