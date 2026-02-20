/**
 * Narrative event definitions and types.
 * Events are seed-determined moments that give each run a story.
 * Follows the same pattern as friend rescue: data checked at transition points.
 */

import { strings } from "../i18n";
import type { Day, EventId, GameState } from "../state";
import { hashString, pickVariant } from "../utils/random";
import type { TaskCategory, TaskId } from "./tasks";
import { TIME_BLOCKS, type TimeBlock } from "./timeBlocks";

export type { EventId };

/** Progression tier determines which events are available. */
export type EventTier = 0 | 1 | 2 | 3;

/** Event presentation: minor = inline banner, major = full-screen choice. */
export type EventType = "minor" | "major";

/** Visual treatment for inline minor event banners. */
export type DeliveryStyle = "thought" | "notification" | "message";

/** When in the game loop the event fires. */
export type EventPhase = "blockStart" | "dayStart" | "dayEnd";

/** Timing specification for when an event can fire. */
export interface EventTiming {
	/** Day(s) this event can fire on. Undefined = any day. */
	day?: Day | Day[];
	/** Time block(s) this event can fire on. Undefined = any block (weekday only). */
	timeBlock?: TimeBlock | TimeBlock[];
	/** Phase of the game loop where the check runs. */
	phase: EventPhase;
}

/** Effects applied when an event fires or a choice is made. */
export interface EventEffects {
	energy?: number;
	momentum?: number;
	/** Set a flag in event state (for consequence chains). */
	setFlag?: string;
	/** Mark a task as succeeded (used by obligation consequence "do it now" choices). */
	succeedTask?: TaskId;
}

/** Definition for a task injected by an obligation notification event. */
export interface ObligationDef {
	taskId: TaskId;
	category: TaskCategory;
	baseRate: number;
	availableBlocks: readonly TimeBlock[];
	/** Day offset range [min, max] from notification day to obligation day. */
	dayOffset: [number, number];
	energyEffect?: { success?: number; failure?: number };
}

/** A choice in a major event. */
export interface EventChoice {
	id: string;
	effects?: EventEffects;
	/** Flag that must be set for this choice to appear. */
	requiresFlag?: string;
}

/** Static event definition. Strings come from i18n. */
export interface EventDefinition {
	id: EventId;
	tier: EventTier;
	type: EventType;
	timing: EventTiming;
	/** Additional condition beyond timing. Checked when timing matches. */
	condition?: (state: GameState) => boolean;
	/** Direct effects for minor events (applied on display). */
	effects?: EventEffects;
	/** Choices for major events. At least 2 required for major type. */
	choices?: EventChoice[];
	/** Arc ID for connected event sequences. */
	arcId?: string;
	/** Step number within an arc (0-indexed). */
	arcStep?: number;
	/** Event IDs that must have been shown before this one fires. */
	requires?: EventId[];
	/** Visual style for inline delivery (minor events only). Default: "thought". */
	deliveryStyle?: DeliveryStyle;
	/** Obligation task to inject when this notification event fires. */
	obligation?: ObligationDef;
}

/** Gets event content from i18n by event ID. */
export function getEventContent(id: EventId) {
	const s = strings();
	return s.events[id];
}

/**
 * Computes a deterministic variant index for an event's choice labels.
 * Same (seed, eventId) always produces the same index.
 * Used to pair variant labels with their matching recap text.
 */
export function getEventVariantSeed(seed: number, eventId: EventId): number {
	return hashString(eventId) + seed;
}

/** A choice's display content: label + description, optionally bundled with recap. */
export interface ChoiceContent {
	label: string;
	description: string;
	/** Recap text for this specific variant (structural pairing, not index-based). */
	recap?: string;
}

/**
 * Resolves a choice value that may be a single object or an array of variants.
 * When an array, picks deterministically based on variantSeed.
 */
