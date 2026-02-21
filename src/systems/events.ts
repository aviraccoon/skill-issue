/**
 * Event checking and effect application.
 * Checked at transition points, same pattern as friend rescue.
 */

import {
	type EventEffects,
	type EventPhase,
	getEventContent,
	getEventDefinition,
	type ObligationDef,
	type TaskModification,
} from "../data/events";
import { getTaskStatic, type TaskId } from "../data/tasks";
import { SLOTS_PER_BLOCK } from "../data/timeBlocks";
import { strings } from "../i18n";
import {
	DAYS,
	type Day,
	type EventId,
	type GameState,
	isWeekend,
	type Task,
	type TimeBlock,
} from "../state";
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
 * Creates a Task from an obligation definition.
 * Used when a notification event injects an obligation task.
 */
export function createObligationTask(
	obligation: ObligationDef,
	obligationDay: number,
	sourceEvent: EventId,
): Task {
	const s = strings();
	const taskStrings = s.tasks[obligation.taskId];
	return {
		id: obligation.taskId,
		name: taskStrings?.name ?? obligation.taskId,
		category: obligation.category,
		baseRate: obligation.baseRate,
		availableBlocks: [...obligation.availableBlocks],
		energyEffect: obligation.energyEffect,
		failureCount: 0,
		successCount: 0,
		attemptedToday: false,
		succeededToday: false,
		availableDay: obligationDay,
		sourceEvent,
		isObligation: true,
	};
}

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

		// Inject obligation task if this is an obligation notification
		const state = store.getState();
		const instance = state.events.find((e) => e.id === eventId);
		if (definition.obligation && instance?.obligationDay !== undefined) {
			const task = createObligationTask(
				definition.obligation,
				instance.obligationDay,
				eventId,
			);
			store.update("tasks", (tasks) => [...tasks, task]);
		}

		// Modify an existing task if this event has a task modification
		if (definition.modifyTask) {
			applyTaskModification(store, eventId, definition.modifyTask);
		}

		// Build banner text from i18n
		const content = getEventContent(eventId);
		let text = "";
		if ("notification" in content && Array.isArray(content.notification)) {
			const variant = pickVariant(
				[...content.notification] as [unknown, ...unknown[]],
				state.runSeed + state.dayIndex,
			);
			// Obligation notifications use template functions for localization
			if (
				typeof variant === "function" &&
				definition.obligation &&
				instance?.obligationDay !== undefined
			) {
				const dayName = DAYS[instance.obligationDay];
				if (dayName) {
					text = (
						variant as (day: Day, blocks: readonly TimeBlock[]) => string
					)(dayName, definition.obligation.availableBlocks);
				}
			} else if (typeof variant === "string") {
				text = variant;
			}
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

/**
 * Reverts a contextual task modification, restoring original name and rate
 * from task statics and i18n. Called on task success.
 */
export function revertTaskModification(
	store: Store<GameState>,
	taskId: TaskId,
): void {
	const s = strings();
	const taskContent = s.tasks[taskId];
	const taskStatic = getTaskStatic(taskId);

	store.update("tasks", (tasks) =>
		tasks.map((t) => {
			if (t.id !== taskId || !t.contextModifiedBy) return t;
			return {
				...t,
				name: taskContent.name,
				baseRate: taskStatic?.baseRate ?? t.baseRate,
				contextModifiedBy: undefined,
				...(t.minimalVariant && "variant" in taskContent
					? {
							minimalVariant: {
								...t.minimalVariant,
								name: (taskContent as { variant: { name: string } }).variant
									.name,
							},
						}
					: {}),
			};
		}),
	);
}

/**
 * Modifies an existing task in-place when an event fires.
 * Silently does nothing if the task isn't in the seed's pool.
 * Name and variant name come from i18n; rate override comes from the definition.
 */
export function applyTaskModification(
	store: Store<GameState>,
	eventId: EventId,
	mod: TaskModification,
): void {
	const state = store.getState();
	if (!state.tasks.some((t) => t.id === mod.taskId)) return;

	const content = getEventContent(eventId);
	const modContent =
		"taskModification" in content
			? (
					content as {
						taskModification: { name: string; variantName?: string };
					}
				).taskModification
			: undefined;

	store.update("tasks", (tasks) =>
		tasks.map((t) => {
			if (t.id !== mod.taskId) return t;
			return {
				...t,
				contextModifiedBy: eventId,
				...(modContent?.name ? { name: modContent.name } : {}),
				...(mod.baseRate !== undefined ? { baseRate: mod.baseRate } : {}),
				...(t.minimalVariant && modContent?.variantName
					? {
							minimalVariant: {
								...t.minimalVariant,
								name: modContent.variantName,
							},
						}
					: {}),
			};
		}),
	);
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
	if (effects.succeedTask) {
		const taskId = effects.succeedTask;
		store.update("tasks", (tasks) =>
			tasks.map((t) => (t.id === taskId ? { ...t, succeededToday: true } : t)),
		);
	}
	if (effects.skipCurrentBlock) {
		if (isWeekend(store.getState())) {
			store.update("weekendPointsRemaining", (p) =>
				Math.max(p - SLOTS_PER_BLOCK, 0),
			);
		} else {
			store.set("slotsRemaining", 0);
		}
	}
}
