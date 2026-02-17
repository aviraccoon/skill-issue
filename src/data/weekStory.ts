/**
 * Week story generator.
 * Composes a multi-paragraph narrative about the player's week
 * based on what actually happened during the run.
 */

import { strings } from "../i18n";
import type { EventInstance, GameState, Task, TimeBlock } from "../state";
import type { Personality } from "../systems/personality";
import { pickVariant } from "../utils/random";
import { getEventRecap } from "./events";

/** Tone categories for the week. */
type WeekTone = "good" | "rough" | "survived";

/** Derived stats for narrative generation. */
interface WeekContext {
	tone: WeekTone;
	personality: Personality;
	successRate: number;
	// Task category outcomes
	dog: { walked: number; failed: number; total: number };
	food: { cooked: number; delivery: number; total: number };
	creative: { attempted: number; succeeded: number };
	hygiene: { succeeded: number; attempted: number };
	// Run stats
	phoneChecks: number;
	allNighters: number;
	friendRescues: { triggered: number; accepted: number };
	variantsUsed: string[];
	// Time patterns
	bestTimeBlock: TimeBlock | null;
	worstTimeBlock: TimeBlock | null;
}

/**
 * Generates a multi-paragraph story about the week.
 */
export function generateWeekStory(state: GameState): string {
	const ctx = buildContext(state);
	const seed = state.runSeed;

	const paragraphs: string[] = [];

	// 1. Opening - sets the tone
	paragraphs.push(getOpening(ctx, seed));

	// 2. The rhythm - how days felt, time patterns
	paragraphs.push(getRhythm(ctx, seed));

	// 3. The basics - dog, food, survival
	paragraphs.push(getBasics(ctx, seed));

	// 4. The week's events - things that happened around you
	const eventsParagraph = getEvents(state.events, seed);
	if (eventsParagraph) {
		paragraphs.push(eventsParagraph);
	}

	// 5. The attempts - creative, aspirational (only if attempted)
	if (ctx.creative.attempted > 0) {
		paragraphs.push(getAttempts(ctx, seed));
	}

	// 6. The help - phone, friend, what you leaned on
	paragraphs.push(getHelp(ctx, seed));

	// 7. Closing - what it means
	paragraphs.push(getClosing(ctx, seed));

	return paragraphs.join("\n\n");
}

function buildContext(state: GameState): WeekContext {
	const { tasks, runStats, personality } = state;

	// Calculate overall success rate
	const successRate =
		runStats.tasks.attempted > 0
			? runStats.tasks.succeeded / runStats.tasks.attempted
			: 0;

	// Determine tone
	const tone: WeekTone =
		successRate >= 0.5 ? "good" : successRate >= 0.3 ? "survived" : "rough";

	// Compute task category stats
	const dog = computeCategoryStats(tasks, "dog", ["walk-dog"]);
	const food = {
		cooked: tasks.find((t) => t.id === "cook")?.succeededToday ? 1 : 0,
		delivery: tasks.find((t) => t.id === "delivery")?.succeededToday ? 1 : 0,
		total:
			(tasks.find((t) => t.id === "cook")?.failureCount ?? 0) +
			(tasks.find((t) => t.id === "cook")?.succeededToday ? 1 : 0) +
			(tasks.find((t) => t.id === "delivery")?.failureCount ?? 0) +
			(tasks.find((t) => t.id === "delivery")?.succeededToday ? 1 : 0),
	};
	const creative = computeCategoryStats(tasks, "creative", ["practice-music"]);
	const hygiene = computeCategoryStats(tasks, "hygiene", [
		"shower",
		"brush-teeth-morning",
		"brush-teeth-evening",
	]);

	// Find best/worst time blocks
	let bestTimeBlock: TimeBlock | null = null;
	let worstTimeBlock: TimeBlock | null = null;
	let bestRate = -1;
	let worstRate = 2;

	const timeBlocks: TimeBlock[] = ["morning", "afternoon", "evening", "night"];
	for (const block of timeBlocks) {
		const blockStats = runStats.byTimeBlock[block];
		if (blockStats.attempted > 0) {
			const rate = blockStats.succeeded / blockStats.attempted;
			if (rate > bestRate) {
				bestRate = rate;
				bestTimeBlock = block;
			}
			if (rate < worstRate) {
				worstRate = rate;
				worstTimeBlock = block;
			}
		}
	}

	return {
		tone,
		personality,
		successRate,
		dog,
		food,
		creative,
		hygiene,
		phoneChecks: runStats.phoneChecks,
		allNighters: runStats.allNighters,
		friendRescues: runStats.friendRescues,
		variantsUsed: runStats.variantsUsed,
		bestTimeBlock,
		worstTimeBlock,
	};
}

function computeCategoryStats(
	tasks: Task[],
	_category: string,
	taskIds: string[],
): {
	walked: number;
	failed: number;
	total: number;
	attempted: number;
	succeeded: number;
} {
	let succeeded = 0;
	let failed = 0;

	for (const id of taskIds) {
		const task = tasks.find((t) => t.id === id);
		if (task) {
			if (task.succeededToday) succeeded++;
			failed += task.failureCount;
		}
	}

	return {
		walked: succeeded, // alias for dog
		failed,
		total: succeeded + failed,
		attempted: succeeded + failed,
		succeeded,
	};
}

/** Opening paragraph -- sets the tone based on overall success rate. */
function getOpening(ctx: WeekContext, seed: number): string {
	const s = strings();
	return pickVariant(s.weekStory.openings[ctx.tone], seed);
}

