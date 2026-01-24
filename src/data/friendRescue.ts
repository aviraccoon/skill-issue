/**
 * Friend rescue text content.
 * Includes phone buzz hints, rescue messages, and pattern hint variants.
 */

import { strings } from "../i18n";
import type { GameState } from "../state";
import { pickVariant } from "../utils/random";

/**
 * Gets a rescue result message based on tier correctness.
 * Uses seeded selection for variety within a run.
 */
export function getRescueResultMessage(
	state: GameState,
	correct: boolean,
): string {
	const s = strings();
	const messages = correct
		? s.friend.rescueResultCorrect
		: s.friend.rescueResultIncorrect;
	const index =
		Math.abs(state.runSeed + state.dayIndex * 23 + state.rollCount * 7) %
		messages.length;
	return messages[index] as string;
}

// --- Pattern Hints ---

import { type TaskCategory, tasksWithVariants } from "./tasks";

/**
 * Pattern hint with multiple message variants.
 */
export interface PatternHintGroup {
	/** Condition that must be true for this hint to apply (deterministic, no probability). */
	condition: (state: GameState) => boolean;
	/** Possible messages - can be array or function returning array (for i18n). */
	messages: readonly string[] | (() => readonly string[]);
	/** Weight for selection. Higher = more likely to be picked. Can be number or function of state. */
	weight: number | ((state: GameState) => number);
	/** If set, unlocks variants for this category when hint fires. */
	unlocksVariant?: TaskCategory;
}

/**
 * Resolves messages from either array or function.
 */
function resolveMessages(
	messages: readonly string[] | (() => readonly string[]),
): readonly string[] {
	return typeof messages === "function" ? messages() : messages;
}

// --- Variant Unlock Hints ---
// Generated from task definitions. Weight increases with failures.

/**
 * Calculates the weight for a variant unlock hint.
 * Higher weight = more likely to be selected.
 * Returns 0 if already unlocked or no failures.
 */
function getVariantUnlockWeight(
	state: GameState,
	taskId: string,
	category: TaskCategory,
): number {
	// Already unlocked - not eligible
	if (state.variantsUnlocked.includes(category)) {
		return 0;
	}

	const task = state.tasks.find((t) => t.id === taskId);
	if (!task || task.failureCount === 0) {
		return 0;
	}

	// Base weight varies slightly by seed (3-6)
	const baseWeight = 3 + (state.runSeed % 4);

	// Per-failure bonus (3-5 per failure, varies by seed)
	const failureBonus = task.failureCount * (3 + ((state.runSeed >> 8) % 3));

	// Low energy/momentum bonuses (+3 each when < 40%)
	const energyBonus = state.energy < 0.4 ? 3 : 0;
	const momentumBonus = state.momentum < 0.4 ? 3 : 0;

	return baseWeight + failureBonus + energyBonus + momentumBonus;
}

/**
 * Variant unlock hint groups generated from task definitions.
 * Weight increases with failure count, making them more likely when struggling.
 */
const VARIANT_UNLOCK_HINTS: PatternHintGroup[] = tasksWithVariants.map(
	(task) => ({
		condition: (state: GameState) =>
			!state.variantsUnlocked.includes(task.category) &&
			(state.tasks.find((t) => t.id === task.id)?.failureCount ?? 0) > 0,
		messages: task.minimalVariant.unlockHints,
		weight: (state: GameState) =>
			getVariantUnlockWeight(state, task.id, task.category),
		unlocksVariant: task.category,
	}),
);

// --- Personality Hints ---
// Fixed weight, compete with other hints via weighted random.

/** Weight for personality hints. */
const PERSONALITY_WEIGHT = 10;

/**
 * Night owl doing well at night.
 */
export const NIGHT_OWL_THRIVING: PatternHintGroup = {
	condition: (state) =>
		state.personality.time === "nightOwl" &&
		state.timeBlock === "night" &&
		state.momentum > 0.5,
	messages: () => strings().hints.nightOwlThriving,
	weight: PERSONALITY_WEIGHT,
};

