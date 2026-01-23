/**
 * Friend rescue text content.
 * Includes phone buzz hints, rescue messages, and pattern hint variants.
 */

import type { GameState } from "../state";

/**
 * Phone buzz texts shown at 2 consecutive failures.
 * Building anticipation before rescue can trigger.
 */
export const PHONE_BUZZ_TEXTS = [
	"Your phone buzzes. You don't check it.",
	"A notification. You ignore it.",
	"Your phone lights up briefly.",
	"Something buzzes in your pocket.",
	"The phone vibrates against the table.",
	"A message comes in. You'll look later.",
	"Your phone chirps. Not now.",
];

/**
 * Follow-up texts when 3+ failures but rescue doesn't trigger.
 * The friend tried, you didn't answer.
 */
export const PHONE_IGNORED_TEXTS = [
	"Another buzz. You let it go.",
	"The phone again. Not now.",
	"It buzzes again. Whatever.",
	"Another notification. You're busy failing.",
	"Your phone gives up and goes quiet.",
	"One more buzz. You know who it is.",
];

/**
 * Rescue result messages when activity tier was right for energy level.
 */
export const RESCUE_RESULT_CORRECT = [
	"That was good. You feel better.",
	"That helped. You needed that.",
	"Better. Not fixed, but better.",
	"You feel a bit lighter now.",
	"That was the right call.",
];

/**
 * Rescue result messages when activity tier was too high for energy level.
 */
export const RESCUE_RESULT_INCORRECT = [
	"You pushed yourself a bit too much. Still, you saw your friend.",
	"That took more out of you than expected. Worth it, though.",
	"A little much for today. But you showed up.",
	"Exhausting. But you made it happen.",
];

/**
 * Gets a rescue result message based on tier correctness.
 * Uses seeded selection for variety within a run.
 */
export function getRescueResultMessage(
	state: GameState,
	correct: boolean,
): string {
	const messages = correct ? RESCUE_RESULT_CORRECT : RESCUE_RESULT_INCORRECT;
	const index =
		Math.abs(state.runSeed + state.dayIndex * 23 + state.rollCount * 7) %
		messages.length;
	return messages[index] as string;
}

/**
 * Messages the friend sends when rescue triggers.
 */
export const RESCUE_MESSAGES = [
	"Hey, you doing okay? Want to grab coffee?",
	"I'm near your place anyway. Quick walk?",
	"You seem off today. Bubble tea?",
	"Free for a bit? Could use the company.",
	"Hey. You around? I could use a break too.",
	"Coffee? My treat.",
	"What are you up to? Feel like getting out?",
	"I'm bored. Save me from my apartment?",
	"You've been quiet. Everything okay?",
	"Hey. Just checking in. Want to hang?",
	"I found this place I want to try. Come with?",
	"Need an excuse to leave the house. You in?",
];

// --- Pattern Hints ---

import { type TaskCategory, tasksWithVariants } from "./tasks";

/**
 * Pattern hint with multiple message variants.
 */
export interface PatternHintGroup {
	/** Condition that must be true for this hint to apply (deterministic, no probability). */
	condition: (state: GameState) => boolean;
	/** Possible messages - one selected via seeded random. */
	messages: string[];
	/** Weight for selection. Higher = more likely to be picked. Can be number or function of state. */
	weight: number | ((state: GameState) => number);
	/** If set, unlocks variants for this category when hint fires. */
	unlocksVariant?: TaskCategory;
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
	messages: [
		"You always come alive after dark. That's not a flaw.",
		"Hey, have you noticed you get more done late? Just something I've picked up.",
		"Night person, huh? Nothing wrong with that.",
		"You're different at night. More... you.",
	],
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
	messages: [
		"Mornings aren't your thing, are they? That's okay.",
		"You're not a morning person. Stop fighting it.",
		"Maybe save the hard stuff for later? Just a thought.",
	],
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
	messages: [
		"You're always sharper in the morning. Use it.",
		"Morning person, right? Get the hard stuff done early.",
		"You've got that morning energy. Don't waste it on easy stuff.",
	],
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
	messages: [
		"It's late. Maybe call it a day?",
		"You're running on fumes. Tomorrow's a fresh start.",
		"Nothing good happens this late for you. Get some sleep.",
	],
	weight: PERSONALITY_WEIGHT,
};

/**
 * Hermit after social interaction (acknowledging the cost).
 */
