import Foundation
import SpeakLabCore

// Exports the curriculum, scenario catalogue and nugget library as JSON.
//
// The web client needs the same content as the iOS app. Rather than keeping a
// second copy of 60-odd scenarios and skills in TypeScript — which would drift
// on the first edit — the Swift definitions stay the single source of truth and
// this executable emits them. CI re-runs it and fails if the checked-in JSON
// differs, so the two clients cannot silently diverge.

struct NuggetEntryPayload: Encodable {
    let nugget: GoldenNugget
    let relatedSkillIDs: [String]
}

struct ContentPayload: Encodable {
    /// Bumped by hand when the shape (not the content) changes.
    let formatVersion: Int
    let paths: [SkillPath]
    let skills: [MicroSkill]
    let scenarios: [Scenario]
    let nuggets: [NuggetEntryPayload]
}

let payload = ContentPayload(
    formatVersion: 1,
    paths: Curriculum.paths,
    skills: Curriculum.skills,
    scenarios: ScenarioLibrary.all,
    nuggets: NuggetLibrary.entries.map {
        NuggetEntryPayload(nugget: $0.nugget, relatedSkillIDs: $0.relatedSkillIDs)
    }
)

let encoder = JSONEncoder()
// Sorted keys and stable formatting keep the committed file diff-friendly, which
// is what makes the CI freshness check readable when content does change.
encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]

let data: Data
do {
    data = try encoder.encode(payload)
} catch {
    FileHandle.standardError.write(Data("content export failed to encode: \(error)\n".utf8))
    exit(1)
}

let arguments = CommandLine.arguments
guard arguments.count >= 2 else {
    FileHandle.standardError.write(Data("usage: speaklab-content-export <output-file>\n".utf8))
    exit(2)
}

let outputPath = arguments[1]
let outputURL = URL(fileURLWithPath: outputPath)

do {
    try FileManager.default.createDirectory(
        at: outputURL.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    // JSONEncoder does not add a trailing newline; POSIX tools expect one.
    try (data + Data("\n".utf8)).write(to: outputURL, options: .atomic)
} catch {
    FileHandle.standardError.write(Data("content export failed to write \(outputPath): \(error)\n".utf8))
    exit(1)
}

print("Exported \(payload.paths.count) paths, \(payload.skills.count) skills, "
    + "\(payload.scenarios.count) scenarios and \(payload.nuggets.count) nuggets to \(outputPath)")