/**
 * Night owl struggling in morning.
 */
const NIGHT_OWL_MORNING: PatternHintGroup = {
	condition: (state) =>
		state.personality.time === "nightOwl" &&
		state.timeBlock === "morning" &&
		state.energy < 0.4,
	messages: () => strings().hints.nightOwlMorning,
	weight: PERSONALITY_WEIGHT,
};

/**
 * Early bird doing well in morning.
 */
export const EARLY_BIRD_THRIVING: PatternHintGroup = {
	condition: (state) =>
		state.personality.time === "earlyBird" &&
		state.timeBlock === "morning" &&
		state.momentum > 0.5,
	messages: () => strings().hints.earlyBirdThriving,
	weight: PERSONALITY_WEIGHT,
};

/**
 * Early bird struggling at night.
 */
const EARLY_BIRD_NIGHT: PatternHintGroup = {
	condition: (state) =>
		state.personality.time === "earlyBird" &&
		state.timeBlock === "night" &&
		state.energy < 0.4,
	messages: () => strings().hints.earlyBirdNight,
	weight: PERSONALITY_WEIGHT,
};

/**
 * Hermit after social interaction (acknowledging the cost).
 */
export const HERMIT_SOCIAL_COST: PatternHintGroup = {
	condition: (state) => state.personality.social === "hermit",
	messages: () => strings().hints.hermitSocialCost,
	weight: PERSONALITY_WEIGHT,
};

/**
 * Social battery after social interaction (recognizing the boost).
 */
export const SOCIAL_BATTERY_BOOST: PatternHintGroup = {
	condition: (state) => state.personality.social === "socialBattery",
	messages: () => strings().hints.socialBatteryBoost,
	weight: PERSONALITY_WEIGHT,
};

// --- State Hints ---
// Lower weight than personality, but always in the pool when conditions match.

/** Weight for general state hints. */
const STATE_WEIGHT = 6;

/**
 * Creative tasks failing a lot.
 */
export const CREATIVE_STRUGGLING: PatternHintGroup = {
	condition: (state) => {
		const creative = state.tasks.find((t) => t.category === "creative");
		return creative !== undefined && creative.failureCount >= 4;
	},
	messages: () => strings().hints.creativeStruggling,
	weight: STATE_WEIGHT,
};

/**
 * Dog walk succeeded - it's an anchor.
 */
export const DOG_ANCHOR: PatternHintGroup = {
	condition: (state) => {
		const walk = state.tasks.find((t) => t.id === "walk-dog");
		return walk?.succeededToday === true;
	},
	messages: () => strings().hints.dogAnchor,
	weight: STATE_WEIGHT,
};

/**
 * Low energy - be gentle.
 */
export const LOW_ENERGY: PatternHintGroup = {
	condition: (state) => state.energy < 0.3,
	messages: () => strings().hints.lowEnergy,
	weight: STATE_WEIGHT,
};

/**
 * High momentum - ride it.
 */
export const HIGH_MOMENTUM: PatternHintGroup = {
	condition: (state) => state.momentum > 0.7,
	messages: () => strings().hints.highMomentum,
	weight: STATE_WEIGHT,
};

/**
 * Hygiene tasks piling up.
 */
const HYGIENE_STRUGGLING: PatternHintGroup = {
	condition: (state) => {
		const hygiene = state.tasks.filter((t) => t.category === "hygiene");
		const totalFailures = hygiene.reduce((sum, t) => sum + t.failureCount, 0);
		return totalFailures >= 5;
	},
	messages: () => strings().hints.hygieneStruggling,
	weight: STATE_WEIGHT,
};

/**
 * Multiple consecutive failures - general struggle.
 */
