/**
 * Historical save data types for migrations.
 * Each version's types are preserved here so migrations can be properly typed.
 */

import type { TaskCategory, TaskId } from "../../data/tasks";
import type { Day, RunStats, TimeBlock } from "../../state";
import type { Personality } from "../personality";

// ============================================================================
// Version 3 Types (currentRun structure)
// ============================================================================

/** V3: Runtime state for a task. */
export interface SavedTaskV3 {
	id: TaskId;
	failureCount: number;
	attemptedToday: boolean;
	succeededToday: boolean;
}

/** V3: Minimal game state for persistence. */
export interface SavedStateV3 {
	day: Day;
	dayIndex: number;
	timeBlock: TimeBlock;
	slotsRemaining: number;
	weekendPointsRemaining: number;
	tasks: SavedTaskV3[];
	selectedTaskId: string | null;
	screen:
		| "game"
		| "nightChoice"
		| "friendRescue"
		| "daySummary"
		| "weekComplete"
		| "intro";
	energy: number;
	momentum: number;
	runSeed: number;
	personality: Personality;
	dogFailedYesterday: boolean;
	pushedThroughLastNight: boolean;
	inExtendedNight: boolean;
	consecutiveFailures: number;
	friendRescueUsedToday: boolean;
	friendRescueChanceBonus?: number;
	rollCount: number;
	variantsUnlocked: TaskCategory[];
	runStats: RunStats;
}

/** V3: A completed run stored in patterns history. */
export interface CompletedRunV3 {
	seed: number;
	personality: Personality;
	stats: RunStats;
	completedAt: number;
}

/** V3: Persistent patterns data. */
export interface PatternsDataV3 {
	unlocked: boolean;
	history: CompletedRunV3[];
	hasSeenIntro?: boolean;
	hasEverAttempted?: boolean;
}

/** V3: Top-level save structure. */
export interface SaveDataV3 {
	version: 3;
	currentRun: SavedStateV3 | null;
	patterns: PatternsDataV3;
	savedAt: number;
}
