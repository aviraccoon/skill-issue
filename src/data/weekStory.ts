/**
 * Week story generator.
 * Composes a multi-paragraph narrative about the player's week
 * based on what actually happened during the run.
 *
 * Structure: Opening -> Rhythm -> [Category paragraphs by weight] -> Coping -> Closing.
 * Categories only appear if they have notable content (events or stat observations).
 * Events are woven into their category paragraphs, not listed separately.
 */

import { strings } from "../i18n";
import type { EventInstance, GameState, TimeBlock } from "../state";
import type { Personality } from "../systems/personality";
import type { NonEmptyArray } from "../utils/random";
import { pickVariant } from "../utils/random";
import {
	EVENT_MAGNITUDE,
	type EventDefinition,
	type EventEffects,
	getEventDefinition,
	getEventRecap,
	type StoryCategory,
} from "./events";

// --- Types ---

/** Tone categories for the week. */
type WeekTone = "good" | "rough" | "survived";

/** A resolved event with its recap text and focal weight. */
interface ResolvedEvent {
	instance: EventInstance;
	definition: EventDefinition;
	recap: string | null;
	focalWeight: number;
	category: StoryCategory | null;
}

/** Week-long stats for a task category. */
interface TaskStats {
	succeeded: number;
	failed: number;
	attempted: number;
}

/** Enriched context for narrative generation. */
interface WeekContext {
	tone: WeekTone;
	personality: Personality;
	successRate: number;
	seed: number;

	// Per-category task stats (week-long, not just today)
	dog: TaskStats;
	food: TaskStats & { cookSucceeded: number; deliverySucceeded: number };
	creative: TaskStats;
	hygiene: TaskStats;
	chores: TaskStats;

	// Run stats
	phoneChecks: number;
	allNighters: number;
	friendRescues: { triggered: number; accepted: number };
	variantsUsed: string[];

	// Time patterns
	bestTimeBlock: TimeBlock | null;
	worstTimeBlock: TimeBlock | null;

	// Event analysis
	resolvedEvents: ResolvedEvent[];
	/** Top 1-2 events by narrative weight. */
	focalPoints: ResolvedEvent[];
	eventsByCategory: Map<StoryCategory, ResolvedEvent[]>;

	// Derived flags for event-aware observations
	/** Whether friend-visits or neighbor-hello modified cooking (recap already mentions it). */
	hasContextualCook: boolean;
	/** Whether azor-recovered fired (positive arc resolution). */
	hasAzorRecovery: boolean;
	/** Set of resolved event IDs for quick lookup. */
	resolvedIds: Set<string>;
	/** Set of choice IDs made for major events (eventId:choiceId). */
	choicesMade: Set<string>;
	/** Tasks in the pool that were never attempted. */
	untouchedCategories: Set<string>;
}

// --- Helpers ---

/** Gets the effects that actually applied for a resolved event. */
function getResolvedEffects(
	event: EventInstance,
	def: EventDefinition,
): EventEffects | undefined {
	if (def.type === "major" && event.choiceId) {
		return def.choices?.find((c) => c.id === event.choiceId)?.effects;
	}
	return def.effects;
}

/** Computes narrative weight for focal point ranking. */
function computeFocalWeight(
	event: EventInstance,
	def: EventDefinition,
): number {
	const effects = getResolvedEffects(event, def);
	if (!effects) return 0;

	const maxMag = Math.max(
		Math.abs(effects.energy ?? 0),
		Math.abs(effects.momentum ?? 0),
	);

	// Base weight: SEVERE 0.2 -> 100, MAJOR 0.15 -> 75, MODERATE 0.1 -> 50, etc.
	let weight = Math.round(maxMag * 500);

	// skipCurrentBlock is narratively dramatic
	if (effects.skipCurrentBlock) weight += 20;

	// Player agency (major choices) matters narratively
	if (def.type === "major") weight += 10;

	return weight;
}

/** Computes week-long stats for tasks in a category. */
function categoryTaskStats(
	tasks: GameState["tasks"],
	category: string,
): TaskStats {
	let succeeded = 0;
	let failed = 0;
	for (const task of tasks) {
		if (task.category === category) {
			succeeded += task.successCount;
			failed += task.failureCount;
		}
	}
	return { succeeded, failed, attempted: succeeded + failed };
}