export function resolveChoiceContent(
	value: ChoiceContent | ChoiceContent[] | undefined,
	variantSeed: number,
): ChoiceContent {
	if (!value) return { label: "", description: "" };
	if (!Array.isArray(value)) return value;
	if (value.length === 0) return { label: "", description: "" };
	return pickVariant(value as [ChoiceContent, ...ChoiceContent[]], variantSeed);
}

/**
 * Gets recap text for a resolved event, if available.
 * Minor events have recap as string[].
 * Major events with variant choice arrays bundle recap into each variant object.
 * Major events with single choices use a separate recap: { [choiceId]: string[] }.
 */
export function getEventRecap(
	id: EventId,
	choiceId: string | undefined,
	seed: number,
): string | null {
	const content = getEventContent(id);
	const variantSeed = getEventVariantSeed(seed, id);

	// Major event with variant choices: recap is bundled in the choice variant object
	if (choiceId && "choices" in content) {
		const choices = (content as Record<string, unknown>).choices as
			| Record<string, unknown>
			| undefined;
		const choiceValue = choices?.[choiceId];
		if (Array.isArray(choiceValue)) {
			const resolved = pickVariant(
				choiceValue as [ChoiceContent, ...ChoiceContent[]],
				variantSeed,
			);
			if (resolved.recap) return resolved.recap;
		}
	}

	const recap = (content as Record<string, unknown>).recap;
	if (!recap) return null;

	// Minor event: recap is string[]
	if (Array.isArray(recap)) {
		return pickVariant(recap as [string, ...string[]], variantSeed);
	}

	// Major event with single choices: recap keyed by choiceId
	if (choiceId && typeof recap === "object") {
		const variants = (recap as Record<string, string[]>)[choiceId];
		if (variants?.length) {
			return pickVariant(variants as [string, ...string[]], variantSeed);
		}
	}

	return null;
}

// --- Effect Magnitude Scale ---

/**
 * Standardized effect magnitudes for events.
 * All event effects should use these instead of raw numbers.
 * Tune globally here; individual events pick a tier.
 *
 * For reference, other systems per action:
 *   Task success momentum: +0.05 to +0.10
 *   Task failure momentum: -0.03 to -0.05
 *   Phone void momentum:  -0.15 to -0.20
 *   Friend rescue:        +0.10 momentum, +0.12 energy
 *   Block decay:          -0.015 to -0.025
 */
export const EVENT_MAGNITUDE = {
	/** Barely perceptible. Flavor-with-weight. */
	NUDGE: 0.03,
	/** Like a task attempt outcome. */
	MINOR: 0.06,
	/** Like 1-2 task attempts. Noticeable shift. */
	MODERATE: 0.1,
	/** Friend-rescue-level. Significant. */
	MAJOR: 0.15,
	/** Crisis-level. Tier 3 convergence only. */
	SEVERE: 0.2,
} as const;

const M = EVENT_MAGNITUDE;

// --- Event Pool ---

