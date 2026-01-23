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

/**
 * Pattern hint with multiple message variants.
 */
export interface PatternHintGroup {
	/** Condition that must be true for this hint to apply. */
	condition: (state: GameState) => boolean;
	/** Possible messages - one selected via seeded random. */
	messages: string[];
	/** Optional priority (lower = checked first). Default 50. */
	priority?: number;
}

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
	priority: 10,
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
	priority: 15,
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
	priority: 10,
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
	priority: 15,
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
	priority: 20,
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
	priority: 20,
};

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
	priority: 30,
};

/**
 * Cooking failing repeatedly.
 */
export const COOKING_STRUGGLING: PatternHintGroup = {
	condition: (state) => {
		const cook = state.tasks.find((t) => t.id === "cook");
		return cook !== undefined && cook.failureCount >= 3;
	},
	messages: [
		"Ordering food still counts as feeding yourself. You know that, right?",
		"The cooking thing... it's okay to just eat. Food is food.",
		"What if eating was just eating? Not a whole production?",
		"Microwave counts. Takeout counts. You eating counts.",
	],
	priority: 30,
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
	priority: 40,
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
	priority: 35,
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
	priority: 40,
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
	priority: 35,
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
	priority: 45,
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
 * All pattern hint groups, in priority order.
 * Lower priority = checked first.
 */
export const PATTERN_HINT_GROUPS: PatternHintGroup[] = [
	NIGHT_OWL_THRIVING,
	NIGHT_OWL_MORNING,
	EARLY_BIRD_THRIVING,
	EARLY_BIRD_NIGHT,
	HERMIT_SOCIAL_COST,
	SOCIAL_BATTERY_BOOST,
	CREATIVE_STRUGGLING,
	COOKING_STRUGGLING,
	LOW_ENERGY,
	HYGIENE_STRUGGLING,
	DOG_ANCHOR,
	HIGH_MOMENTUM,
	GENERAL_STRUGGLE,
].sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));

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
 * Gets a pattern hint based on game state.
 * Returns first matching group's message, or fallback.
 */
export function getPatternHint(state: GameState): string {
	for (const group of PATTERN_HINT_GROUPS) {
		if (group.condition(state)) {
			const index =
				Math.abs(state.runSeed + state.dayIndex * 13) % group.messages.length;
			return group.messages[index] as string;
		}
	}

	// Fallback
	const fallbackIndex =
		Math.abs(state.runSeed + state.dayIndex) % FALLBACK_HINTS.length;
	return FALLBACK_HINTS[fallbackIndex] as string;
}
