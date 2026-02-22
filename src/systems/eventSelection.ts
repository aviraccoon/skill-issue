/**
 * Seed-based event selection and progression tier calculation.
 * Determines which narrative events appear in a run based on seed,
 * progression tier (from completed main-mode runs), and arc requirements.
 */

import {
	type EventDefinition,
	type EventPhase,
	type EventTier,
	eventPool,
	MAX_EVENT_TIER,
} from "../data/events";
import { DAYS, type EventId, type EventInstance } from "../state";
import { seededRandom, seededShuffle } from "../utils/random";
import type { PatternsData } from "./persistence";

/** Salt range for event selection (5100-5199, above task selection's 5000-5099). */
const SALT_EVENT_SELECTION = 5100;

/**
 * Max standalone major events per run. Arc majors (consequences) are exempt
 * since they only fire on player failure. This caps guaranteed fullscreen
 * interruptions while letting consequence events remain as earned punishment.
 */
const MAX_STANDALONE_MAJORS = 2;

/** Salt for major event cap shuffling. */
const SALT_MAJOR_CAP = 5500;

/** Max selection units selected per tier range. */
const UNITS_PER_TIER: Record<EventTier, { min: number; max: number }> = {
	0: { min: 1, max: 2 },
	1: { min: 1, max: 3 },
	2: { min: 1, max: 3 },
};

/**
 * A selection unit is either a standalone event or an entire arc.
 * Arcs are selected as a unit to ensure all arc events are present.
 */
interface SelectionUnit {
	events: EventDefinition[];
}

/**
 * Calculates the player's progression tier from their history.
 * Only counts main-mode completions (seeded runs bypass progression).
 */
export function getProgressionTier(patterns: PatternsData): EventTier {
	const mainCompletions = patterns.history.filter(
		(run) => !run.gameMode || run.gameMode === "main",
	).length;

	if (mainCompletions >= 2) return 2;
	if (mainCompletions >= 1) return 1;
	return 0;
}

/**
 * Filters events by progression tier.
 * Returns events that could appear in a run at the given tier.
 *
 * The `requires` field is NOT checked here -- it's a runtime ordering
 * constraint enforced by checkForEvent, not a selection filter.
 * Arc events are selected as complete units, so all arc members
 * must be available for selection regardless of their prerequisites.
 */
function getAvailableEvents(maxTier: EventTier): EventDefinition[] {
	return eventPool.filter((event) => event.tier <= maxTier);
}

/**
 * Groups events into selection units: standalone events become singleton units,
 * events sharing an arcId are grouped together. This ensures arcs are selected
 * or skipped as a whole.
 */
function groupIntoSelectionUnits(events: EventDefinition[]): SelectionUnit[] {
	const arcMap = new Map<string, EventDefinition[]>();
	const units: SelectionUnit[] = [];

	for (const event of events) {
		if (event.arcId) {
			const group = arcMap.get(event.arcId);
			if (group) {
				group.push(event);
			} else {
				arcMap.set(event.arcId, [event]);
			}
		} else {
			units.push({ events: [event] });
		}
	}

	for (const arcEvents of arcMap.values()) {
		units.push({ events: arcEvents });
	}

	return units;
}

/**
 * Determines a count within [min, max] inclusive, using seeded random.
 */
function seededCount(
	min: number,
	max: number,
	seed: number,
	salt: number,
): number {
	if (min === max) return min;
	const r = seededRandom(seed, salt);
	return min + Math.floor(r * (max - min + 1));
}

/**
 * Selects events for a run based on seed and progression.
 * Returns EventInstance[] with all selected events in "pending" status.
 *
 * Arc events are selected as complete units -- if one arc event is picked,
 * all events in that arc are included. This ensures arc prerequisites are
 * always present.
 *
 * @param seed - Run seed for deterministic selection
 * @param patterns - Player's cross-run history (for tier calculation)
 * @param bypassProgression - If true, all tiers available (shared/daily seeds)
 */
