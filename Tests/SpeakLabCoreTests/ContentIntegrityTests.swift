import XCTest
// The same test suite runs in two places: `swift test` compiles Core as the
// SpeakLabCore package, while the Xcode test target compiles those files into
// the app module. This picks whichever exists.
#if canImport(SpeakLabCore)
@testable import SpeakLabCore
#else
@testable import SpeakLab
#endif

/// Guards the curriculum against typos.
///
/// Content is written by hand, and a mistyped skill ID would silently break
/// progression or leave a scenario unreachable. These tests are cheap and catch
/// exactly the mistakes that content editing produces.
final class ContentIntegrityTests: XCTestCase {

    func testEveryPathReferencesRealSkills() {
        for path in Curriculum.paths {
            XCTAssertFalse(path.skillIDs.isEmpty, "Path \(path.id) has no skills")
            for skillID in path.skillIDs {
                XCTAssertNotNil(Curriculum.skill(id: skillID), "Path \(path.id) references unknown skill \(skillID)")
            }
        }
    }

    func testEverySkillBelongsToItsDeclaredPath() {
        for skill in Curriculum.skills {
            guard let path = Curriculum.path(id: skill.pathID) else {
                return XCTFail("Skill \(skill.id) points at unknown path \(skill.pathID)")
            }
            XCTAssertTrue(
                path.skillIDs.contains(skill.id),
                "Skill \(skill.id) says it is in \(path.id) but the path does not list it"
            )
        }
    }

    func testSkillIDsAreUnique() {
        let ids = Curriculum.skills.map { $0.id }
        XCTAssertEqual(Set(ids).count, ids.count, "Duplicate skill IDs would make lookups ambiguous")
    }

    func testPathIDsAreUnique() {
        let ids = Curriculum.paths.map { $0.id }
        XCTAssertEqual(Set(ids).count, ids.count)
    }

    func testScenarioIDsAreUnique() {
        let ids = ScenarioLibrary.all.map { $0.id }
        XCTAssertEqual(Set(ids).count, ids.count)
    }

    func testEveryScenarioReferencesRealSkillsAndPaths() {
        for scenario in ScenarioLibrary.all {
            XCTAssertNotNil(
                Curriculum.path(id: scenario.pathID),
                "Scenario \(scenario.id) references unknown path \(scenario.pathID)"
            )
            XCTAssertNotNil(
                Curriculum.skill(id: scenario.primarySkillID),
                "Scenario \(scenario.id) references unknown skill \(scenario.primarySkillID)"
            )
        }
    }

    func testTransferVariantsPointAtRealParents() {
        for scenario in ScenarioLibrary.all {
            guard let parentID = scenario.transferOf else { continue }
            let parent = ScenarioLibrary.scenario(id: parentID)
            XCTAssertNotNil(parent, "Scenario \(scenario.id) transfers from unknown \(parentID)")
            XCTAssertNotNil(scenario.transferTwist, "Transfer \(scenario.id) must explain what changed")
            if let parent {
                XCTAssertGreaterThanOrEqual(
                    scenario.tier, parent.tier,
                    "A transfer variant should not be easier than its parent"
                )
            }
        }
    }

    func testEveryConversationScenarioHasACharacterBrief() {
        for scenario in ScenarioLibrary.scenarios(mode: .conversation) {
            XCTAssertNotNil(scenario.character, "Conversation scenario \(scenario.id) has no character")
            guard let character = scenario.character else { continue }
            XCTAssertFalse(character.opensWith.isEmpty, "\(scenario.id): character needs an opening line")
            XCTAssertFalse(character.hiddenGoal.isEmpty, "\(scenario.id): character needs a hidden goal")
            XCTAssertFalse(character.successCondition.isEmpty, "\(scenario.id): needs a success condition")
            XCTAssertFalse(character.failCondition.isEmpty, "\(scenario.id): needs a fail condition")
        }
    }

    func testSpeakingScenariosHaveNoCharacter() {
        for scenario in ScenarioLibrary.scenarios(mode: .speaking) {
            XCTAssertNil(scenario.character, "Speaking scenario \(scenario.id) should not carry a character brief")
        }
    }

    func testEveryScenarioHasAtLeastOneRequiredObjective() {
        for scenario in ScenarioLibrary.all {
            XCTAssertFalse(
                scenario.requiredObjectives.isEmpty,
                "Scenario \(scenario.id) has no required objectives"
            )
        }
    }

    func testEveryScenarioHasBriefingAndHook() {
        for scenario in ScenarioLibrary.all {
            XCTAssertFalse(scenario.briefing.isEmpty, "\(scenario.id) needs a briefing")
            XCTAssertFalse(scenario.hook.isEmpty, "\(scenario.id) needs a hook")
        }
    }

