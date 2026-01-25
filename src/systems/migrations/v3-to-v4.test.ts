import { describe, expect, test } from "bun:test";
import type { SaveDataV3 } from "./types";
import { migrateV3toV4 } from "./v3-to-v4";

describe("v3 to v4 migration", () => {
	test("migrates currentRun to runs.main", () => {
		const v3Data: SaveDataV3 = {
			version: 3,
			currentRun: {
				day: "tuesday",
				dayIndex: 1,
				timeBlock: "afternoon",
				slotsRemaining: 2,
				weekendPointsRemaining: 8,
				tasks: [
					{
						id: "shower",
						failureCount: 1,
						attemptedToday: true,
						succeededToday: false,
					},
				],
				selectedTaskId: null,
				screen: "game",
				energy: 0.6,
				momentum: 0.5,
				runSeed: 12345,
				personality: { time: "nightOwl", social: "hermit" },
				dogFailedYesterday: false,
				pushedThroughLastNight: false,
				inExtendedNight: false,
				consecutiveFailures: 1,
				friendRescueUsedToday: false,
				rollCount: 3,
				variantsUnlocked: ["hygiene"],
				runStats: {
					tasks: { attempted: 5, succeeded: 2 },
					byTimeBlock: {
						morning: { attempted: 2, succeeded: 1 },
						afternoon: { attempted: 2, succeeded: 1 },
						evening: { attempted: 1, succeeded: 0 },
						night: { attempted: 0, succeeded: 0 },
					},
					phoneChecks: 3,
					allNighters: 0,
					friendRescues: { triggered: 1, accepted: 1 },
					variantsUsed: [],
				},
			},
			patterns: {
				unlocked: true,
				history: [
					{
						seed: 11111,
						personality: { time: "earlyBird", social: "socialBattery" },
						stats: {
							tasks: { attempted: 50, succeeded: 25 },
							byTimeBlock: {
								morning: { attempted: 15, succeeded: 10 },
								afternoon: { attempted: 15, succeeded: 5 },
								evening: { attempted: 10, succeeded: 5 },
								night: { attempted: 10, succeeded: 5 },
							},
							phoneChecks: 20,
							allNighters: 2,
							friendRescues: { triggered: 5, accepted: 3 },
							variantsUsed: ["food"],
						},
						completedAt: 1700000000000,
					},
				],
				hasSeenIntro: true,
				hasEverAttempted: true,
			},
			savedAt: 1700000001000,
		};

		const result = migrateV3toV4(v3Data);

		expect(result.version).toBe(4);
		expect(result.runs.seeded).toBeNull();
		expect(result.patterns).toEqual(v3Data.patterns);

		// Check that gameMode was added to migrated save
		const migratedMain = result.runs.main;
		expect(migratedMain).not.toBeNull();
		expect(migratedMain?.gameMode).toBe("main");
		expect(migratedMain?.day).toBe(v3Data.currentRun?.day);
		expect(migratedMain?.runSeed).toBe(v3Data.currentRun?.runSeed);
		expect(migratedMain?.energy).toBe(v3Data.currentRun?.energy);
	});

	test("handles null currentRun", () => {
		const v3Data: SaveDataV3 = {
			version: 3,
			currentRun: null,
			patterns: {
				unlocked: false,
				history: [],
			},
			savedAt: 1700000000000,
		};

		const result = migrateV3toV4(v3Data);

		expect(result.version).toBe(4);
		expect(result.runs.main).toBeNull();
		expect(result.runs.seeded).toBeNull();
		expect(result.patterns.unlocked).toBe(false);
		expect(result.patterns.history).toEqual([]);
	});

	test("preserves optional patterns fields", () => {
		const v3Data: SaveDataV3 = {
			version: 3,
			currentRun: null,
			patterns: {
				unlocked: true,
				history: [],
				hasSeenIntro: true,
				hasEverAttempted: true,
			},
			savedAt: 1700000000000,
		};

		const result = migrateV3toV4(v3Data);

		expect(result.patterns.hasSeenIntro).toBe(true);
		expect(result.patterns.hasEverAttempted).toBe(true);
	});
});