// --- Context Building ---

/** Computes tone, modified by event severity. */
function computeTone(
	successRate: number,
	resolvedEvents: ResolvedEvent[],
): WeekTone {
	// 0 = rough, 1 = survived, 2 = good
	let toneIndex = successRate >= 0.5 ? 2 : successRate >= 0.3 ? 1 : 0;

	for (const event of resolvedEvents) {
		const effects = getResolvedEffects(event.instance, event.definition);
		if (!effects) continue;

		const maxNeg = Math.max(
			Math.abs(Math.min(effects.energy ?? 0, 0)),
			Math.abs(Math.min(effects.momentum ?? 0, 0)),
		);
		const maxPos = Math.max(effects.energy ?? 0, effects.momentum ?? 0);

		// SEVERE negative consequences push tone down one tier
		if (maxNeg >= EVENT_MAGNITUDE.SEVERE) {
			toneIndex = Math.max(0, toneIndex - 1);
		}

		// Major positive effects push tone up near boundaries
		if (maxPos >= EVENT_MAGNITUDE.MAJOR) {
			const nearBoundary =
				(successRate >= 0.4 && successRate < 0.5) ||
				(successRate >= 0.2 && successRate < 0.3);
			if (nearBoundary) {
				toneIndex = Math.min(2, toneIndex + 1);
			}
		}
	}

	const tones: WeekTone[] = ["rough", "survived", "good"];
	return tones[toneIndex] ?? "survived";
}