const GENERAL_STRUGGLE: PatternHintGroup = {
	condition: (state) => state.consecutiveFailures >= 2,
	messages: () => strings().hints.generalStruggle,
	weight: STATE_WEIGHT,
};

/**
 * All pattern hint groups.
 * Selection is via weighted random - no priority ordering.
 */
export const PATTERN_HINT_GROUPS: PatternHintGroup[] = [
	...VARIANT_UNLOCK_HINTS,
	NIGHT_OWL_THRIVING,
	NIGHT_OWL_MORNING,
	EARLY_BIRD_THRIVING,
	EARLY_BIRD_NIGHT,
	HERMIT_SOCIAL_COST,
	SOCIAL_BATTERY_BOOST,
	CREATIVE_STRUGGLING,
	LOW_ENERGY,
	HYGIENE_STRUGGLING,
	DOG_ANCHOR,
	HIGH_MOMENTUM,
	GENERAL_STRUGGLE,
];

/**
 * Gets a phone buzz text using seeded selection.
 */
export function getPhoneBuzzText(state: GameState): string {
	const seed = Math.abs(state.runSeed + state.rollCount * 7);
	return pickVariant(strings().friend.phoneBuzz, seed);
}

/**
 * Gets a phone ignored text using seeded selection.
 */
export function getPhoneIgnoredText(state: GameState): string {
	const seed = Math.abs(state.runSeed + state.rollCount * 11);
	return pickVariant(strings().friend.phoneIgnored, seed);
}

/**
 * Gets a rescue message using seeded selection.
 * Uses day and failure count to vary within a run.
 */
export function getRandomRescueMessage(state: GameState): string {
	const seed = Math.abs(
		state.runSeed + state.dayIndex * 100 + state.consecutiveFailures * 17,
	);
	return pickVariant(strings().friend.rescueMessages, seed);
}

/**
 * Result of getting a pattern hint.
 */
export interface PatternHintResult {
	/** The hint message to display. */
	hint: string;
	/** Category to unlock variants for, if this hint unlocks one. */
	unlocksVariant?: TaskCategory;
}

/**
 * Resolves a weight value (can be number or function).
 */
function resolveWeight(
	weight: number | ((state: GameState) => number),
	state: GameState,
): number {
	return typeof weight === "function" ? weight(state) : weight;
}

/**
 * Gets a pattern hint based on game state.
 * Uses weighted random selection from all matching hints.
 */
export function getPatternHint(state: GameState): PatternHintResult {
	const s = strings();

	// Collect all matching hints with their weights
	const candidates: { group: PatternHintGroup; weight: number }[] = [];

	for (const group of PATTERN_HINT_GROUPS) {
		if (group.condition(state)) {
			const weight = resolveWeight(group.weight, state);
			if (weight > 0) {
				candidates.push({ group, weight });
			}
		}
	}

	// If no candidates, use fallback
	if (candidates.length === 0) {
		const seed = Math.abs(state.runSeed + state.dayIndex);
		return { hint: pickVariant(s.hints.fallback, seed) };
	}

	// Weighted random selection
	const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
	const roll =
		((state.runSeed + state.dayIndex * 47 + state.rollCount * 19) % 1000) /
		1000;
	let threshold = roll * totalWeight;

	let selected = candidates[0];
	for (const candidate of candidates) {
		threshold -= candidate.weight;
		if (threshold <= 0) {
			selected = candidate;
			break;
		}
	}

	// Select message from the chosen group
	const group = selected?.group;
	if (!group) {
		const seed = Math.abs(state.runSeed + state.dayIndex);
		return { hint: pickVariant(s.hints.fallback, seed) };
	}

	const messages = resolveMessages(group.messages);
	const seed = Math.abs(state.runSeed + state.dayIndex * 13);
	const hint = messages[seed % messages.length] ?? messages[0] ?? "";
	return {
		hint,
		unlocksVariant: group.unlocksVariant,
	};
}