    func testUserRequestedSeedScenariosAllExist() {
        // These nine were specified up front; losing one to a rename would be silent.
        let required = [
            "spk-buddy-week",
            "spk-leadership-lesson",
            "spk-attendance-matters",
            "cnv-trial-welcome",
            "cnv-too-expensive",
            "cnv-schedule-request",
            "cnv-missed-classes",
            "cnv-correct-student",
            "cnv-upset-parent"
        ]
        for id in required {
            XCTAssertNotNil(ScenarioLibrary.scenario(id: id), "Seed scenario \(id) is missing")
        }
    }

    func testEveryPathHasAtLeastOneScenario() {
        for path in Curriculum.paths {
            let scenarios = ScenarioLibrary.scenarios(pathID: path.id)
            XCTAssertFalse(scenarios.isEmpty, "Path \(path.id) has no scenarios and would render empty")
        }
    }

    func testNuggetsReferenceRealSkills() {
        for entry in NuggetLibrary.entries {
            XCTAssertFalse(entry.relatedSkillIDs.isEmpty, "Nugget \(entry.id) is attached to no skill")
            for skillID in entry.relatedSkillIDs {
                XCTAssertNotNil(
                    Curriculum.skill(id: skillID),
                    "Nugget \(entry.id) references unknown skill \(skillID)"
                )
            }
        }
    }

    func testNuggetIDsAreUnique() {
        let ids = NuggetLibrary.all.map { $0.id }
        XCTAssertEqual(Set(ids).count, ids.count)
    }

    func testNuggetLibraryContainsNoManipulationTactics() {
        // The brief was explicit: never manufacture urgency, fear, or social proof.
        let banned = ["urgency", "scarcity", "social proof", "fomo", "act now", "limited time"]
        for nugget in NuggetLibrary.all {
            let haystack = (nugget.title + " " + nugget.insight).lowercased()
            for term in banned where haystack.contains(term) {
                // Mentioning a tactic in order to reject it is fine; endorsing is not.
                XCTAssertTrue(
                    haystack.contains("not") || haystack.contains("never") || haystack.contains("don't"),
                    "Nugget \(nugget.id) appears to endorse '\(term)'"
                )
            }
        }
    }

    func testEverySkillHasCoachingCopy() {
        for skill in Curriculum.skills {
            XCTAssertFalse(skill.summary.isEmpty, "\(skill.id) needs a summary")
            XCTAssertFalse(skill.whyItMatters.isEmpty, "\(skill.id) needs a rationale")
            XCTAssertFalse(skill.strongExample.isEmpty, "\(skill.id) needs a strong example")
            XCTAssertFalse(skill.retryCue.isEmpty, "\(skill.id) needs a retry cue")
        }
    }

    func testTransferLookupPrefersExplicitVariantThenHarderScenario() {
        let buddyWeek = ScenarioLibrary.scenario(id: "spk-buddy-week")!
        let transfer = ScenarioLibrary.transferScenario(after: buddyWeek)
        XCTAssertEqual(transfer?.id, "spk-buddy-week-noise")

        // A scenario with no explicit variant should still find a harder sibling
        // if one exists, and otherwise return nil rather than looping.
        let hardest = ScenarioLibrary.scenario(id: "cnv-upset-parent-public")!
        XCTAssertNil(ScenarioLibrary.transferScenario(after: hardest))
    }

    func testBaselineScenariosAreExcludedFromBrowsing() {
        let baselineIDs = Set(ScenarioLibrary.baselineScenarios.map { $0.id })
        XCTAssertFalse(baselineIDs.isEmpty, "There must be baseline scenarios to measure against")
        for scenario in ScenarioLibrary.browsable {
            XCTAssertFalse(baselineIDs.contains(scenario.id))
        }
    }

    func testBaselinePairIsComparableButNotIdentical() {
        let first = ScenarioLibrary.scenario(id: "spk-baseline-a")!
        let second = ScenarioLibrary.scenario(id: "spk-baseline-b")!

        XCTAssertEqual(first.tier, second.tier)
        XCTAssertEqual(first.timeLimitSeconds, second.timeLimitSeconds)
        XCTAssertEqual(first.primarySkillID, second.primarySkillID)
        XCTAssertNotEqual(first.briefing, second.briefing, "Re-baseline must not be the same task")
    }

    func testUnlockedPathsGrowWithLevel() {
        let atStart = Curriculum.unlockedPaths(atLevel: 1).count
        let later = Curriculum.unlockedPaths(atLevel: 10).count

        XCTAssertGreaterThan(atStart, 0, "Something must be available on day one")
        XCTAssertGreaterThan(later, atStart, "Progression should reveal new paths")
        XCTAssertEqual(Curriculum.unlockedPaths(atLevel: 99).count, Curriculum.paths.count)
    }

    func testHigherTiersGiveLessPreparationTime() {
        XCTAssertGreaterThan(
            DifficultyTier.foundation.defaultPrepSeconds,
            DifficultyTier.boss.defaultPrepSeconds,
            "Reducing assistance is how difficulty should increase"
        )
    }
}