function buildContext(state: GameState): WeekContext {
	const { tasks, runStats, personality } = state;
	const seed = state.runSeed;

	const successRate =
		runStats.tasks.attempted > 0
			? runStats.tasks.succeeded / runStats.tasks.attempted
			: 0;

	// Category task stats (week-long via successCount/failureCount)
	const dog = categoryTaskStats(tasks, "dog");
	const foodBase = categoryTaskStats(tasks, "food");
	const cookTask = tasks.find((t) => t.id === "cook");
	const deliveryTask = tasks.find((t) => t.id === "delivery");
	const food = {
		...foodBase,
		cookSucceeded: cookTask?.successCount ?? 0,
		deliverySucceeded: deliveryTask?.successCount ?? 0,
	};
	const creative = categoryTaskStats(tasks, "creative");
	const hygiene = categoryTaskStats(tasks, "hygiene");
	const chores = categoryTaskStats(tasks, "chores");

	// Best/worst time blocks
	let bestTimeBlock: TimeBlock | null = null;
	let worstTimeBlock: TimeBlock | null = null;
	let bestRate = -1;
	let worstRate = 2;
	const timeBlockKeys: TimeBlock[] = [
		"morning",
		"afternoon",
		"evening",
		"night",
	];
	for (const block of timeBlockKeys) {
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

	// Resolve events: recap, focal weight, category
	const resolvedEvents: ResolvedEvent[] = [];
	for (const instance of state.events) {
		if (instance.status !== "resolved") continue;
		const def = getEventDefinition(instance.id);
		if (!def) continue;

		const recap = getEventRecap(
			instance.id,
			instance.choiceId,
			seed,
			instance.taskModificationResult,
		);
		const focalWeight = computeFocalWeight(instance, def);
		const category = def.storyCategory ?? null;

		resolvedEvents.push({
			instance,
			definition: def,
			recap,
			focalWeight,
			category,
		});
	}

	// Focal points: top 1-2 by weight, minimum MODERATE threshold
	const FOCAL_THRESHOLD = 50; // MODERATE (0.1 * 500 = 50)
	const focalPoints = resolvedEvents
		.filter((e) => e.focalWeight >= FOCAL_THRESHOLD)
		.sort((a, b) => b.focalWeight - a.focalWeight)
		.slice(0, 2);

	// Group events by category
	const eventsByCategory = new Map<StoryCategory, ResolvedEvent[]>();
	for (const event of resolvedEvents) {
		if (!event.category) continue;
		const list = eventsByCategory.get(event.category) ?? [];
		list.push(event);
		eventsByCategory.set(event.category, list);
	}

	const tone = computeTone(successRate, resolvedEvents);

	// Derived flags
	const resolvedIds = new Set(resolvedEvents.map((e) => e.instance.id));
	const hasContextualCook =
		resolvedIds.has("friend-visits") || resolvedIds.has("neighbor-hello");
	const hasAzorRecovery = resolvedIds.has("azor-recovered");

	// Choices made (for curiosity observations about player decisions)
	const choicesMade = new Set<string>();
	for (const event of resolvedEvents) {
		if (event.instance.choiceId) {
			choicesMade.add(`${event.instance.id}:${event.instance.choiceId}`);
		}
	}

	// Task categories with zero attempts (in pool but untouched)
	const attemptedCategories = new Set<string>();
	const poolCategories = new Set<string>();
	for (const task of tasks) {
		if (task.isObligation) continue; // skip obligation tasks
		poolCategories.add(task.category);
		if (task.successCount + task.failureCount > 0) {
			attemptedCategories.add(task.category);
		}
	}
	const untouchedCategories = new Set<string>();
	for (const cat of poolCategories) {
		if (!attemptedCategories.has(cat)) untouchedCategories.add(cat);
	}

	return {
		tone,
		personality,
		successRate,
		seed,
		dog,
		food,
		creative,
		hygiene,
		chores,
		phoneChecks: runStats.phoneChecks,
		allNighters: runStats.allNighters,
		friendRescues: runStats.friendRescues,
		variantsUsed: runStats.variantsUsed,
		bestTimeBlock,
		worstTimeBlock,
		resolvedEvents,
		focalPoints,
		eventsByCategory,
		hasContextualCook,
		hasAzorRecovery,
		resolvedIds,
		choicesMade,
		untouchedCategories,
	};
}

// --- Event Story Framing ---

/** Validates an unknown value is a non-empty string array from i18n. */
function asStringVariants(value: unknown): NonEmptyArray<string> | null {
	if (!Array.isArray(value) || value.length === 0) return null;
	const first = value[0];
	if (typeof first !== "string") return null;
	return [first, ...(value.slice(1) as string[])];
}

/** Gets storyOpener from a focal event's i18n, if available. */
function getEventStoryOpener(eventId: string, seed: number): string | null {
	const s = strings();
	const content = s.events[eventId as keyof typeof s.events];
	if (!content) return null;
	const variants = asStringVariants(
		(content as Record<string, unknown>).storyOpener,
	);
	if (!variants) return null;
	return pickVariant(variants, seed);
}

/** Gets storyCloser from a focal event's i18n, if available. */
function getEventStoryCloser(eventId: string, seed: number): string | null {
	const s = strings();
	const content = s.events[eventId as keyof typeof s.events];
	if (!content) return null;
	const variants = asStringVariants(
		(content as Record<string, unknown>).storyCloser,
	);
	if (!variants) return null;
	return pickVariant(variants, seed);
}

// --- Paragraph Builders ---

/** Collects event recaps for a category, ordered by scheduled day. */
function getCategoryRecaps(
	ctx: WeekContext,
	category: StoryCategory,
): string[] {
	const events = ctx.eventsByCategory.get(category) ?? [];
	return events
		.sort(
			(a, b) => (a.instance.scheduledDay ?? 0) - (b.instance.scheduledDay ?? 0),
		)
		.filter((e) => e.recap != null)
		.map((e) => e.recap as string);
}

/** Opening: focal event storyOpener, or tone-based fallback. */
function buildOpening(ctx: WeekContext): string {
	const s = strings();

	// Try primary focal event's storyOpener
	const primary = ctx.focalPoints[0];
	if (primary) {
		const opener = getEventStoryOpener(primary.instance.id, ctx.seed);
		if (opener) return opener;
	}

	return pickVariant(s.weekStory.openings[ctx.tone], ctx.seed);
}

/** Rhythm: personality + time patterns. */
function buildRhythm(ctx: WeekContext): string {
	const s = strings();
	const parts: string[] = [];
	const seed = ctx.seed + 100;

	if (ctx.personality.time === "nightOwl") {
		parts.push(pickVariant(s.weekStory.rhythm.nightOwl, seed));
	} else if (ctx.personality.time === "earlyBird") {
		parts.push(pickVariant(s.weekStory.rhythm.earlyBird, seed + 1));
	} else {
		parts.push(pickVariant(s.weekStory.rhythm.neutralTime, seed + 2));
	}

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

/** Dog category: walk stats + dog-related event recaps. */
function buildDogParagraph(ctx: WeekContext): string | null {
	const s = strings();
	const parts: string[] = [];
	const seed = ctx.seed + 200;

	// Dog-related event recaps (azor arc)
	const recaps = getCategoryRecaps(ctx, "dog");

	// Skip generic walk observations if azor-worse is present (would contradict).
	// azor-sick alone doesn't suppress -- it's just the start of the arc.
	// azor-recovered overrides: the crisis resolved, walks have a different tone.
	const hasAzorWorse = (ctx.eventsByCategory.get("dog") ?? []).some(
		(e) => e.instance.id === "azor-worse",
	);

	if (ctx.dog.attempted > 0 && !hasAzorWorse) {
		if (ctx.hasAzorRecovery && ctx.dog.failed <= 2) {
			// After azor recovery, walks have a different emotional context
			parts.push(pickVariant(s.weekStory.basics.dogAfterRecovery, seed));
		} else if (ctx.dog.failed === 0) {
			parts.push(pickVariant(s.weekStory.basics.dogGood, seed));
		} else if (ctx.dog.failed <= 2) {
			parts.push(pickVariant(s.weekStory.basics.dogMixed, seed + 1));
		} else {
			parts.push(pickVariant(s.weekStory.basics.dogStruggled, seed + 2));
		}
	}

	parts.push(...recaps);

	if (parts.length === 0) return null;
	return parts.join(" ");
}

/** Home category: apartment events (leak, construction, power, inspection, etc.). */
function buildHomeParagraph(ctx: WeekContext): string | null {
	const s = strings();
	const recaps = getCategoryRecaps(ctx, "home");
	if (recaps.length === 0) return null;
	const parts: string[] = [];

	// Framing sentence when multiple home events happened
	if (recaps.length >= 2) {
		parts.push(pickVariant(s.weekStory.home.framing, ctx.seed + 250));
	}

	parts.push(...recaps);
	return parts.join(" ");
}

/** Social category: friend rescue stats + social event recaps. */
function buildSocialParagraph(ctx: WeekContext): string | null {
	const s = strings();
	const parts: string[] = [];
	const seed = ctx.seed + 300;

	// Social event recaps (birthday, bbq, neighbor, etc.)
	parts.push(...getCategoryRecaps(ctx, "social"));

	// Friend rescue observations
	if (ctx.friendRescues.triggered > 0) {
		if (ctx.friendRescues.accepted === ctx.friendRescues.triggered) {
			parts.push(pickVariant(s.weekStory.help.friendAcceptedAll, seed));
		} else if (ctx.friendRescues.accepted > 0) {
			parts.push(pickVariant(s.weekStory.help.friendAcceptedSome, seed + 1));
		} else {
			parts.push(pickVariant(s.weekStory.help.friendDeclinedAll, seed + 2));
		}

		if (ctx.personality.social === "hermit" && ctx.friendRescues.accepted > 0) {
			parts.push(pickVariant(s.weekStory.help.hermitSocialCost, seed + 3));
		} else if (
			ctx.personality.social === "socialBattery" &&
			ctx.friendRescues.accepted > 0
		) {
			parts.push(pickVariant(s.weekStory.help.socialBatteryBoost, seed + 4));
		}
	}

	if (parts.length === 0) return null;
	return parts.join(" ");
}

/** Obligations category: work deadline, dentist, vet consequence events. */
function buildObligationsParagraph(ctx: WeekContext): string | null {
	const s = strings();
	const recaps = getCategoryRecaps(ctx, "obligations");
	if (recaps.length === 0) return null;
	const parts: string[] = [];

	// Framing sentence
	if (recaps.length >= 2) {
		parts.push(pickVariant(s.weekStory.obligations.framing, ctx.seed + 350));
	}

	parts.push(...recaps);
	return parts.join(" ");
}

/** Survival category: food + hygiene + chores stats, merged basics. */
function buildSurvivalParagraph(ctx: WeekContext): string | null {
	const s = strings();
	const parts: string[] = [];
	const seed = ctx.seed + 400;

	// Food observation (week-long, distinguishes cook vs delivery).
	// Skip generic cook observation if a contextual cook event already covers it
	// (friend-visits or neighbor-hello recap already mentions cooking).
	if (!ctx.hasContextualCook) {
		if (ctx.food.cookSucceeded > 0) {
			parts.push(pickVariant(s.weekStory.basics.foodCooked, seed));
		} else if (ctx.food.deliverySucceeded > 0) {
			parts.push(pickVariant(s.weekStory.basics.foodDelivery, seed + 1));
		} else if (ctx.food.attempted > 0) {
			parts.push(pickVariant(s.weekStory.basics.foodStruggled, seed + 2));
		}
	} else if (ctx.food.attempted > 0 && ctx.food.succeeded === 0) {
		// Contextual cook event fired but food still failed entirely
		parts.push(pickVariant(s.weekStory.basics.foodStruggled, seed + 2));
	}

	// Variants used
	if (ctx.variantsUsed.length > 0) {
		parts.push(pickVariant(s.weekStory.basics.variantsUsed, seed + 3));
	}

	// Survival wrap
	parts.push(pickVariant(s.weekStory.basics.survivalWrap[ctx.tone], seed + 4));

	return parts.join(" ");
}

/** Creative category: creative task stats + creative-spark event. */
function buildCreativeParagraph(ctx: WeekContext): string | null {
	const s = strings();
	const seed = ctx.seed + 500;
	const parts: string[] = [];

	// Creative event recaps (e.g. creative-spark)
	const recaps = getCategoryRecaps(ctx, "creative");
	parts.push(...recaps);

	// Creative task stats -- skip when a creative event recap already sets the tone.
	// The creative-spark recap covers the narrative; adding "it failed" for the
	// regular creative tasks reads as contradictory even though they're separate systems.
	if (ctx.creative.attempted > 0 && recaps.length === 0) {
		if (ctx.creative.succeeded > 0) {
			parts.push(pickVariant(s.weekStory.attempts.creativeSucceeded, seed));
		} else {
			parts.push(pickVariant(s.weekStory.attempts.creativeFailed, seed));
		}
	}

	if (parts.length === 0) return null;
	return parts.join(" ");
}

/** Coping paragraph: phone usage. */
function buildCopingParagraph(ctx: WeekContext): string | null {
	const s = strings();
	const parts: string[] = [];
	const seed = ctx.seed + 600;

	if (ctx.phoneChecks > 15) {
		parts.push(pickVariant(s.weekStory.help.phoneHeavy, seed));
	} else if (ctx.phoneChecks > 5) {
		parts.push(pickVariant(s.weekStory.help.phoneModerate, seed + 1));
	} else if (ctx.phoneChecks > 0) {
		parts.push(pickVariant(s.weekStory.help.phoneLight, seed + 2));
	}

	if (parts.length === 0) return null;
	return parts.join(" ");
}

/**
 * Curiosity observations: cross-system things the player might have missed.
 * Returns at most one observation to keep stories from getting too long.
 * Only includes observations verifiable from the data we actually track.
 * These create replayability -- "wait, really?" moments.
 */
function buildCuriosityObservation(ctx: WeekContext): string | null {
	const s = strings();
	const seed = ctx.seed + 800;
	const candidates: string[] = [];

	// Creative tasks in pool but zero attempts all week
	// Skip if a creative event (like creative-spark) already covers this
	if (
		ctx.untouchedCategories.has("creative") &&
		!ctx.eventsByCategory.has("creative")
	) {
		candidates.push(
			pickVariant(s.weekStory.curiosity.creativeUntouched, seed + 1),
		);
	}

	// Declined neighbor-cookies (a small social choice the player might not have thought about)
	if (ctx.choicesMade.has("neighbor-cookies:decline")) {
		candidates.push(
			pickVariant(s.weekStory.curiosity.declinedCookies, seed + 2),
		);
	}

	// Heavy phone usage + high friend rescue acceptance (coped in opposite ways)
	if (ctx.phoneChecks > 10 && ctx.friendRescues.accepted >= 2) {
		candidates.push(
			pickVariant(s.weekStory.curiosity.phonePlusFriend, seed + 3),
		);
	}

	// No food attempts all week
	if (ctx.food.attempted === 0) {
		candidates.push(
			pickVariant(s.weekStory.curiosity.noFoodAttempts, seed + 4),
		);
	}

	// Dog walked perfectly while everything else was rough
	if (ctx.dog.failed === 0 && ctx.dog.attempted > 0 && ctx.tone === "rough") {
		candidates.push(
			pickVariant(s.weekStory.curiosity.dogPerfectRoughWeek, seed + 5),
		);
	}

	// Used variants and the week went well (adapting worked)
	if (ctx.variantsUsed.length >= 3 && ctx.tone === "good") {
		candidates.push(
			pickVariant(s.weekStory.curiosity.variantsHelped, seed + 6),
		);
	}

	const first = candidates[0];
	if (!first) return null;
	if (candidates.length === 1) return first;
	// Pick one observation deterministically from multiple candidates
	return pickVariant(
		[first, ...candidates.slice(1)] as NonEmptyArray<string>,
		seed + 10,
	);
}

/** Closing: focal event storyCloser, or tone-based fallback. */
function buildClosing(ctx: WeekContext): string {
	const s = strings();

	// Secondary focal event gets storyCloser first, then primary
	const secondary = ctx.focalPoints[1];
	if (secondary) {
		const closer = getEventStoryCloser(secondary.instance.id, ctx.seed + 700);
		if (closer) return closer;
	}
	const primaryFocal = ctx.focalPoints[0];
	if (primaryFocal) {
		const closer = getEventStoryCloser(
			primaryFocal.instance.id,
			ctx.seed + 700,
		);
		if (closer) return closer;
	}

	return pickVariant(s.weekStory.closings[ctx.tone], ctx.seed + 700);
}

// --- Main Generator ---

/**
 * Generates a multi-paragraph story about the week.
 * Structure: Opening -> Rhythm -> [Category paragraphs by weight] -> Coping -> Closing.
 */
export function generateWeekStory(state: GameState): string {
	const ctx = buildContext(state);
	const paragraphs: string[] = [];

	// Opening (focal event storyOpener or tone-based)
	paragraphs.push(buildOpening(ctx));

	// Rhythm (personality + time patterns)
	paragraphs.push(buildRhythm(ctx));

	// Category paragraphs, sorted by narrative weight (most dramatic first)
	const categoryBuilders: [
		StoryCategory,
		(ctx: WeekContext) => string | null,
	][] = [
		["dog", buildDogParagraph],
		["obligations", buildObligationsParagraph],
		["home", buildHomeParagraph],
		["social", buildSocialParagraph],
		["survival", buildSurvivalParagraph],
		["creative", buildCreativeParagraph],
	];

	// Sort by sum of focal weights in each category; base order as tiebreaker
	const weighted = categoryBuilders.map(([cat, builder], index) => {
		const events = ctx.eventsByCategory.get(cat) ?? [];
		const weight = events.reduce((sum, e) => sum + e.focalWeight, 0);
		return { builder, weight, index };
	});
	weighted.sort((a, b) => b.weight - a.weight || a.index - b.index);

	for (const { builder } of weighted) {
		const paragraph = builder(ctx);
		if (paragraph) paragraphs.push(paragraph);
	}

	// Curiosity observation (at most one cross-system observation)
	const curiosity = buildCuriosityObservation(ctx);
	if (curiosity) paragraphs.push(curiosity);

	// Coping (phone usage)
	const coping = buildCopingParagraph(ctx);
	if (coping) paragraphs.push(coping);

	// Closing (focal event storyCloser or tone-based)
	paragraphs.push(buildClosing(ctx));

	return paragraphs.join("\n\n");
}
