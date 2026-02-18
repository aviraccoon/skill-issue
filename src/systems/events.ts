/**
 * Event checking and effect application.
 * Checked at transition points, same pattern as friend rescue.
 */

import {
	type EventEffects,
	type EventPhase,
	getEventContent,
	getEventDefinition,
} from "../data/events";
import type { EventId, GameState } from "../state";
import type { Store } from "../store";
import { clamp } from "../utils/math";
import { pickVariant, seededVariation } from "../utils/random";

/** Variance factor applied to event effects (±20% of base value). */
const EVENT_EFFECT_VARIANCE = 0.2;

const SALT_EVENT_ENERGY = 9001;
const SALT_EVENT_MOMENTUM = 9002;

/**
 * Checks if any pending event should fire at the current game state and phase.
 * Returns the first matching event ID, or null.
 */
export function checkForEvent(
	state: GameState,
	phase: EventPhase,
): EventId | null {
	const resolvedIds = new Set(
		state.events.filter((e) => e.status === "resolved").map((e) => e.id),
	);

	for (const instance of state.events) {
		if (instance.status !== "pending") continue;

		const definition = getEventDefinition(instance.id);
		if (!definition) continue;

		// Check phase
		if (definition.timing.phase !== phase) continue;

		// Check day: use scheduled day if assigned, otherwise fall back to definition
		if (instance.scheduledDay !== undefined) {
			if (state.dayIndex !== instance.scheduledDay) continue;
		} else if (definition.timing.day) {
			const days = Array.isArray(definition.timing.day)
				? definition.timing.day
				: [definition.timing.day];
			if (!days.includes(state.day)) continue;
		}

		// Check time block
		if (definition.timing.timeBlock) {
			const blocks = Array.isArray(definition.timing.timeBlock)
				? definition.timing.timeBlock
				: [definition.timing.timeBlock];
			if (!blocks.includes(state.timeBlock)) continue;
		}

		// Check arc requirements (all required events must be resolved)
		if (definition.requires) {
			if (!definition.requires.every((r) => resolvedIds.has(r))) continue;
		}

		// Check custom condition
		if (definition.condition && !definition.condition(state)) continue;

		return instance.id;
	}

	return null;
}

/** How the event was delivered to the player. */
export type EventDelivery = "inline" | "fullscreen";

/**
 * Activates an event. Minor events are delivered inline (banner + immediate
 * resolve). Major events use full-screen with player choice.
 */
export function activateEvent(
	store: Store<GameState>,
	eventId: EventId,
): EventDelivery {
	const definition = getEventDefinition(eventId);

	// Minor events: inline delivery (apply effects, set banner, resolve)
	if (definition?.type === "minor") {
		if (definition.effects) {
			applyEventEffects(store, definition.effects);
		}

		// Build banner text from i18n
		const state = store.getState();
		const content = getEventContent(eventId);
		let text = "";
		if ("notification" in content && Array.isArray(content.notification)) {
			const variants = [...content.notification] as [string, ...string[]];
			text = pickVariant(variants, state.runSeed + state.dayIndex);
		}

		store.set("eventBanner", {
			eventId,
			text,
			style: definition.deliveryStyle ?? "thought",
		});

		// Mark as resolved immediately (no player interaction needed)
		store.update("events", (events) =>
			events.map((e) =>
				e.id === eventId ? { ...e, status: "resolved" as const } : e,
			),
		);

		return "inline";
	}

	// Major events: full-screen delivery (existing behavior)
	store.update("events", (events) =>
		events.map((e) =>
			e.id === eventId ? { ...e, status: "active" as const } : e,
		),
	);
	store.set("activeEventId", eventId);
	store.set("screen", "narrativeEvent");

	return "fullscreen";
}

/**
 * Resolves the active event and clears it.
 * For major events, applies the chosen effects.
 * Returns the event's phase so the caller can determine the next screen.
 */
export function resolveEvent(
	store: Store<GameState>,
	choiceId?: string,
): EventPhase | null {
	const state = store.getState();
	const eventId = state.activeEventId;
	if (!eventId) return null;

	const definition = getEventDefinition(eventId);

	// Apply choice effects for major events
	if (choiceId && definition?.choices) {
		const choice = definition.choices.find((c) => c.id === choiceId);
		if (choice?.effects) {
			applyEventEffects(store, choice.effects);
		}
	}

	// Mark event as resolved
	store.update("events", (events) =>
		events.map((e) =>
			e.id === eventId ? { ...e, status: "resolved" as const, choiceId } : e,
		),
	);
	store.set("activeEventId", null);

	return definition?.timing.phase ?? null;
}

/** Applies energy/momentum/flag effects from an event with seed variance. */
function applyEventEffects(
	store: Store<GameState>,
	effects: EventEffects,
): void {
	const { energy, momentum, setFlag } = effects;
	const seed = store.getState().runSeed;
	if (energy) {
		const variance = Math.abs(energy) * EVENT_EFFECT_VARIANCE;
		const varied = seededVariation(seed, energy, variance, SALT_EVENT_ENERGY);
		store.update("energy", (e) => clamp(e + varied, 0, 1));
	}
	if (momentum) {
		const variance = Math.abs(momentum) * EVENT_EFFECT_VARIANCE;
		const varied = seededVariation(
			seed,
			momentum,
			variance,
			SALT_EVENT_MOMENTUM,
		);
		store.update("momentum", (m) => clamp(m + varied, 0, 1));
	}
	if (setFlag) {
		store.update("eventFlags", (flags) =>
			flags.includes(setFlag) ? flags : [...flags, setFlag],
		);
	}
}
