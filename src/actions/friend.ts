import { getPatternHint } from "../data/friendRescue";
import { type GameState, isWeekend } from "../state";
import type { Store } from "../store";
import {
	type Activity,
	getActivityEffects,
	getRescueCost,
	isCorrectTier,
} from "../systems/friend";
import { clamp } from "../utils/math";

/**
 * Result of accepting a friend rescue.
 */
export interface AcceptRescueResult {
	/** Whether the player chose the correct activity tier for their energy. */
	correct: boolean;
	/** Momentum change applied. */
	momentumChange: number;
	/** Energy change applied. */
	energyChange: number;
	/** Pattern hint from the friend. */
	hint: string;
}

/**
 * Accepts the friend rescue with a chosen activity.
 * Updates state and returns the result for UI or logging.
 */
export function acceptFriendRescue(
	store: Store<GameState>,
	activity: Activity,
): AcceptRescueResult {
	const state = store.getState();
	const effects = getActivityEffects(activity, state);
	const correct = isCorrectTier(activity, state.energy);

	// Get pattern hint BEFORE applying effects - variant unlock bonuses
	// depend on low energy/momentum which rescue is about to fix
	const hintResult = getPatternHint(state);

	// Apply effects
	store.update("momentum", (m) => clamp(m + effects.momentum, 0, 1));
	store.update("energy", (e) => clamp(e + effects.energy, 0, 1));

	// Consume cost
	if (isWeekend(state)) {
		store.update("weekendPointsRemaining", (p) => p - getRescueCost(state));
	} else {
		store.update("slotsRemaining", (s) => s - getRescueCost(state));
	}

	// Mark rescue as used today
	store.set("friendRescueUsedToday", true);

	// Reset consecutive failures
	store.set("consecutiveFailures", 0);

	// Track friend rescue acceptance in run stats
	store.update("runStats", (stats) => ({
		...stats,
		friendRescues: {
			...stats.friendRescues,
			accepted: stats.friendRescues.accepted + 1,
		},
	}));

	// Unlock variant category if the hint unlocks one
	if (hintResult.unlocksVariant) {
		const currentUnlocked = store.getState().variantsUnlocked;
		if (!currentUnlocked.includes(hintResult.unlocksVariant)) {
			store.set("variantsUnlocked", [
				...currentUnlocked,
				hintResult.unlocksVariant,
			]);
		}
	}

	return {
		correct,
		momentumChange: effects.momentum,
		energyChange: effects.energy,
		hint: hintResult.hint,
	};
}

/**
 * Declines the friend rescue.
 * The friend checked in, which counts for something - resets consecutive failures.
 */
export function declineFriendRescue(store: Store<GameState>): void {
	// Reset consecutive failures (friend checked in, that counts for something)
	store.set("consecutiveFailures", 0);

	// Mark as used today (they won't ask again)
	store.set("friendRescueUsedToday", true);
}

/**
 * Re-export activity types and functions.
 */
export {
	ACTIVITIES,
	type Activity,
	type ActivityTier,
	getLocalizedActivities,
} from "../systems/friend";
