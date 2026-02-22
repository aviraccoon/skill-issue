import { describe, expect, test } from "bun:test";
import type { SaveDataV4 } from "../persistence";
import { CURRENT_SAVE_VERSION, runMigrations } from "./index";
import type { SaveDataV3, SavedStateV3 } from "./types";

/** Minimal V3 saved state for testing migration. */
function makeV3State(): SavedStateV3 {
	return {
		day: "tuesday",
		dayIndex: 1,
		timeBlock: "afternoon",
		slotsRemaining: 2,
		weekendPointsRemaining: 0,
		tasks: [
			{
				id: "dishes",
				failureCount: 1,
				attemptedToday: true,
				succeededToday: false,
			},
		],
		selectedTaskId: null,
		screen: "game",
		energy: 0.6,
		momentum: 0.4,
		runSeed: 42,
		personality: { time: "neutral", social: "neutral" },
		dogFailedYesterday: false,
		pushedThroughLastNight: false,
		inExtendedNight: false,
		consecutiveFailures: 1,
		friendRescueUsedToday: false,
		rollCount: 5,
		variantsUnlocked: [],
		runStats: {
			tasks: { attempted: 3, succeeded: 2 },
			byTimeBlock: {
				morning: { attempted: 1, succeeded: 1 },
				afternoon: { attempted: 1, succeeded: 1 },
				evening: { attempted: 1, succeeded: 0 },
				night: { attempted: 0, succeeded: 0 },
			},
			phoneChecks: 0,
			allNighters: 0,
			friendRescues: { triggered: 0, accepted: 0 },
			variantsUsed: [],
		},
	};
}

function makeV3Data(
	currentRun: SavedStateV3 | null = makeV3State(),
): SaveDataV3 {
	return {
		version: 3,
		currentRun,
		patterns: {
			unlocked: false,
			history: [],
		},
		savedAt: Date.now(),
	};
}

describe("runMigrations", () => {
	test("returns data unchanged when already at current version", () => {
		const v4: SaveDataV4 = {
			version: 4,
			runs: { main: null, seeded: null },
			patterns: { unlocked: false, history: [] },
			savedAt: Date.now(),
		};
		const result = runMigrations(v4);
		expect(result).not.toBeNull();
		expect(result?.version).toBe(CURRENT_SAVE_VERSION);
		expect(result?.runs).toEqual(v4.runs);
	});

	test("returns null for future version", () => {
		const future = { version: 99 };
		expect(runMigrations(future)).toBeNull();
	});

	test("migrates V3 to V4", () => {
		const v3 = makeV3Data();
		const result = runMigrations(v3);
		expect(result).not.toBeNull();
		expect(result?.version).toBe(4);
		expect(result?.runs.main).not.toBeNull();
		expect(result?.runs.main?.day).toBe("tuesday");
		expect(result?.runs.main?.gameMode).toBe("main");
		expect(result?.runs.seeded).toBeNull();
	});

	test("migrates V3 with null currentRun", () => {
		const v3 = makeV3Data(null);
		const result = runMigrations(v3);
		expect(result).not.toBeNull();
		expect(result?.version).toBe(4);
		expect(result?.runs.main).toBeNull();
	});

	test("returns null for version with no migration path", () => {
		// Version 2 has no migration function registered
		const old = { version: 2 };
		expect(runMigrations(old)).toBeNull();
	});

	test("preserves patterns data through migration", () => {
		const v3 = makeV3Data();
		v3.patterns.unlocked = true;
		v3.patterns.history = [
			{
				seed: 42,
				personality: { time: "nightOwl", social: "hermit" },
				stats: v3.currentRun?.runStats ?? makeV3State().runStats,
				completedAt: Date.now(),
			},
		];
		const result = runMigrations(v3);
		expect(result?.patterns.unlocked).toBe(true);
		expect(result?.patterns.history.length).toBe(1);
	});
});
