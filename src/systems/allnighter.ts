import { strings } from "../i18n";
import { type GameState, isWeekend } from "../state";
import { pickVariant, seededVariation } from "../utils/random";
import type { TimePreference } from "./personality";

const SALT_ALL_NIGHTER_PENALTY = 4001;

/**
 * All-nighter energy penalty bases by time preference.
 * Night Owls handle it better; Early Birds crash harder.
 */
export const ALL_NIGHTER_PENALTY: Record<
	TimePreference,
	{ base: number; variance: number }
> = {
	nightOwl: { base: 0.15, variance: 0.05 }, // 10-20%
	neutral: { base: 0.25, variance: 0.05 }, // 20-30%
	earlyBird: { base: 0.35, variance: 0.05 }, // 30-40%
};

/**
 * Returns the energy penalty for all-nighter based on personality and seed.
 */
export function getAllNighterPenalty(
	seed: number,
	timePref: TimePreference,
): number {
	const { base, variance } = ALL_NIGHTER_PENALTY[timePref];
	return seededVariation(seed, base, variance, SALT_ALL_NIGHTER_PENALTY);
}

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
 * Uses rollCount for variety in the message.
 */
export function getExtendedNightDescription(
	energy: number,
	rollCount: number,
): string {
	const s = strings();
	const slots = calculateExtendedNightSlots(energy);

	if (slots >= 4) {
		return pickVariant(s.allnighter.wired, rollCount);
	}
	if (slots >= 3) {
		return pickVariant(s.allnighter.someFuel, rollCount);
	}
	if (slots >= 2) {
		return pickVariant(s.allnighter.runningLow, rollCount);
	}
	return pickVariant(s.allnighter.exhausted, rollCount);
}
