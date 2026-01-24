import { strings } from "../i18n";
import { type GameState, isWeekend } from "../state";
import type { Store } from "../store";
import { nextRoll, pickVariant, seededVariation } from "../utils/random";
import { calculateFriendRescueEnergyEffect } from "./energy";

const SALT_RESCUE_CHANCE = 5001;

/** Minimum consecutive failures before friend rescue can trigger. */
export const FRIEND_RESCUE_THRESHOLD = 3;

/** Minimum consecutive failures for phone buzz hint (before rescue threshold). */
export const PHONE_BUZZ_THRESHOLD = 2;

/**
 * Base probability of friend reaching out.
 * Varies by seed: 35-45%.
 */
export const FRIEND_RESCUE_CHANCE_BASE = 0.4;
export const FRIEND_RESCUE_CHANCE_VARIANCE = 0.05;

/**
 * Returns the friend rescue probability for this run (35-45%).
 */
export function getFriendRescueChance(seed: number): number {
	return seededVariation(
		seed,
		FRIEND_RESCUE_CHANCE_BASE,
		FRIEND_RESCUE_CHANCE_VARIANCE,
		SALT_RESCUE_CHANCE,
	);
}

/** Cost in action slots (weekday) or points (weekend). */
export const FRIEND_RESCUE_COST_WEEKDAY = 1;
export const FRIEND_RESCUE_COST_WEEKEND = 2;

/** Activity tier definitions with energy thresholds and effects. */
export type ActivityTier = "low" | "medium" | "high";

export interface Activity {
	id: ActivityTier;
	name: string;
	description: string;
	energyThreshold: number;
}

/** Static activity data (game logic only). */
const ACTIVITY_DATA: { id: ActivityTier; energyThreshold: number }[] = [
	{ id: "low", energyThreshold: 0.2 },
	{ id: "medium", energyThreshold: 0.45 },
	{ id: "high", energyThreshold: 0.7 },
];

/** Gets activities with localized display strings, picked deterministically from variants. */
export function getLocalizedActivities(
	seed: number,
	dayIndex: number,
): Activity[] {
	const s = strings();
	return ACTIVITY_DATA.map((data, tierIndex) => {
		const tierActivities = s.activities[data.id];
		const activity = pickVariant(tierActivities, seed + dayIndex + tierIndex);
		const description = pickVariant(activity.descriptions, seed + dayIndex);
		return {
			...data,
			name: activity.name,
			description,
		};
	});
}

/**
 * Activities with static data for game logic.
 * Use getLocalizedActivities() for display.
 */
export const ACTIVITIES: Activity[] = ACTIVITY_DATA.map((data) => ({
	...data,
	name: data.id, // Placeholder - use getLocalizedActivities() for display
	description: "",
}));

/** Momentum effect when player picks correct tier. */
export const CORRECT_TIER_MOMENTUM = 0.1;

/** Momentum effect when player picks wrong tier. */
export const WRONG_TIER_MOMENTUM = 0.03;

/** Extra energy penalty when picking wrong tier (stacks with personality effect). */
export const WRONG_TIER_ENERGY_PENALTY = 0.08;

/**
 * Checks if the friend rescue should trigger.
 * Called after a failed task attempt.
 */
export function shouldTriggerFriendRescue(store: Store<GameState>): boolean {
	const state = store.getState();

	// Already used today
	if (state.friendRescueUsedToday) return false;

	// Not enough consecutive failures
	if (state.consecutiveFailures < FRIEND_RESCUE_THRESHOLD) return false;

	// Check if player can afford it (no point offering if they can't accept)
	if (!canAffordRescue(state)) return false;

	// Roll the dice (chance varies by seed + bonus from "Something Nice" phone outcome)
	const baseChance = getFriendRescueChance(state.runSeed);
	const totalChance = Math.min(baseChance + state.friendRescueChanceBonus, 0.9);
	return nextRoll(store) < totalChance;
}

/**
 * Returns true if player has enough slots/points to accept a rescue.
 */
export function canAffordRescue(state: GameState): boolean {
	if (isWeekend(state)) {
		return state.weekendPointsRemaining >= FRIEND_RESCUE_COST_WEEKEND;
	}
	return state.slotsRemaining >= FRIEND_RESCUE_COST_WEEKDAY;
}

/**
 * Gets the cost for accepting the rescue based on day type.
 */
export function getRescueCost(state: GameState): number {
	return isWeekend(state)
		? FRIEND_RESCUE_COST_WEEKEND
		: FRIEND_RESCUE_COST_WEEKDAY;
}

/**
 * Checks if the chosen activity tier matches the player's energy.
 */
export function isCorrectTier(activity: Activity, energy: number): boolean {
	return energy >= activity.energyThreshold;
}

/**
 * Gets the effects of choosing an activity.
 * Energy effect is personality-aware, with extra penalty for wrong tier.
 */
export function getActivityEffects(
	activity: Activity,
	state: GameState,
): { momentum: number; energy: number } {
	// Base energy effect from personality
	const energyEffect = calculateFriendRescueEnergyEffect(state);

	if (isCorrectTier(activity, state.energy)) {
		return {
			momentum: CORRECT_TIER_MOMENTUM,
			energy: energyEffect,
		};
	}

	// Wrong tier: reduced momentum + extra energy penalty
	return {
		momentum: WRONG_TIER_MOMENTUM,
		energy: energyEffect - WRONG_TIER_ENERGY_PENALTY,
	};
}