export function selectEventsForSeed(
	seed: number,
	patterns: PatternsData,
	bypassProgression = false,
): EventInstance[] {
	const maxTier: EventTier = bypassProgression
		? MAX_EVENT_TIER
		: getProgressionTier(patterns);

	const available = getAvailableEvents(maxTier);
	if (available.length === 0) return [];

	// Group available events by tier
	const byTier = new Map<EventTier, EventDefinition[]>();
	for (const event of available) {
		const group = byTier.get(event.tier);
		if (group) {
			group.push(event);
		} else {
			byTier.set(event.tier, [event]);
		}
	}

	// Select events per tier using arc-aware units
	const selected: EventInstance[] = [];

	// Always-selected events bypass tier selection (condition-gated at runtime).
	// Added after tier selection, then deduped. Pool is unchanged to preserve
	// seeded shuffle determinism for existing events.
	const alwaysSelectedIds = new Set<EventId>();
	for (const event of available) {
		if (event.alwaysSelected) {
			alwaysSelectedIds.add(event.id);
		}
	}

	for (const [tier, events] of byTier) {
		const spec = UNITS_PER_TIER[tier];
		const units = groupIntoSelectionUnits(events);

		const count = Math.min(
			seededCount(spec.min, spec.max, seed, SALT_EVENT_SELECTION + tier),
			units.length,
		);

		// Shuffle units and pick
		const shuffled = seededShuffle(
			units,
			seed + SALT_EVENT_SELECTION + tier + 10,
		);

		for (let i = 0; i < count; i++) {
			const unit = shuffled[i];
			if (unit) {
				for (const event of unit.events) {
					selected.push({ id: event.id, status: "pending" });
				}
			}
		}
	}

	// Add always-selected events that weren't already picked by tier selection
	for (const id of alwaysSelectedIds) {
		if (!selected.some((e) => e.id === id)) {
			selected.push({ id, status: "pending" });
		}
	}

	// Cap standalone major events to prevent fullscreen overload.
	// Arc majors (consequences with `requires`) are exempt -- they self-gate.
	capStandaloneMajors(selected, seed);

	// Assign each standalone event a specific day within its allowed range.
	// Without this, events fire on the first matching day (always Monday for
	// "any day" events). Arc events keep their definition-based day checks
	// since arc ordering depends on carefully designed day ranges.
	assignScheduledDays(selected, seed);

	// Obligation arcs need special scheduling: notification day, obligation day,
	// and consequence day are all computed together.
	assignObligationDays(selected, seed);

	// Spread events across days to prevent same-(day, phase) collisions.
	coordinateEventTiming(selected, seed);

	return selected;
}

/**
 * Removes excess standalone major events when more than MAX_STANDALONE_MAJORS
 * are selected. Uses seeded random to decide which to drop so the result is
 * deterministic per seed. Mutates the array in place.
 */
function capStandaloneMajors(events: EventInstance[], seed: number): void {
	const majorIndices: number[] = [];
	for (let i = 0; i < events.length; i++) {
		const def = eventPool.find((e) => e.id === events[i]?.id);
		if (def?.type === "major" && !def.arcId) {
			majorIndices.push(i);
		}
	}

	if (majorIndices.length <= MAX_STANDALONE_MAJORS) return;

	// Seeded shuffle to pick which to keep
	const shuffled = seededShuffle(majorIndices, seed + SALT_MAJOR_CAP);
	const toDrop = new Set(shuffled.slice(MAX_STANDALONE_MAJORS));

	// Remove in reverse order to preserve indices
	for (const idx of [...toDrop].sort((a, b) => b - a)) {
		events.splice(idx, 1);
	}
}

/** Salt offset for day scheduling (distinct from selection salts). */
const SALT_SCHEDULE_DAY = 5200;

/** Salt offset for obligation day computation. */
const SALT_OBLIGATION_DAY = 5300;