export const HERMIT_SOCIAL_COST: PatternHintGroup = {
	condition: (state) => state.personality.social === "hermit",
	messages: [
		"I know hanging out takes something out of you. Thanks for making time.",
		"I get that this costs you energy. Appreciate you doing it anyway.",
		"You need your alone time after this. That's fine.",
		"Thanks for coming out. I know it's not nothing for you.",
	],
	weight: PERSONALITY_WEIGHT,
};

/**
 * Social battery after social interaction (recognizing the boost).
 */
export const SOCIAL_BATTERY_BOOST: PatternHintGroup = {
	condition: (state) => state.personality.social === "socialBattery",
	messages: [
		"You seem better after we hang out. We should do this more.",
		"See? This is good for you. Don't isolate yourself.",
		"You light up when you're around people. Remember that.",
		"This helps you, doesn't it? Being around someone.",
	],
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
	messages: [
		"That creative stuff... maybe it doesn't have to be the full thing every time?",
		"What if you just touched the instrument? Just held it for a minute?",
		"The big creative projects... they're hard. That's not you failing.",
		"Maybe the bar is too high on that one. What's the smallest version?",
	],
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
	messages: [
		"The dog walk helps, doesn't it? Gets you moving.",
		"Azor gets you out of the house. That matters.",
		"The dog doesn't judge. He's just happy you showed up.",
		"Walking the dog... that's your reliable one. Lean on it.",
	],
	weight: STATE_WEIGHT,
};

/**
 * Low energy - be gentle.
 */
export const LOW_ENERGY: PatternHintGroup = {
	condition: (state) => state.energy < 0.3,
	messages: [
		"You seem really wiped. Be gentle with yourself.",
		"You're running low. Small stuff only.",
		"Today's rough, huh? That's okay. It happens.",
		"Not every day is a good day. This is one of those.",
	],
	weight: STATE_WEIGHT,
};

/**
 * High momentum - ride it.
 */
export const HIGH_MOMENTUM: PatternHintGroup = {
	condition: (state) => state.momentum > 0.7,
	messages: [
		"You're on a bit of a roll. Ride it.",
		"Things are clicking right now. Don't overthink it.",
		"Good momentum. Do the next thing while you've got it.",
	],
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
	messages: [
		"The body stuff... it's hard when everything else is hard too.",
		"Teeth, shower, whatever. Tomorrow's another chance.",
		"Basic stuff isn't basic when your brain won't cooperate.",
	],
	weight: STATE_WEIGHT,
};

/**
 * Multiple consecutive failures - general struggle.
 */
const GENERAL_STRUGGLE: PatternHintGroup = {
	condition: (state) => state.consecutiveFailures >= 2,
	messages: [
		"It's one of those stretches. They pass.",
		"Nothing's landing right now. That happens.",
		"Rough patch. Not your fault.",
	],
	weight: STATE_WEIGHT,
};

/**
 * Fallback hints when nothing specific matches.
 */
export const FALLBACK_HINTS = [
	"That was nice. You seem a bit better.",
	"Good to see you. Take care of yourself.",
	"This helped. Let's do it again sometime.",
	"You're doing okay. Even when it doesn't feel like it.",
	"One thing at a time. You've got this.",
];

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
	const index =
		Math.abs(state.runSeed + state.rollCount * 7) % PHONE_BUZZ_TEXTS.length;
	return PHONE_BUZZ_TEXTS[index] as string;
}

/**
 * Gets a phone ignored text using seeded selection.
 */
export function getPhoneIgnoredText(state: GameState): string {
	const index =
		Math.abs(state.runSeed + state.rollCount * 11) % PHONE_IGNORED_TEXTS.length;
	return PHONE_IGNORED_TEXTS[index] as string;
}

/**
 * Gets a rescue message using seeded selection.
 * Uses day and failure count to vary within a run.
 */
export function getRandomRescueMessage(state: GameState): string {
	const combined =
		state.runSeed + state.dayIndex * 100 + state.consecutiveFailures * 17;
	const index = Math.abs(combined) % RESCUE_MESSAGES.length;
	return RESCUE_MESSAGES[index] as string;
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
		const fallbackIndex =
			Math.abs(state.runSeed + state.dayIndex) % FALLBACK_HINTS.length;
		return { hint: FALLBACK_HINTS[fallbackIndex] as string };
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
		const fallbackIndex =
			Math.abs(state.runSeed + state.dayIndex) % FALLBACK_HINTS.length;
		return { hint: FALLBACK_HINTS[fallbackIndex] as string };
	}

	const messageIndex =
		Math.abs(state.runSeed + state.dayIndex * 13) % group.messages.length;
	return {
		hint: group.messages[messageIndex] as string,
		unlocksVariant: group.unlocksVariant,
	};
}
