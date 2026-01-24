/**
 * Scroll trap (Check Phone) outcome system.
 * Variable outcomes with different effects - usually harmful, occasionally helpful.
 */

import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import { nextRoll, seededVariation } from "../utils/random";
import { getTasksWithVariants, type TaskCategory } from "./tasks";

/** Phone check outcome tier. */
export type PhoneOutcome =
	| "void" // ~50% - The Void - nothing happened
	| "scrollHole" // ~20% - Scroll Hole - worse than usual
	| "actualBreak" // ~18% - Actual Break - accidentally helped
	| "somethingNice" // ~8%  - Something Nice - friend nudge + decent break
	| "usefulFind"; // ~4%  - Useful Find - variant unlock chance

/** Result of checking phone with variable outcomes. */
export interface PhoneCheckResult {
	outcome: PhoneOutcome;
	momentumChange: number;
	energyChange: number;
	flavorText: string;
	/** Variant category unlocked, if "Useful Find" triggered unlock. */
	unlocksVariant?: TaskCategory;
	/** Whether friend rescue nudge was applied (for "Something Nice"). */
	friendNudge: boolean;
}

/** Base weights for outcome tiers (total ~100). */
const BASE_WEIGHTS: Record<PhoneOutcome, number> = {
	void: 50,
	scrollHole: 20,
	actualBreak: 18,
	somethingNice: 8,
	usefulFind: 4,
};

/**
 * Gets adjusted outcome weights based on current state.
 * Low energy/momentum increases scroll hole chance.
 */
export function getAdjustedWeights(
	state: GameState,
): Record<PhoneOutcome, number> {
	// Start with base weights (copy to avoid mutating constant)
	const weights: Record<PhoneOutcome, number> = { ...BASE_WEIGHTS };

	// Low energy (< 0.3) → scroll hole more likely, actual break less likely
	if (state.energy < 0.3) {
		weights.scrollHole += 10;
		weights.actualBreak -= 5;
	}

	// Low momentum (< 0.3) → scroll hole more likely, void less likely
	if (state.momentum < 0.3) {
		weights.scrollHole += 8;
		weights.void -= 4;
	}

	// Late night → different distribution (easier to get sucked in)
	if (state.timeBlock === "night") {
		weights.scrollHole += 5;
		weights.actualBreak -= 3;
		weights.void -= 2;
	}

	// Ensure no negative weights
	for (const outcome of Object.keys(weights) as PhoneOutcome[]) {
		weights[outcome] = Math.max(weights[outcome], 1);
	}

	return weights;
}

/**
 * Selects a phone outcome using weighted random selection.
 * Deterministic given same seed and rollCount.
 */
export function selectPhoneOutcome(store: Store<GameState>): PhoneOutcome {
	const state = store.getState();
	const weights = getAdjustedWeights(state);

	const entries = Object.entries(weights) as [PhoneOutcome, number][];
	const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
	const roll = nextRoll(store) * totalWeight;

	let cumulative = 0;
	for (const [outcome, weight] of entries) {
		cumulative += weight;
		if (roll < cumulative) {
			return outcome;
		}
	}

	return "void"; // Fallback
}

// Salt for variant unlock chance
const SALT_VARIANT_UNLOCK_CHANCE = 4001;
const VARIANT_UNLOCK_CHANCE_BASE = 0.4; // 30-50% when eligible
const VARIANT_UNLOCK_CHANCE_VARIANCE = 0.1;

/**
 * Attempts to unlock a variant via phone ("Useful Find" outcome).
 * Conditions: 2+ failures on a task with variant, variant not already unlocked.
 * Returns category to unlock, or undefined if no unlock.
 */
export function tryUnlockVariantViaPhone(
	store: Store<GameState>,
): TaskCategory | undefined {
	const state = store.getState();

	// Find eligible categories (2+ failures on a task, variant not unlocked)
	const eligible: TaskCategory[] = [];

	for (const taskInfo of getTasksWithVariants()) {
		if (state.variantsUnlocked.includes(taskInfo.category)) continue;

		const task = state.tasks.find((t) => t.id === taskInfo.id);
		if (task && task.failureCount >= 2) {
			eligible.push(taskInfo.category);
		}
	}

	if (eligible.length === 0) return undefined;

	// Roll for unlock chance (30-50%, varies by seed)
	const chance = seededVariation(
		state.runSeed,
		VARIANT_UNLOCK_CHANCE_BASE,
		VARIANT_UNLOCK_CHANCE_VARIANCE,
		SALT_VARIANT_UNLOCK_CHANCE,
	);

	if (nextRoll(store) >= chance) return undefined;

	// Pick a category deterministically based on state
	const index = Math.floor(nextRoll(store) * eligible.length);
	return eligible[index];
}

/**
 * Gets flavor text for an outcome tier.
 * Uses rollCount for deterministic variety within the tier's message array.
 */
export function getOutcomeFlavorText(
	rollCount: number,
	outcome: PhoneOutcome,
): string {
	const s = strings();
	const messages = s.phoneOutcomes[outcome];
	return messages[rollCount % messages.length] as string;
}

/**
 * Legacy function for backward compatibility.
 * @deprecated Use getOutcomeFlavorText with outcome tier instead.
 */
export function getScrollTrapFlavor(index: number): string {
	// Fall back to void messages for legacy usage
	return getOutcomeFlavorText(index, "void");
}