/**
 * Assigns scheduling for obligation arcs: notification gets a scheduledDay,
 * obligation day is computed as notification + seeded offset, and the
 * consequence event's scheduledDay is set to the obligation day.
 *
 * Notifications are spread across different days when possible to avoid
 * dayStart collisions (checkForEvent returns only the first match per phase).
 */
function assignObligationDays(events: EventInstance[], seed: number): void {
	// Track days already claimed by obligation notifications (all dayStart)
	const usedNotificationDays = new Set<number>();

	// Collect obligation notification indices, sorted by constraint level.
	// Most constrained (fewest allowed days) first, so they get first pick
	// and less constrained obligations work around them.
	const obligationIndices: number[] = [];
	for (let i = 0; i < events.length; i++) {
		const def = eventPool.find((e) => e.id === events[i]?.id);
		if (def?.obligation) obligationIndices.push(i);
	}
	obligationIndices.sort((a, b) => {
		const defA = eventPool.find((e) => e.id === events[a]?.id);
		const defB = eventPool.find((e) => e.id === events[b]?.id);
		if (!defA || !defB) return 0;
		return getAllowedDays(defA).length - getAllowedDays(defB).length;
	});

	for (const i of obligationIndices) {
		const instance = events[i];
		if (!instance) continue;

		const definition = eventPool.find((e) => e.id === instance.id);
		if (!definition?.obligation) continue;

		// Schedule the notification event itself (arc events skip assignScheduledDays)
		if (instance.scheduledDay === undefined) {
			const allowedDays = getAllowedDays(definition);
			// Prefer days not already used by another obligation notification
			const available = allowedDays.filter((d) => !usedNotificationDays.has(d));
			const candidates = available.length > 0 ? available : allowedDays;
			if (candidates.length > 0) {
				const r = seededRandom(seed, SALT_SCHEDULE_DAY + i);
				const dayIdx = candidates[Math.floor(r * candidates.length)];
				if (dayIdx !== undefined) {
					instance.scheduledDay = dayIdx;
				}
			}
		}

		if (instance.scheduledDay !== undefined) {
			usedNotificationDays.add(instance.scheduledDay);
		}

		if (instance.scheduledDay === undefined) continue;

		// Compute obligation day: notification day + seeded offset
		const [minOffset, maxOffset] = definition.obligation.dayOffset;
		const offsetRange = maxOffset - minOffset + 1;
		const r = seededRandom(seed, SALT_OBLIGATION_DAY + i);
		let obligDay =
			instance.scheduledDay + minOffset + Math.floor(r * offsetRange);
		// Clamp to weekdays (0-4)
		obligDay = Math.min(obligDay, 4);
		instance.obligationDay = obligDay;

		// Find the consequence event in the same arc and set its scheduledDay
		if (definition.arcId) {
			for (const other of events) {
				if (other === instance) continue;
				const otherDef = eventPool.find((e) => e.id === other.id);
				if (
					otherDef?.arcId === definition.arcId &&
					otherDef.requires?.includes(definition.id)
				) {
					other.scheduledDay = obligDay;
				}
			}
		}
	}
}

/** Salt offset for event timing coordination. */
const SALT_COORDINATION = 5400;

/**
 * Prevents event collisions at the same (day, phase).
 * checkForEvent returns only the first matching event per phase transition,
 * so two events at the same day and phase means one is silently dropped.
 *
 * Obligation arc events have highest priority (most constrained timing).
 * Standalone events are reassigned to alternative days when possible.
 */
