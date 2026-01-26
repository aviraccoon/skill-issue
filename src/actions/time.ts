import { DAYS, type GameState, TIME_BLOCKS } from "../state";
import type { Store } from "../store";
import { canPushThrough, getAllNighterPenalty } from "../systems/allnighter";
import { wasDogWalkedToday } from "../systems/dog";
import { getEnergyDecayPerBlock } from "../systems/energy";
import { getMomentumDecayPerBlock } from "../systems/momentum";
import { calculateSleepQuality } from "../systems/sleep";
import { clamp } from "../utils/math";
import { nextRoll } from "../utils/random";

/** Probability of phone notification appearing on time block change. */
const PHONE_NOTIFICATION_CHANCE = 0.15;

/**
 * Advances to the next time block. Resets action slots.
 * If at night, shows day summary. Applies momentum decay.
 */
export function skipTimeBlock(store: Store<GameState>) {
	const state = store.getState();

	// Decay momentum and energy on time block advance (both vary by seed)
	const momentumDecay = getMomentumDecayPerBlock(state.runSeed);
	store.update("momentum", (m) => Math.max(m - momentumDecay, 0));
	const energyDecay = getEnergyDecayPerBlock(state.runSeed);
	store.update("energy", (e) => Math.max(e - energyDecay, 0));

	const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
	const nextBlock = TIME_BLOCKS[currentIndex + 1];

	if (nextBlock) {
		// Move to next time block
		store.set("timeBlock", nextBlock);
		store.set("slotsRemaining", 3);
		// Clear selection - task may not be available in new block
		store.set("selectedTaskId", null);

		// Random chance to trigger phone notification (scroll trap temptation)
		if (nextRoll(store) < PHONE_NOTIFICATION_CHANCE) {
			store.update("phoneNotificationCount", (c) => c + 1);
		}
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

	// Apply all-nighter penalty if player pushed through (varies by seed)
	if (pulledAllNighter) {
		const penalty = getAllNighterPenalty(state.runSeed);
		store.update("energy", (e) => clamp(e - penalty, 0, 1));
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

	// Reset friend rescue state for new day
	store.set("friendRescueUsedToday", false);
	store.set("friendRescueChanceBonus", 0);

	// Clear task selection for new day
	store.set("selectedTaskId", null);
}