/** Rhythm paragraph -- time patterns, personality observations. */
function getRhythm(ctx: WeekContext, seed: number): string {
	const s = strings();
	const parts: string[] = [];

	// Time of day observation based on personality and actual performance
	if (ctx.personality.time === "nightOwl") {
		parts.push(pickVariant(s.weekStory.rhythm.nightOwl, seed));
	} else if (ctx.personality.time === "earlyBird") {
		parts.push(pickVariant(s.weekStory.rhythm.earlyBird, seed + 1));
	} else {
		parts.push(pickVariant(s.weekStory.rhythm.neutralTime, seed + 2));
	}

	// Best/worst time observation if notable
	if (
		ctx.bestTimeBlock &&
		ctx.worstTimeBlock &&
		ctx.bestTimeBlock !== ctx.worstTimeBlock
	) {
		const timeObs = pickVariant(
			s.weekStory.rhythm.timeBlockObservations,
			seed + 3,
		);
		parts.push(timeObs(ctx.bestTimeBlock, ctx.worstTimeBlock));
	}

	// All-nighter observation if any
	if (ctx.allNighters > 0) {
		parts.push(
			pickVariant(
				ctx.allNighters === 1
					? s.weekStory.rhythm.allNighterSingle
					: s.weekStory.rhythm.allNighterMultiple,
				seed + 4,
			),
		);
	}

	return parts.join(" ");
}

/** Basics paragraph -- dog, food, survival. */
function getBasics(ctx: WeekContext, seed: number): string {
	const s = strings();
	const parts: string[] = [];

	// Dog observation - failed is cumulative over week
	if (ctx.dog.total > 0) {
		if (ctx.dog.failed === 0) {
			parts.push(pickVariant(s.weekStory.basics.dogGood, seed));
		} else if (ctx.dog.failed <= 2) {
			parts.push(pickVariant(s.weekStory.basics.dogMixed, seed + 1));
		} else {
			parts.push(pickVariant(s.weekStory.basics.dogStruggled, seed + 2));
		}
	}

	// Food observation
	if (ctx.food.cooked > 0) {
		parts.push(pickVariant(s.weekStory.basics.foodCooked, seed + 3));
	} else if (ctx.food.delivery > 0) {
		parts.push(pickVariant(s.weekStory.basics.foodDelivery, seed + 4));
	} else if (ctx.food.total > 0) {
		parts.push(pickVariant(s.weekStory.basics.foodStruggled, seed + 5));
	}

	// Variants used observation
	if (ctx.variantsUsed.length > 0) {
		parts.push(pickVariant(s.weekStory.basics.variantsUsed, seed + 6));
	}

	// General survival wrap
	parts.push(pickVariant(s.weekStory.basics.survivalWrap[ctx.tone], seed + 7));

	return parts.join(" ");
}

/** Events paragraph -- resolved narrative events with recap text. */
function getEvents(events: EventInstance[], seed: number): string | null {
	const recaps: string[] = [];
	for (const event of events) {
		if (event.status !== "resolved") continue;
		const recap = getEventRecap(event.id, event.choiceId, seed + recaps.length);
		if (recap) recaps.push(recap);
	}
	if (recaps.length === 0) return null;
	return recaps.join(" ");
}

/** Attempts paragraph -- creative, aspirational tasks. */
function getAttempts(ctx: WeekContext, seed: number): string {
	const s = strings();
	if (ctx.creative.succeeded > 0) {
		return pickVariant(s.weekStory.attempts.creativeSucceeded, seed);
	}
	if (ctx.creative.attempted > 0) {
		return pickVariant(s.weekStory.attempts.creativeFailed, seed);
	}
	return "";
}

/** Help paragraph -- phone, friend, coping mechanisms. */
function getHelp(ctx: WeekContext, seed: number): string {
	const s = strings();
	const parts: string[] = [];

	// Phone observation
	if (ctx.phoneChecks > 15) {
		parts.push(pickVariant(s.weekStory.help.phoneHeavy, seed));
	} else if (ctx.phoneChecks > 5) {
		parts.push(pickVariant(s.weekStory.help.phoneModerate, seed + 1));
	} else if (ctx.phoneChecks > 0) {
		parts.push(pickVariant(s.weekStory.help.phoneLight, seed + 2));
	}

	// Friend observation
	if (ctx.friendRescues.triggered > 0) {
		if (ctx.friendRescues.accepted === ctx.friendRescues.triggered) {
			parts.push(pickVariant(s.weekStory.help.friendAcceptedAll, seed + 3));
		} else if (ctx.friendRescues.accepted > 0) {
			parts.push(pickVariant(s.weekStory.help.friendAcceptedSome, seed + 4));
		} else {
			parts.push(pickVariant(s.weekStory.help.friendDeclinedAll, seed + 5));
		}
	}

	// Social personality observation
	if (ctx.personality.social === "hermit" && ctx.friendRescues.accepted > 0) {
		parts.push(pickVariant(s.weekStory.help.hermitSocialCost, seed + 6));
	} else if (
		ctx.personality.social === "socialBattery" &&
		ctx.friendRescues.accepted > 0
	) {
		parts.push(pickVariant(s.weekStory.help.socialBatteryBoost, seed + 7));
	}

	// If nothing notable, add a neutral observation
	if (parts.length === 0) {
		parts.push(pickVariant(s.weekStory.help.neutral, seed + 8));
	}

	return parts.join(" ");
}

/** Closing paragraph -- what the week meant. */
function getClosing(ctx: WeekContext, seed: number): string {
	const s = strings();
	return pickVariant(s.weekStory.closings[ctx.tone], seed);
}