export function coordinateEventTiming(
	events: EventInstance[],
	seed: number,
): void {
	const occupied = new Set<string>();

	function slotKey(day: number, phase: EventPhase): string {
		return `${day}:${phase}`;
	}

	// Identify obligation arcs (arcs containing an event with obligation field)
	const obligationArcIds = new Set<string>();
	for (const instance of events) {
		const def = eventPool.find((e) => e.id === instance.id);
		if (def?.obligation && def.arcId) {
			obligationArcIds.add(def.arcId);
		}
	}

	// Phase 1: Reserve slots for obligation arc events (highest priority)
	for (const instance of events) {
		if (instance.scheduledDay === undefined) continue;
		const def = eventPool.find((e) => e.id === instance.id);
		if (!def?.arcId || !obligationArcIds.has(def.arcId)) continue;
		occupied.add(slotKey(instance.scheduledDay, def.timing.phase));
	}

	// Phase 2: Place standalone events, reassigning on conflict.
	// Sort by constraint level (fewest allowed days first) so the most
	// constrained events get first pick and less constrained ones adapt.
	const standaloneIndices: number[] = [];
	for (let i = 0; i < events.length; i++) {
		const instance = events[i];
		if (!instance || instance.scheduledDay === undefined) continue;
		const def = eventPool.find((e) => e.id === instance.id);
		if (!def || def.arcId) continue;
		standaloneIndices.push(i);
	}
	standaloneIndices.sort((a, b) => {
		const defA = eventPool.find((e) => e.id === events[a]?.id);
		const defB = eventPool.find((e) => e.id === events[b]?.id);
		if (!defA || !defB) return 0;
		return getAllowedDays(defA).length - getAllowedDays(defB).length;
	});

	for (const i of standaloneIndices) {
		const instance = events[i];
		if (!instance || instance.scheduledDay === undefined) continue;
		const def = eventPool.find((e) => e.id === instance.id);
		if (!def) continue;

		const k = slotKey(instance.scheduledDay, def.timing.phase);
		if (!occupied.has(k)) {
			occupied.add(k);
			continue;
		}

		// Conflict: find an alternative day from the event's allowed range
		const allowedDays = getAllowedDays(def);
		const alternatives = allowedDays.filter(
			(d) => !occupied.has(slotKey(d, def.timing.phase)),
		);

		if (alternatives.length > 0) {
			const r = seededRandom(seed, SALT_COORDINATION + i);
			const newDay = alternatives[Math.floor(r * alternatives.length)];
			if (newDay !== undefined) {
				instance.scheduledDay = newDay;
			}
		}
		// Mark final position as occupied (whether moved or not)
		occupied.add(slotKey(instance.scheduledDay, def.timing.phase));
	}
}

/** Gets the allowed day indices for an event definition. */
function getAllowedDays(def: EventDefinition): number[] {
	if (def.timing.day) {
		const days = Array.isArray(def.timing.day)
			? def.timing.day
			: [def.timing.day];
		return days.map((d) => DAYS.indexOf(d)).filter((idx) => idx >= 0);
	}
	return [0, 1, 2, 3, 4];
}

/**
 * Assigns a scheduledDay to each non-arc standalone event, picking from its
 * allowed day range using seeded random. Arc events are skipped (their day
 * ranges are designed for narrative ordering).
 */
function assignScheduledDays(events: EventInstance[], seed: number): void {
	for (let i = 0; i < events.length; i++) {
		const instance = events[i];
		if (!instance) continue;

		const definition = eventPool.find((e) => e.id === instance.id);
		if (!definition || definition.arcId) continue;

		// Build allowed day indices from definition
		let allowedDays: number[];
		if (definition.timing.day) {
			const days = Array.isArray(definition.timing.day)
				? definition.timing.day
				: [definition.timing.day];
			allowedDays = days.map((d) => DAYS.indexOf(d)).filter((idx) => idx >= 0);
		} else {
			// Any day: restrict to weekdays (0-4) since blockStart events can't
			// fire on weekends (no time block transitions) and weekend scheduling
			// doesn't fit the weekday-survival narrative arc
			allowedDays = [0, 1, 2, 3, 4];
		}

		if (allowedDays.length === 0) continue;

		// Pick one day from the range
		const r = seededRandom(seed, SALT_SCHEDULE_DAY + i);
		const dayIndex = allowedDays[Math.floor(r * allowedDays.length)];
		if (dayIndex !== undefined) {
			instance.scheduledDay = dayIndex;
		}
	}
}
