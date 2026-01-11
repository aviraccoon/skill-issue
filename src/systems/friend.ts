import { type GameState, isWeekend } from "../state";

/** Minimum consecutive failures before friend rescue can trigger. */
export const FRIEND_RESCUE_THRESHOLD = 3;

/** Probability of friend reaching out when threshold met. */
export const FRIEND_RESCUE_CHANCE = 0.4;

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

export const ACTIVITIES: Activity[] = [
	{
		id: "low",
		name: "Coffee",
		description: "Quick coffee, low pressure",
		energyThreshold: 0.2,
	},
	{
		id: "medium",
		name: "Grab food",
		description: "Get something to eat together",
		energyThreshold: 0.45,
	},
	{
		id: "high",
		name: "Explore somewhere",
		description: "Check out that new place",
		energyThreshold: 0.7,
	},
];

/** Effects when player picks correct tier (energy >= threshold). */
export const CORRECT_TIER_EFFECTS = {
	momentum: 0.1,
	energy: 0.1,
};

/** Effects when player picks wrong tier (energy < threshold). */
export const WRONG_TIER_EFFECTS = {
	momentum: 0.03,
	energy: -0.08,
};

/** Messages the friend sends when reaching out. */
export const RESCUE_MESSAGES = [
	"Hey, you doing okay? Want to grab coffee?",
	"I'm near your place anyway. Quick walk?",
	"You seem off today. Bubble tea?",
	"Free for a bit? Could use the company.",
	"Hey. You around? I could use a break too.",
	"Coffee? My treat.",
];

/**
 * Checks if the friend rescue should trigger.
 * Called after a failed task attempt.
 */
export function shouldTriggerFriendRescue(state: GameState): boolean {
	// Already used today
	if (state.friendRescueUsedToday) return false;

	// Not enough consecutive failures
	if (state.consecutiveFailures < FRIEND_RESCUE_THRESHOLD) return false;

	// Check if player can afford it (no point offering if they can't accept)
	if (!canAffordRescue(state)) return false;

	// Roll the dice
	return Math.random() < FRIEND_RESCUE_CHANCE;
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
 * Gets the effects of choosing an activity based on energy level.
 */
export function getActivityEffects(
	activity: Activity,
	energy: number,
): { momentum: number; energy: number } {
	if (isCorrectTier(activity, energy)) {
		return CORRECT_TIER_EFFECTS;
	}
	return WRONG_TIER_EFFECTS;
}

/**
 * Gets a random rescue message.
 */
export function getRandomRescueMessage(seed: number): string {
	const index = Math.abs(seed) % RESCUE_MESSAGES.length;
	return RESCUE_MESSAGES[index] as string;
}
