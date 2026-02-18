/**
 * Narrative event definitions and types.
 * Events are seed-determined moments that give each run a story.
 * Follows the same pattern as friend rescue: data checked at transition points.
 */

import { strings } from "../i18n";
import type { Day, EventId, GameState, TimeBlock } from "../state";
import { hashString, pickVariant } from "../utils/random";

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

/** A choice's display content: label + description. */
export interface ChoiceContent {
	label: string;
	description: string;
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
 * Minor events have recap as string[], major events as { [choiceId]: string[] }.
 * For major events with variant choice labels, the variant seed pairs
 * the recap with the label the player saw.
 */
export function getEventRecap(
	id: EventId,
	choiceId: string | undefined,
	seed: number,
): string | null {
	const content = getEventContent(id);
	const recap = (content as Record<string, unknown>).recap;
	if (!recap) return null;

	const variantSeed = getEventVariantSeed(seed, id);

	// Minor event: recap is string[]
	if (Array.isArray(recap)) {
		return pickVariant(recap as [string, ...string[]], variantSeed);
	}

	// Major event: recap keyed by choiceId
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
];

/** Gets an event definition by ID. */
export function getEventDefinition(id: EventId): EventDefinition | undefined {
	return eventPool.find((e) => e.id === id);
}
