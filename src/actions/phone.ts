/**
 * Check Phone action - the scroll trap.
 * Variable outcomes: usually harmful, occasionally helpful.
 */

import {
	getOutcomeFlavorText,
	type PhoneCheckResult,
	selectPhoneOutcome,
	tryUnlockVariantViaPhone,
} from "../data/scrollTrap";
import type { GameState } from "../state";
import type { Store } from "../store";
import { getPhoneOutcomeEnergyEffect } from "../systems/energy";
import { getPhoneOutcomeMomentumEffect } from "../systems/momentum";

/** Bonus to friend rescue chance from "Something Nice" outcome. */
const FRIEND_NUDGE_BONUS = 0.05;

/**
 * Check phone action with variable outcomes.
 * Always "succeeds" (phone works). Costs no action slot.
 * Effects vary by outcome tier - usually harmful, occasionally helpful.
 */
export function checkPhone(store: Store<GameState>): PhoneCheckResult {
	const state = store.getState();

	// Select outcome based on state-weighted probabilities
	const outcome = selectPhoneOutcome(store);

	// Calculate tier-specific effects
	const momentumChange = getPhoneOutcomeMomentumEffect(state.runSeed, outcome);
	const energyChange = getPhoneOutcomeEnergyEffect(state.runSeed, outcome);

	// Apply effects
	store.update("momentum", (m) => Math.max(m + momentumChange, 0));
	store.update("energy", (e) => Math.max(0, Math.min(1, e + energyChange)));

	// Clear phone notification (player "checked" it)
	store.set("phoneNotificationCount", 0);

	// Track phone check in run stats
	store.update("runStats", (stats) => ({
		...stats,
		phoneChecks: stats.phoneChecks + 1,
	}));

	// Handle outcome-specific effects
	let unlocksVariant: PhoneCheckResult["unlocksVariant"];
	let friendNudge = false;

	if (outcome === "usefulFind") {
		// Attempt to unlock a variant
		unlocksVariant = tryUnlockVariantViaPhone(store);
		if (unlocksVariant) {
			const current = store.getState().variantsUnlocked;
			if (!current.includes(unlocksVariant)) {
				store.set("variantsUnlocked", [...current, unlocksVariant]);
			}
		}
	}

	if (outcome === "somethingNice") {
		// Nudge friend rescue probability
		friendNudge = true;
		store.update(
			"friendRescueChanceBonus",
			(b) => Math.min(b + FRIEND_NUDGE_BONUS, 0.5), // Cap at +50% total bonus
		);
	}

	// Get flavor text for this outcome
	const rollCountBefore = store.getState().rollCount;
	const flavorText = getOutcomeFlavorText(rollCountBefore, outcome);
	store.update("rollCount", (c) => c + 1);

	return {
		outcome,
		momentumChange,
		energyChange,
		flavorText,
		unlocksVariant,
		friendNudge,
	};
}
