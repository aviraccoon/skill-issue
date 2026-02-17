/**
 * Seed-based event selection and progression tier calculation.
 * Determines which narrative events appear in a run based on seed,
 * progression tier (from completed main-mode runs), and arc requirements.
 */

import {
	type EventDefinition,
	type EventTier,
	eventPool,
} from "../data/events";
import type { EventInstance } from "../state";
import { seededRandom, seededShuffle } from "../utils/random";
import type { PatternsData } from "./persistence";

/** Salt range for event selection (5100-5199, above task selection's 5000-5099). */
const SALT_EVENT_SELECTION = 5100;

/** Max selection units selected per tier range. */
const UNITS_PER_TIER: Record<EventTier, { min: number; max: number }> = {
	0: { min: 1, max: 2 },
	1: { min: 1, max: 3 },
	2: { min: 1, max: 3 },
	3: { min: 1, max: 3 },
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

	if (mainCompletions >= 4) return 3;
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
		? 3
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

	return selected;
}
