import { DAYS, type GameState, TIME_BLOCKS } from "../state";
import type { Store } from "../store";
import {
	ALL_NIGHTER_ENERGY_PENALTY,
	canPushThrough,
} from "../systems/allnighter";
import { wasDogWalkedToday } from "../systems/dog";
import { calculateSleepQuality } from "../systems/sleep";
import { clamp } from "../utils/math";

/** Momentum decay per time block advance. */
const MOMENTUM_DECAY_PER_BLOCK = 0.02;

/**
 * Advances to the next time block. Resets action slots.
 * If at night, shows day summary. Applies momentum decay.
 */
export function skipTimeBlock(store: Store<GameState>) {
	const state = store.getState();

	// Decay momentum on time block advance
	store.update("momentum", (m) => Math.max(m - MOMENTUM_DECAY_PER_BLOCK, 0));

	const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
	const nextBlock = TIME_BLOCKS[currentIndex + 1];

	if (nextBlock) {
		// Move to next time block
		store.set("timeBlock", nextBlock);
		store.set("slotsRemaining", 3);
	} else {
		// End of day - show summary
		showDaySummary(store);
	}
}

/**
 * Ends the weekend day. Called when player chooses to end their day
 * or runs out of action points.
 */
export function endWeekendDay(store: Store<GameState>) {
	showDaySummary(store);
}

/**
 * Handles end-of-day flow. May show night choice or day summary.
 * Called when night block ends or extended night ends.
 */
function showDaySummary(store: Store<GameState>) {
	const state = store.getState();

	// Track if dog wasn't walked (affects next day urgency)
	const dogWalked = wasDogWalkedToday(state);
	store.set("dogFailedYesterday", !dogWalked);

	// Check if player can choose to push through
	// Only offer choice at end of normal night (not extended night, not weekend)
	if (state.timeBlock === "night" && canPushThrough(state)) {
		store.set("screen", "nightChoice");
		return;
	}

	// Otherwise go straight to day summary
	store.set("screen", "daySummary");
}

/**
 * Continues to the next day after viewing the summary.
 * Applies sleep quality modifiers and resets day state.
 * Handles all-nighter penalties if player pushed through.
 */
export function continueToNextDay(store: Store<GameState>) {
	const state = store.getState();
	const nextDayIndex = state.dayIndex + 1;
	const nextDay = DAYS[nextDayIndex];

	if (!nextDay) {
		// Week complete
		store.set("screen", "weekComplete");
		return;
	}

	const pulledAllNighter = state.inExtendedNight;

	// Calculate and apply sleep quality effects
	const sleepMod = calculateSleepQuality(state);
	store.update("energy", (e) => clamp(e + sleepMod.energy, 0, 1));
	store.update("momentum", (m) => clamp(m + sleepMod.momentum, 0, 1));

	// Apply all-nighter penalty if player pushed through
	if (pulledAllNighter) {
		store.update("energy", (e) => clamp(e - ALL_NIGHTER_ENERGY_PENALTY, 0, 1));
	}

	// Advance to next day
	store.set("day", nextDay);
	store.set("dayIndex", nextDayIndex);
	store.set("screen", "game");

	// Track all-nighter for next night (blocks consecutive)
	store.set("pushedThroughLastNight", pulledAllNighter);
	store.set("inExtendedNight", false);

	// Reset based on day type
	const weekend = nextDayIndex >= 5;
	if (weekend) {
		// Weekend - 8 action points, no time blocks
		store.set("weekendPointsRemaining", 8);
	} else if (pulledAllNighter) {
		// Weekday after all-nighter - skip morning, start at afternoon
		store.set("timeBlock", "afternoon");
		store.set("slotsRemaining", 3);
	} else {
		// Normal weekday - morning with 3 slots
		store.set("timeBlock", "morning");
		store.set("slotsRemaining", 3);
	}

	// Reset daily flags on tasks
	store.update("tasks", (tasks) =>
		tasks.map((t) => ({
			...t,
			attemptedToday: false,
			succeededToday: false,
		})),
	);
}