/** All event definitions. Seed-based selection picks from this pool. */
export const eventPool: readonly EventDefinition[] = [
	// =====================
	// Tier 0: Flavor (no gameplay impact, first run)
	// =====================

	{
		id: "rain",
		tier: 0,
		type: "minor",
		timing: { phase: "blockStart" },
	},

	{
		id: "neighbors-music",
		tier: 0,
		type: "minor",
		timing: {
			timeBlock: ["evening", "night"],
			phase: "blockStart",
		},
	},

	{
		id: "nice-weather",
		tier: 0,
		type: "minor",
		timing: { phase: "dayStart" },
	},

	{
		id: "morning-bird",
		tier: 0,
		type: "minor",
		timing: {
			timeBlock: "morning",
			phase: "dayStart",
		},
	},

	{
		id: "car-alarm",
		tier: 0,
		type: "minor",
		timing: {
			timeBlock: ["afternoon", "evening"],
			phase: "blockStart",
		},
	},

	{
		id: "sunset",
		tier: 0,
		type: "minor",
		timing: {
			timeBlock: "evening",
			phase: "blockStart",
		},
	},

	{
		id: "hallway-noise",
		tier: 0,
		type: "minor",
		timing: {
			timeBlock: "afternoon",
			phase: "blockStart",
		},
	},

	{
		id: "wind",
		tier: 0,
		type: "minor",
		timing: {
			timeBlock: "night",
			phase: "blockStart",
		},
	},

	// =====================
	// Tier 1: Standalone events with gameplay effects
	// =====================

	{
		id: "cold-apartment",
		tier: 1,
		type: "minor",
		timing: {
			day: ["monday", "tuesday", "wednesday"],
			phase: "dayStart",
		},
		effects: { energy: -M.MINOR },
	},

	{
		id: "surprise-package",
		tier: 1,
		type: "minor",
		timing: {
			day: ["monday", "tuesday", "wednesday", "thursday", "friday"],
			timeBlock: "afternoon",
			phase: "blockStart",
		},
		effects: { momentum: M.MINOR },
	},

	{
		id: "hot-water-out",
		tier: 1,
		type: "minor",
		timing: {
			day: ["monday", "tuesday", "wednesday", "thursday", "friday"],
			phase: "dayStart",
		},
		effects: { energy: -M.MODERATE },
	},

	{
		id: "upstairs-party",
		tier: 1,
		type: "minor",
		timing: {
			day: ["thursday", "friday"],
			timeBlock: ["evening", "night"],
			phase: "blockStart",
		},
		effects: { energy: -M.NUDGE, momentum: -M.MINOR },
	},

	{
		id: "found-cash",
		tier: 1,
		type: "minor",
		timing: {
			day: ["monday", "tuesday", "wednesday", "thursday", "friday"],
			phase: "blockStart",
		},
		effects: { momentum: M.MINOR },
	},

	{
		id: "good-smell",
		tier: 1,
		type: "minor",
		timing: {
			day: ["monday", "tuesday", "wednesday", "thursday", "friday"],
			timeBlock: "evening",
			phase: "blockStart",
		},
		effects: { momentum: -M.NUDGE },
	},

	{
		id: "neighbor-cookies",
		tier: 1,
		type: "major",
		timing: {
			day: ["wednesday", "thursday"],
			timeBlock: "evening",
			phase: "blockStart",
		},
		choices: [
			{
				id: "accept",
				effects: { momentum: M.MODERATE, energy: M.MINOR },
			},
			{
				id: "decline",
			},
		],
	},

	// =====================
	// Tier 1: Arc - The Leak
	// =====================

	{
		id: "leak-drip",
		tier: 1,
		type: "minor",
		timing: {
			day: "tuesday",
			timeBlock: ["afternoon", "evening"],
			phase: "blockStart",
		},
		arcId: "leak",
		arcStep: 0,
		effects: { momentum: -M.NUDGE },
	},

	{
		id: "leak-found",
		tier: 1,
		type: "major",
		timing: {
			day: ["wednesday", "thursday"],
			phase: "blockStart",
		},
		requires: ["leak-drip"],
		arcId: "leak",
		arcStep: 1,
		choices: [
			{
				id: "call",
				effects: {
					energy: -M.NUDGE,
					momentum: M.MINOR,
					setFlag: "called-maintenance",
				},
			},
			{
				id: "towel",
				effects: { setFlag: "leak-ignored" },
			},
		],
	},

	{
		id: "leak-fixed",
		tier: 1,
		type: "minor",
		timing: {
			day: ["friday", "saturday"],
			phase: "dayStart",
		},
		requires: ["leak-found"],
		condition: (state) => state.eventFlags.includes("called-maintenance"),
		arcId: "leak",
		arcStep: 2,
		effects: { momentum: M.MINOR },
	},

	{
		id: "leak-worse",
		tier: 1,
		type: "minor",
		timing: {
			day: ["friday", "saturday"],
			phase: "dayStart",
		},
		requires: ["leak-found"],
		condition: (state) => state.eventFlags.includes("leak-ignored"),
		arcId: "leak",
		arcStep: 2,
		effects: { momentum: -M.MODERATE, energy: -M.MINOR },
	},

	// =====================
	// Tier 1: Arc - Missed Delivery
	// =====================

	{
		id: "missed-delivery",
		tier: 1,
		type: "minor",
		timing: {
			day: ["monday", "tuesday"],
			timeBlock: "afternoon",
			phase: "blockStart",
		},
		arcId: "delivery",
		arcStep: 0,
		effects: { momentum: -M.NUDGE },
	},

	{
		id: "delivery-deadline",
		tier: 1,
		type: "major",
		timing: {
			day: ["thursday", "friday"],
			timeBlock: "afternoon",
			phase: "blockStart",
		},
		requires: ["missed-delivery"],
		arcId: "delivery",
		arcStep: 1,
		choices: [
			{
				id: "go",
				effects: { momentum: M.MODERATE, energy: -M.MINOR },
			},
			{
				id: "let-go",
				effects: { momentum: -M.MINOR },
			},
		],
	},

	// =====================
	// Tier 1: Arc - Construction
	// =====================

	{
		id: "construction-start",
		tier: 1,
		type: "minor",
		timing: {
			day: ["monday", "tuesday"],
			phase: "dayStart",
		},
		arcId: "construction",
		arcStep: 0,
		effects: { energy: -M.MINOR },
	},

	{
		id: "construction-weekend",
		tier: 1,
		type: "minor",
		timing: {
			day: "saturday",
			phase: "dayStart",
		},
		requires: ["construction-start"],
		arcId: "construction",
		arcStep: 1,
		effects: { energy: M.NUDGE },
	},

	// =====================
	// Tier 1: Arc - Neighbor Introduction
	// =====================

	{
		id: "neighbor-hello",
		tier: 1,
		type: "minor",
		timing: {
			day: ["tuesday", "wednesday"],
			timeBlock: ["afternoon", "evening"],
			phase: "blockStart",
		},
		arcId: "neighbor",
		arcStep: 0,
		effects: { momentum: M.NUDGE },
	},

	{
		id: "neighbor-invite",
		tier: 1,
		type: "major",
		timing: {
			day: "saturday",
			phase: "dayStart",
		},
		requires: ["neighbor-hello"],
		arcId: "neighbor",
		arcStep: 1,
		choices: [
			{
				id: "go",
				effects: { momentum: M.MAJOR, energy: -M.MINOR },
			},
			{
				id: "pass",
				effects: { momentum: -M.MINOR },
			},
		],
	},

	// =====================
	// Tier 2: Obligation - Dentist
	// =====================

	{
		id: "dentist-reminder",
		tier: 2,
		type: "minor",
		timing: {
			day: ["monday", "tuesday", "wednesday"],
			phase: "dayStart",
		},
		deliveryStyle: "notification",
		arcId: "dentist",
		arcStep: 0,
		obligation: {
			taskId: "dentist-visit",
			category: "selfcare",
			baseRate: 0.4,
			availableBlocks: ["afternoon"],
			dayOffset: [2, 3],
		},
	},

	{
		id: "dentist-missed",
		tier: 2,
		type: "minor",
		timing: { phase: "blockStart" },
		requires: ["dentist-reminder"],
		arcId: "dentist",
		arcStep: 1,
		condition: (state) => {
			const task = state.tasks.find((t) => t.id === "dentist-visit");
			return (
				task != null &&
				!task.succeededToday &&
				TIME_BLOCKS.indexOf(state.timeBlock) > TIME_BLOCKS.indexOf("afternoon")
			);
		},
		effects: { momentum: -M.MODERATE },
	},

	// =====================
	// Tier 2: Obligation - Vet
	// =====================

	{
		id: "vet-reminder",
		tier: 2,
		type: "minor",
		timing: {
			day: ["monday", "tuesday", "wednesday"],
			phase: "dayStart",
		},
		deliveryStyle: "notification",
		arcId: "vet",
		arcStep: 0,
		obligation: {
			taskId: "vet-visit",
			category: "dog",
			baseRate: 0.55,
			availableBlocks: ["morning"],
			dayOffset: [1, 2],
		},
	},

	{
		id: "vet-missed",
		tier: 2,
		type: "minor",
		timing: { phase: "blockStart" },
		requires: ["vet-reminder"],
		arcId: "vet",
		arcStep: 1,
		condition: (state) => {
			const task = state.tasks.find((t) => t.id === "vet-visit");
			return (
				task != null &&
				!task.succeededToday &&
				TIME_BLOCKS.indexOf(state.timeBlock) > TIME_BLOCKS.indexOf("morning")
			);
		},
		effects: { momentum: -M.MODERATE },
	},

	// =====================
	// Tier 2: Obligation - Work Deadline
	// =====================

	{
		id: "work-reminder",
		tier: 2,
		type: "minor",
		timing: {
			day: ["monday", "tuesday"],
			phase: "dayStart",
		},
		deliveryStyle: "notification",
		arcId: "work-deadline",
		arcStep: 0,
		obligation: {
			taskId: "work-deadline",
			category: "work",
			baseRate: 0.35,
			availableBlocks: ["morning", "afternoon", "evening", "night"],
			dayOffset: [3, 4],
		},
	},

	{
		id: "work-missed",
		tier: 2,
		type: "major",
		timing: { phase: "dayEnd" },
		requires: ["work-reminder"],
		arcId: "work-deadline",
		arcStep: 1,
		condition: (state) =>
			state.tasks.some((t) => t.id === "work-deadline" && !t.succeededToday),
		choices: [
			{
				id: "do-it-now",
				effects: { energy: -M.MAJOR, succeedTask: "work-deadline" },
			},
			{
				id: "let-it-go",
				effects: { momentum: -M.MAJOR },
			},
		],
	},
	// =====================
	// Tier 2: Opportunity - Rooftop BBQ
	// =====================

	{
		id: "rooftop-bbq",
		tier: 2,
		type: "major",
		timing: {
			day: "saturday",
			phase: "dayStart",
		},
		choices: [
			{
				id: "go",
				effects: { energy: -M.MODERATE, momentum: M.MAJOR },
			},
			{
				id: "stop-by",
				effects: { energy: -M.NUDGE, momentum: M.MINOR },
			},
			{
				id: "stay-in",
				effects: { momentum: -M.NUDGE },
			},
		],
	},

	// =====================
	// Tier 2: Opportunity - Friend's Birthday
	// =====================

	{
		id: "friends-birthday",
		tier: 2,
		type: "major",
		timing: {
			day: ["friday", "saturday"],
			phase: "dayStart",
		},
		choices: [
			{
				id: "go-to-party",
				effects: { energy: -M.MODERATE, momentum: M.MAJOR },
			},
			{
				id: "send-message",
				effects: { momentum: M.NUDGE },
			},
			{
				id: "text-tomorrow",
				effects: { momentum: -M.MINOR },
			},
		],
	},

	// =====================
	// Tier 2: Opportunity - Nice Weather
	// =====================

	{
		id: "nice-weather-opportunity",
		tier: 2,
		type: "major",
		timing: {
			day: ["monday", "tuesday", "wednesday", "thursday", "friday"],
			phase: "dayStart",
		},
		choices: [
			{
				id: "go-for-walk",
				effects: { energy: M.MINOR, momentum: M.MODERATE },
			},
			{
				id: "open-window",
				effects: { momentum: M.NUDGE },
			},
			{
				id: "later",
			},
		],
	},
];

/** Gets an event definition by ID. */
export function getEventDefinition(id: EventId): EventDefinition | undefined {
	return eventPool.find((e) => e.id === id);
}
