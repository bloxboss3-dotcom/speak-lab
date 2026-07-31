// swift-tools-version:5.9
import PackageDescription

// SpeakLabCore is the platform-independent heart of the app: scenario content,
// objective speech metrics, AI-response decoding, scoring, and progression.
//
// The exact same source files are compiled into the iOS app target (see
// Tools/generate_xcodeproj.rb). Keeping them Foundation-only means the whole
// learning engine can be built and unit-tested on any platform, including CI
// machines without Xcode.
let package = Package(
    name: "SpeakLabCore",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [
        .library(name: "SpeakLabCore", targets: ["SpeakLabCore"])
    ],
    targets: [
        .target(
            name: "SpeakLabCore",
            path: "ios/SpeakLab/Core"
        ),
        .testTarget(
            name: "SpeakLabCoreTests",
            dependencies: ["SpeakLabCore"],
            path: "Tests/SpeakLabCoreTests"
        ),
        // Emits the curriculum and scenario catalogue as JSON for the web
        // client, so both clients share one definition of the content.
        .executableTarget(
            name: "speaklab-content-export",
            dependencies: ["SpeakLabCore"],
            path: "Tools/ContentExport"
        )
    ]
)
