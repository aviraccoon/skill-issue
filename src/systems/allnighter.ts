import { strings } from "../i18n";
import { type GameState, isWeekend } from "../state";
import { seededVariation } from "../utils/random";

const SALT_ALL_NIGHTER_PENALTY = 4001;

/**
 * Base energy penalty after pushing through the night.
 * Varies by seed: 20-30%.
 */
export const ALL_NIGHTER_PENALTY_BASE = 0.25;
export const ALL_NIGHTER_PENALTY_VARIANCE = 0.05;

/**
 * Returns the energy penalty for all-nighter this run (20-30%).
 */
export function getAllNighterPenalty(seed: number): number {
	return seededVariation(
		seed,
		ALL_NIGHTER_PENALTY_BASE,
		ALL_NIGHTER_PENALTY_VARIANCE,
		SALT_ALL_NIGHTER_PENALTY,
	);
}

/** @deprecated Use getAllNighterPenalty(seed) instead. Kept for test compatibility. */
export const ALL_NIGHTER_ENERGY_PENALTY = 0.25;

/**
 * Calculates how many extended night slots you get based on current energy.
 * Higher energy = more productive late night.
 * Returns 1-4 slots.
 */
export function calculateExtendedNightSlots(energy: number): number {
	return Math.max(1, Math.floor(energy * 4));
}

/**
 * Checks if the player can choose to push through the night.
 * Requirements:
 * - Must be a weekday (no time blocks on weekends)
 * - Must not have pushed through last night (no consecutive all-nighters)
 * - Must not already be in extended night
 */
export function canPushThrough(state: GameState): boolean {
	// No all-nighters on weekends
	if (isWeekend(state)) {
		return false;
	}

	// Can't do consecutive all-nighters
	if (state.pushedThroughLastNight) {
		return false;
	}

	// Can't push through if already in extended night
	if (state.inExtendedNight) {
		return false;
	}

	return true;
}

/**
 * Returns descriptive text for the extended night slots based on energy.
 */
export function getExtendedNightDescription(energy: number): string {
	const s = strings();
	const slots = calculateExtendedNightSlots(energy);
	if (slots >= 4) {
		return s.allnighter.wired;
	}
	if (slots >= 3) {
		return s.allnighter.someFuel;
	}
	if (slots >= 2) {
		return s.allnighter.runningLow;
	}
	return s.allnighter.exhausted;
}
