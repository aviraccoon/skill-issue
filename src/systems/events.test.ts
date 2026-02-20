import { describe, expect, it } from "bun:test";
import {
	getEventContent,
	getEventDefinition,
	getEventRecap,
	getEventVariantSeed,
	resolveChoiceContent,
} from "../data/events";
import type { TaskId } from "../data/tasks";
import { createInitialState, type GameState, type Task } from "../state";
import { createStore } from "../store";
import {
	activateEvent,
	applyTaskModification,
	checkForEvent,
	createObligationTask,
	resolveEvent,
	revertTaskModification,
} from "./events";

const VARIANCE_FACTOR = 0.2;

/** Creates a test state with overrides. */
function createTestState(overrides: Partial<GameState> = {}): GameState {
	return { ...createInitialState(42), ...overrides };
}

describe("checkForEvent", () => {
	it("returns null when no events are pending", () => {
		const state = createTestState({ events: [] });
		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("returns null when no events match the phase", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "pending" }],
		});
		// rain is blockStart phase, not dayEnd
		expect(checkForEvent(state, "dayEnd")).toBeNull();
	});

	it("matches event by phase (rain matches any blockStart)", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "pending" }],
			day: "wednesday",
			timeBlock: "evening",
		});
		expect(checkForEvent(state, "blockStart")).toBe("rain");
	});

	it("skips events on wrong day", () => {
		const state = createTestState({
			// upstairs-party is thursday/friday, evening/night, blockStart
			events: [{ id: "upstairs-party", status: "pending" }],
			day: "monday",
			timeBlock: "evening",
		});
		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("skips events on wrong time block", () => {
		const state = createTestState({
			// upstairs-party requires evening/night
			events: [{ id: "upstairs-party", status: "pending" }],
			day: "thursday",
			timeBlock: "afternoon",
		});
		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("skips resolved events", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "resolved" }],
		});
		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("skips active events", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "active" }],
		});
		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("returns the first matching event when multiple could match", () => {
		const state = createTestState({
			events: [
				{ id: "rain", status: "pending" },
				{ id: "sunset", status: "pending" },
			],
			day: "monday",
			timeBlock: "evening",
		});
		// Both rain (any blockStart) and sunset (evening blockStart) match
		expect(checkForEvent(state, "blockStart")).toBe("rain");
	});

	it("matches major event timing", () => {
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "pending" }],
			day: "wednesday",
			timeBlock: "evening",
		});
		expect(checkForEvent(state, "blockStart")).toBe("neighbor-cookies");
	});

	it("checks arc requirements before firing", () => {
		const state = createTestState({
			// leak-found requires leak-drip to be resolved
			events: [{ id: "leak-found", status: "pending" }],
			day: "wednesday",
			timeBlock: "afternoon",
		});
		// leak-drip hasn't been resolved, so leak-found shouldn't match
		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("matches arc events when requirements met", () => {
		const state = createTestState({
			events: [
				{ id: "leak-drip", status: "resolved" },
				{ id: "leak-found", status: "pending" },
			],
			day: "wednesday",
			timeBlock: "afternoon",
		});
		expect(checkForEvent(state, "blockStart")).toBe("leak-found");
	});

	it("checks custom conditions", () => {
		const state = createTestState({
			events: [
				{ id: "leak-found", status: "resolved", choiceId: "call" },
				{ id: "leak-fixed", status: "pending" },
			],
			day: "friday",
			timeBlock: "morning",
			eventFlags: [], // "called-maintenance" flag NOT set
		});
		// leak-fixed condition checks for "called-maintenance" flag
		expect(checkForEvent(state, "dayStart")).toBeNull();
	});

	it("matches conditional events when flag is present", () => {
		const state = createTestState({
			events: [
				{ id: "leak-found", status: "resolved", choiceId: "call" },
				{ id: "leak-fixed", status: "pending" },
			],
			day: "friday",
			timeBlock: "morning",
			eventFlags: ["called-maintenance"],
		});
		expect(checkForEvent(state, "dayStart")).toBe("leak-fixed");
	});
});

describe("activateEvent", () => {
	it("resolves minor events inline with banner", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "pending" }],
		});
		const store = createStore(state);

		const delivery = activateEvent(store, "rain");

		expect(delivery).toBe("inline");
		const event = store.getState().events.find((e) => e.id === "rain");
		expect(event?.status).toBe("resolved");
		expect(store.getState().activeEventId).toBeNull();
		expect(store.getState().screen).toBe("game");
		expect(store.getState().eventBanner).not.toBeNull();
		expect(store.getState().eventBanner?.eventId).toBe("rain");
		expect(store.getState().eventBanner?.style).toBe("thought");
	});

	it("shows major events fullscreen", () => {
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "pending" }],
		});
		const store = createStore(state);

		const delivery = activateEvent(store, "neighbor-cookies");

		expect(delivery).toBe("fullscreen");
		const event = store
			.getState()
			.events.find((e) => e.id === "neighbor-cookies");
		expect(event?.status).toBe("active");
		expect(store.getState().activeEventId).toBe("neighbor-cookies");
		expect(store.getState().screen).toBe("narrativeEvent");
		expect(store.getState().eventBanner).toBeNull();
	});

	it("applies effects immediately for minor events", () => {
		const def = getEventDefinition("cold-apartment");
		expect(def).toBeDefined();
		const baseEnergy = def?.effects?.energy ?? 0;
		expect(baseEnergy).not.toBe(0);
		const state = createTestState({
			events: [{ id: "cold-apartment", status: "pending" }],
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		activateEvent(store, "cold-apartment");

		const maxDrop = Math.abs(baseEnergy) * (1 + VARIANCE_FACTOR);
		const minDrop = Math.abs(baseEnergy) * (1 - VARIANCE_FACTOR);
		const energy = store.getState().energy;
		expect(energy).toBeLessThan(0.5);
		expect(energy).toBeGreaterThanOrEqual(0.5 - maxDrop);
		expect(energy).toBeLessThanOrEqual(0.5 - minDrop);
		expect(store.getState().momentum).toBe(0.5);
	});

	it("does not apply effects for major events on activation", () => {
		// neighbor-cookies is major with choice effects
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "pending" }],
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		activateEvent(store, "neighbor-cookies");

		// Energy and momentum unchanged (effects come on choice)
		expect(store.getState().energy).toBe(0.5);
		expect(store.getState().momentum).toBe(0.5);
	});
});

describe("resolveEvent", () => {
	it("marks event as resolved", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "active" }],
			activeEventId: "rain",
		});
		const store = createStore(state);

		resolveEvent(store);

		const event = store.getState().events.find((e) => e.id === "rain");
		expect(event?.status).toBe("resolved");
	});

	it("clears activeEventId", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "active" }],
			activeEventId: "rain",
		});
		const store = createStore(state);

		resolveEvent(store);

		expect(store.getState().activeEventId).toBeNull();
	});

	it("returns the event phase", () => {
		const state = createTestState({
			events: [{ id: "rain", status: "active" }],
			activeEventId: "rain",
		});
		const store = createStore(state);

		const phase = resolveEvent(store);

		expect(phase).toBe("blockStart");
	});

	it("returns null when no active event", () => {
		const state = createTestState({
			activeEventId: null,
		});
		const store = createStore(state);

		expect(resolveEvent(store)).toBeNull();
	});

	it("stores choiceId on major event resolution", () => {
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "active" }],
			activeEventId: "neighbor-cookies",
		});
		const store = createStore(state);

		resolveEvent(store, "accept");

		const event = store
			.getState()
			.events.find((e) => e.id === "neighbor-cookies");
		expect(event?.status).toBe("resolved");
		expect(event?.choiceId).toBe("accept");
	});

	it("applies choice effects for major events", () => {
		const def = getEventDefinition("neighbor-cookies");
		expect(def).toBeDefined();
		const acceptChoice = def?.choices?.find((c) => c.id === "accept");
		expect(acceptChoice).toBeDefined();
		const baseEnergy = acceptChoice?.effects?.energy ?? 0;
		const baseMomentum = acceptChoice?.effects?.momentum ?? 0;
		expect(baseEnergy).not.toBe(0);
		expect(baseMomentum).not.toBe(0);
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "active" }],
			activeEventId: "neighbor-cookies",
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "accept");

		const energy = store.getState().energy;
		const momentum = store.getState().momentum;
		expect(energy).toBeGreaterThan(0.5);
		expect(energy).toBeGreaterThanOrEqual(
			0.5 + baseEnergy * (1 - VARIANCE_FACTOR),
		);
		expect(energy).toBeLessThanOrEqual(
			0.5 + baseEnergy * (1 + VARIANCE_FACTOR),
		);
		expect(momentum).toBeGreaterThan(0.5);
		expect(momentum).toBeGreaterThanOrEqual(
			0.5 + baseMomentum * (1 - VARIANCE_FACTOR),
		);
		expect(momentum).toBeLessThanOrEqual(
			0.5 + baseMomentum * (1 + VARIANCE_FACTOR),
		);
	});

	it("applies no effects for decline choice (no effects defined)", () => {
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "active" }],
			activeEventId: "neighbor-cookies",
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "decline");

		expect(store.getState().energy).toBe(0.5);
		expect(store.getState().momentum).toBe(0.5);
	});

	it("clamps energy effects to [0, 1]", () => {
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "active" }],
			activeEventId: "neighbor-cookies",
			energy: 0.99,
			momentum: 0.99,
		});
		const store = createStore(state);

		resolveEvent(store, "accept");

		expect(store.getState().energy).toBeLessThanOrEqual(1);
		expect(store.getState().momentum).toBeLessThanOrEqual(1);
	});
});

describe("event flag effects", () => {
	it("sets flags via event choice effects", () => {
		// leak-found "call" choice sets "called-maintenance" flag
		const state = createTestState({
			events: [
				{ id: "leak-drip", status: "resolved" },
				{ id: "leak-found", status: "active" },
			],
			activeEventId: "leak-found",
			eventFlags: [],
		});
		const store = createStore(state);

		resolveEvent(store, "call");

		expect(store.getState().eventFlags).toContain("called-maintenance");
	});

	it("does not corrupt flags when choice has no setFlag", () => {
		const state = createTestState({
			events: [{ id: "neighbor-cookies", status: "active" }],
			activeEventId: "neighbor-cookies",
			eventFlags: [],
		});
		const store = createStore(state);

		resolveEvent(store, "accept");

		expect(store.getState().eventFlags).toEqual([]);
	});
});

describe("resolveChoiceContent", () => {
	it("returns single object as-is", () => {
		const content = { label: "Go", description: "Do it" };
		const result = resolveChoiceContent(content, 42);
		expect(result.label).toBe("Go");
		expect(result.description).toBe("Do it");
	});

	it("picks variant from array based on seed", () => {
		const content = [
			{ label: "Go get it", description: "Walk there." },
			{ label: "Just go", description: "Fifteen minutes." },
			{ label: "Hurry", description: "Window closing." },
		];
		const result = resolveChoiceContent(content, 0);
		expect(result.label).toBe("Go get it");

		const result2 = resolveChoiceContent(content, 1);
		expect(result2.label).toBe("Just go");

		const result3 = resolveChoiceContent(content, 2);
		expect(result3.label).toBe("Hurry");
	});

	it("wraps around for large seeds", () => {
		const content = [
			{ label: "A", description: "" },
			{ label: "B", description: "" },
		];
		expect(resolveChoiceContent(content, 100).label).toBe("A"); // 100 % 2 = 0
		expect(resolveChoiceContent(content, 101).label).toBe("B"); // 101 % 2 = 1
	});

	it("returns empty content for undefined", () => {
		const result = resolveChoiceContent(undefined, 42);
		expect(result.label).toBe("");
		expect(result.description).toBe("");
	});

	it("returns empty content for empty array", () => {
		const result = resolveChoiceContent([], 42);
		expect(result.label).toBe("");
	});
});

describe("getEventVariantSeed", () => {
	it("produces different seeds for different event IDs", () => {
		const seed = 12345;
		const a = getEventVariantSeed(seed, "delivery-deadline");
		const b = getEventVariantSeed(seed, "neighbor-cookies");
		expect(a).not.toBe(b);
	});

	it("produces different seeds for different run seeds", () => {
		const a = getEventVariantSeed(100, "delivery-deadline");
		const b = getEventVariantSeed(200, "delivery-deadline");
		expect(a).not.toBe(b);
	});

	it("is deterministic", () => {
		const a = getEventVariantSeed(42, "leak-found");
		const b = getEventVariantSeed(42, "leak-found");
		expect(a).toBe(b);
	});
});

describe("variant choice labels (delivery-deadline)", () => {
	it("recap is structurally bundled with its variant label", () => {
		const seed = 42;
		const variantSeed = getEventVariantSeed(seed, "delivery-deadline");
		const content = getEventContent("delivery-deadline");
		const choices = (content as Record<string, unknown>).choices as
			| Record<string, { label: string; recap: string }[]>
			| undefined;
		const goVariants = choices?.go ?? [];
		const index = variantSeed % goVariants.length;

		// The same variantSeed picks both label and recap from the same object
		const recap = getEventRecap("delivery-deadline", "go", seed);
		expect(goVariants.length).toBeGreaterThan(0);
		expect(recap).toBe(goVariants[index]?.recap ?? null);
	});

	it("different seeds can produce different variants", () => {
		// Try a range of seeds to find at least 2 different recap texts
		const recaps = new Set<string | null>();
		for (let seed = 0; seed < 20; seed++) {
			recaps.add(getEventRecap("delivery-deadline", "go", seed));
		}
		expect(recaps.size).toBeGreaterThan(1);
	});
});

describe("createObligationTask", () => {
	/** Gets the obligation def from an event, throwing if not found. */
	function getObligation(
		eventId: "dentist-reminder" | "vet-reminder" | "work-reminder",
	) {
		const def = getEventDefinition(eventId);
		if (!def?.obligation) throw new Error(`No obligation on ${eventId}`);
		return def.obligation;
	}

	it("creates a task with obligation properties", () => {
		const obligation = getObligation("dentist-reminder");
		const task = createObligationTask(obligation, 3, "dentist-reminder");

		expect(task.id).toBe("dentist-visit");
		expect(task.category).toBe("selfcare");
		expect(task.baseRate).toBe(0.4);
		expect(task.availableBlocks).toEqual(["afternoon"]);
		expect(task.availableDay).toBe(3);
		expect(task.sourceEvent).toBe("dentist-reminder");
		expect(task.isObligation).toBe(true);
		expect(task.failureCount).toBe(0);
		expect(task.succeededToday).toBe(false);
	});

	it("uses i18n name for the task", () => {
		const obligation = getObligation("dentist-reminder");
		const task = createObligationTask(obligation, 2, "dentist-reminder");
		expect(task.name).toBe("Dentist Appointment");
	});

	it("creates vet task with dog category", () => {
		const obligation = getObligation("vet-reminder");
		const task = createObligationTask(obligation, 2, "vet-reminder");
		expect(task.id).toBe("vet-visit");
		expect(task.category).toBe("dog");
		expect(task.baseRate).toBe(0.55);
		expect(task.availableBlocks).toEqual(["morning"]);
	});

	it("creates work deadline task with all blocks", () => {
		const obligation = getObligation("work-reminder");
		const task = createObligationTask(obligation, 4, "work-reminder");
		expect(task.id).toBe("work-deadline");
		expect(task.category).toBe("work");
		expect(task.baseRate).toBe(0.35);
		expect(task.availableBlocks).toEqual([
			"morning",
			"afternoon",
			"evening",
			"night",
		]);
	});
});

describe("activateEvent with obligations", () => {
	it("injects obligation task when notification event fires", () => {
		const state = createTestState({
			events: [
				{
					id: "dentist-reminder",
					status: "pending",
					scheduledDay: 0,
					obligationDay: 3,
				},
			],
			dayIndex: 0,
			day: "monday",
			tasks: [],
		});
		const store = createStore(state);

		const delivery = activateEvent(store, "dentist-reminder");

		expect(delivery).toBe("inline");
		const tasks = store.getState().tasks;
		expect(tasks).toHaveLength(1);
		expect(tasks[0]?.id).toBe("dentist-visit");
		expect(tasks[0]?.availableDay).toBe(3);
		expect(tasks[0]?.isObligation).toBe(true);
	});

	it("does not inject task when no obligationDay is set", () => {
		const state = createTestState({
			events: [
				{
					id: "dentist-reminder",
					status: "pending",
					scheduledDay: 0,
					// no obligationDay
				},
			],
			dayIndex: 0,
			day: "monday",
			tasks: [],
		});
		const store = createStore(state);

		activateEvent(store, "dentist-reminder");

		expect(store.getState().tasks).toHaveLength(0);
	});

	it("sets banner with notification delivery style", () => {
		const state = createTestState({
			events: [
				{
					id: "dentist-reminder",
					status: "pending",
					scheduledDay: 0,
					obligationDay: 3,
				},
			],
			dayIndex: 0,
			day: "monday",
		});
		const store = createStore(state);

		activateEvent(store, "dentist-reminder");

		const banner = store.getState().eventBanner;
		expect(banner).not.toBeNull();
		expect(banner?.style).toBe("notification");
		expect(banner?.text).toContain("Dentist");
		expect(banner?.text).toContain("Thursday");
	});
});

describe("succeedTask effect", () => {
	it("marks specified task as succeeded", () => {
		const workTask: Task = {
			id: "work-deadline" as TaskId,
			name: "Work Deadline",
			category: "work",
			baseRate: 0.35,
			availableBlocks: ["morning", "afternoon", "evening", "night"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
			isObligation: true,
		};
		const state = createTestState({
			events: [{ id: "work-missed", status: "active" }],
			activeEventId: "work-missed",
			tasks: [workTask],
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "do-it-now");

		const task = store.getState().tasks.find((t) => t.id === "work-deadline");
		expect(task?.succeededToday).toBe(true);
	});

	it("applies energy cost for do-it-now choice", () => {
		const workTask: Task = {
			id: "work-deadline" as TaskId,
			name: "Work Deadline",
			category: "work",
			baseRate: 0.35,
			availableBlocks: ["morning", "afternoon", "evening", "night"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
			isObligation: true,
		};
		const state = createTestState({
			events: [{ id: "work-missed", status: "active" }],
			activeEventId: "work-missed",
			tasks: [workTask],
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "do-it-now");

		expect(store.getState().energy).toBeLessThan(0.5);
		expect(store.getState().momentum).toBe(0.5);
	});

	it("applies momentum cost for let-it-go choice", () => {
		const workTask: Task = {
			id: "work-deadline" as TaskId,
			name: "Work Deadline",
			category: "work",
			baseRate: 0.35,
			availableBlocks: ["morning", "afternoon", "evening", "night"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
			isObligation: true,
		};
		const state = createTestState({
			events: [{ id: "work-missed", status: "active" }],
			activeEventId: "work-missed",
			tasks: [workTask],
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "let-it-go");

		expect(store.getState().energy).toBe(0.5);
		expect(store.getState().momentum).toBeLessThan(0.5);
		// Task should NOT be marked succeeded
		const task = store.getState().tasks.find((t) => t.id === "work-deadline");
		expect(task?.succeededToday).toBe(false);
	});
});

describe("obligation consequence conditions", () => {
	it("dentist-missed fires after afternoon block on obligation day", () => {
		const dentistTask: Task = {
			id: "dentist-visit" as TaskId,
			name: "Dentist Appointment",
			category: "selfcare",
			baseRate: 0.4,
			availableBlocks: ["afternoon"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
			isObligation: true,
			availableDay: 3,
		};
		const state = createTestState({
			events: [
				{ id: "dentist-reminder", status: "resolved", scheduledDay: 0 },
				{ id: "dentist-missed", status: "pending", scheduledDay: 3 },
			],
			dayIndex: 3,
			timeBlock: "evening",
			tasks: [dentistTask],
		});

		// Should fire: after afternoon, task not succeeded
		expect(checkForEvent(state, "blockStart")).toBe("dentist-missed");
	});

	it("dentist-missed does not fire during afternoon block", () => {
		const dentistTask: Task = {
			id: "dentist-visit" as TaskId,
			name: "Dentist Appointment",
			category: "selfcare",
			baseRate: 0.4,
			availableBlocks: ["afternoon"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
			isObligation: true,
			availableDay: 3,
		};
		const state = createTestState({
			events: [
				{ id: "dentist-reminder", status: "resolved", scheduledDay: 0 },
				{ id: "dentist-missed", status: "pending", scheduledDay: 3 },
			],
			dayIndex: 3,
			timeBlock: "afternoon",
			tasks: [dentistTask],
		});

		// Should NOT fire: still in afternoon block, player can still attempt
		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("dentist-missed does not fire if task was succeeded", () => {
		const dentistTask: Task = {
			id: "dentist-visit" as TaskId,
			name: "Dentist Appointment",
			category: "selfcare",
			baseRate: 0.4,
			availableBlocks: ["afternoon"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: true,
			isObligation: true,
			availableDay: 3,
		};
		const state = createTestState({
			events: [
				{ id: "dentist-reminder", status: "resolved", scheduledDay: 0 },
				{ id: "dentist-missed", status: "pending", scheduledDay: 3 },
			],
			dayIndex: 3,
			timeBlock: "evening",
			tasks: [dentistTask],
		});

		expect(checkForEvent(state, "blockStart")).toBeNull();
	});

	it("vet-missed fires after morning block on obligation day", () => {
		const vetTask: Task = {
			id: "vet-visit" as TaskId,
			name: "Vet Visit",
			category: "dog",
			baseRate: 0.55,
			availableBlocks: ["morning"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
			isObligation: true,
			availableDay: 2,
		};
		const state = createTestState({
			events: [
				{ id: "vet-reminder", status: "resolved", scheduledDay: 0 },
				{ id: "vet-missed", status: "pending", scheduledDay: 2 },
			],
			dayIndex: 2,
			timeBlock: "afternoon",
			tasks: [vetTask],
		});

		expect(checkForEvent(state, "blockStart")).toBe("vet-missed");
	});

	it("work-missed fires at dayEnd when task not succeeded", () => {
		const workTask: Task = {
			id: "work-deadline" as TaskId,
			name: "Work Deadline",
			category: "work",
			baseRate: 0.35,
			availableBlocks: ["morning", "afternoon", "evening", "night"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
			isObligation: true,
			availableDay: 4,
		};
		const state = createTestState({
			events: [
				{ id: "work-reminder", status: "resolved", scheduledDay: 0 },
				{ id: "work-missed", status: "pending", scheduledDay: 4 },
			],
			dayIndex: 4,
			tasks: [workTask],
		});

		expect(checkForEvent(state, "dayEnd")).toBe("work-missed");
	});

	it("work-missed does not fire if task was succeeded", () => {
		const workTask: Task = {
			id: "work-deadline" as TaskId,
			name: "Work Deadline",
			category: "work",
			baseRate: 0.35,
			availableBlocks: ["morning", "afternoon", "evening", "night"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: true,
			isObligation: true,
			availableDay: 4,
		};
		const state = createTestState({
			events: [
				{ id: "work-reminder", status: "resolved", scheduledDay: 0 },
				{ id: "work-missed", status: "pending", scheduledDay: 4 },
			],
			dayIndex: 4,
			tasks: [workTask],
		});

		expect(checkForEvent(state, "dayEnd")).toBeNull();
	});
});

describe("opportunity events", () => {
	it("rooftop-bbq has 3 choices with correct effects", () => {
		const def = getEventDefinition("rooftop-bbq");
		expect(def).toBeDefined();
		expect(def?.type).toBe("major");
		expect(def?.tier).toBe(2);
		expect(def?.choices).toHaveLength(3);

		const go = def?.choices?.find((c) => c.id === "go");
		expect(go?.effects?.energy).toBeLessThan(0);
		expect(go?.effects?.momentum).toBeGreaterThan(0);

		const stopBy = def?.choices?.find((c) => c.id === "stop-by");
		expect(stopBy?.effects?.energy).toBeLessThan(0);
		expect(stopBy?.effects?.momentum).toBeGreaterThan(0);

		const stayIn = def?.choices?.find((c) => c.id === "stay-in");
		expect(stayIn?.effects?.momentum).toBeLessThan(0);
		expect(stayIn?.effects?.energy).toBeUndefined();
	});

	it("rooftop-bbq fires on saturday dayStart", () => {
		const state = createTestState({
			events: [{ id: "rooftop-bbq", status: "pending", scheduledDay: 5 }],
			day: "saturday",
			dayIndex: 5,
		});
		expect(checkForEvent(state, "dayStart")).toBe("rooftop-bbq");
	});

	it("rooftop-bbq does not fire on weekdays", () => {
		const state = createTestState({
			events: [{ id: "rooftop-bbq", status: "pending" }],
			day: "wednesday",
			dayIndex: 2,
		});
		expect(checkForEvent(state, "dayStart")).toBeNull();
	});

	it("friends-birthday has 3 choices with correct effects", () => {
		const def = getEventDefinition("friends-birthday");
		expect(def).toBeDefined();
		expect(def?.type).toBe("major");
		expect(def?.tier).toBe(2);
		expect(def?.choices).toHaveLength(3);

		const goToParty = def?.choices?.find((c) => c.id === "go-to-party");
		expect(goToParty?.effects?.energy).toBeLessThan(0);
		expect(goToParty?.effects?.momentum).toBeGreaterThan(0);

		const sendMessage = def?.choices?.find((c) => c.id === "send-message");
		expect(sendMessage?.effects?.momentum).toBeGreaterThan(0);
		expect(sendMessage?.effects?.energy).toBeUndefined();

		const textTomorrow = def?.choices?.find((c) => c.id === "text-tomorrow");
		expect(textTomorrow?.effects?.momentum).toBeLessThan(0);
	});

	it("friends-birthday fires on friday or saturday dayStart", () => {
		const stateFriday = createTestState({
			events: [{ id: "friends-birthday", status: "pending", scheduledDay: 4 }],
			day: "friday",
			dayIndex: 4,
		});
		expect(checkForEvent(stateFriday, "dayStart")).toBe("friends-birthday");

		const stateSaturday = createTestState({
			events: [{ id: "friends-birthday", status: "pending", scheduledDay: 5 }],
			day: "saturday",
			dayIndex: 5,
		});
		expect(checkForEvent(stateSaturday, "dayStart")).toBe("friends-birthday");
	});

	it("nice-weather-opportunity has 3 choices with correct effects", () => {
		const def = getEventDefinition("nice-weather-opportunity");
		expect(def).toBeDefined();
		expect(def?.type).toBe("major");
		expect(def?.tier).toBe(2);
		expect(def?.choices).toHaveLength(3);

		const walk = def?.choices?.find((c) => c.id === "go-for-walk");
		expect(walk?.effects?.energy).toBeGreaterThan(0);
		expect(walk?.effects?.momentum).toBeGreaterThan(0);

		const window = def?.choices?.find((c) => c.id === "open-window");
		expect(window?.effects?.momentum).toBeGreaterThan(0);

		const later = def?.choices?.find((c) => c.id === "later");
		expect(later?.effects).toBeUndefined();
	});

	it("nice-weather-opportunity fires on weekdays only", () => {
		const stateWed = createTestState({
			events: [
				{
					id: "nice-weather-opportunity",
					status: "pending",
					scheduledDay: 2,
				},
			],
			day: "wednesday",
			dayIndex: 2,
		});
		expect(checkForEvent(stateWed, "dayStart")).toBe(
			"nice-weather-opportunity",
		);

		// Should not fire on weekend
		const stateSat = createTestState({
			events: [{ id: "nice-weather-opportunity", status: "pending" }],
			day: "saturday",
			dayIndex: 5,
		});
		expect(checkForEvent(stateSat, "dayStart")).toBeNull();
	});

	it("rooftop-bbq applies effects correctly via resolveEvent", () => {
		const state = createTestState({
			events: [{ id: "rooftop-bbq", status: "active" }],
			activeEventId: "rooftop-bbq",
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "go");

		// go: energy -MODERATE, momentum +MAJOR
		expect(store.getState().energy).toBeLessThan(0.5);
		expect(store.getState().momentum).toBeGreaterThan(0.5);
	});

	it("friends-birthday text-tomorrow applies momentum penalty", () => {
		const state = createTestState({
			events: [{ id: "friends-birthday", status: "active" }],
			activeEventId: "friends-birthday",
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "text-tomorrow");

		expect(store.getState().energy).toBe(0.5);
		expect(store.getState().momentum).toBeLessThan(0.5);
	});

	it("nice-weather-opportunity later has no effects", () => {
		const state = createTestState({
			events: [{ id: "nice-weather-opportunity", status: "active" }],
			activeEventId: "nice-weather-opportunity",
			energy: 0.5,
			momentum: 0.5,
		});
		const store = createStore(state);

		resolveEvent(store, "later");

		expect(store.getState().energy).toBe(0.5);
		expect(store.getState().momentum).toBe(0.5);
	});

	it("rooftop-bbq variant labels produce multiple variants across seeds", () => {
		const recaps = new Set<string | null>();
		for (let seed = 0; seed < 30; seed++) {
			recaps.add(getEventRecap("rooftop-bbq", "go", seed));
		}
		expect(recaps.size).toBeGreaterThan(1);
	});

	it("friends-birthday variant labels produce multiple variants across seeds", () => {
		const recaps = new Set<string | null>();
		for (let seed = 0; seed < 30; seed++) {
			recaps.add(getEventRecap("friends-birthday", "go-to-party", seed));
		}
		expect(recaps.size).toBeGreaterThan(1);
	});

	it("nice-weather-opportunity recap works for each choice", () => {
		const walkRecap = getEventRecap(
			"nice-weather-opportunity",
			"go-for-walk",
			42,
		);
		expect(walkRecap).not.toBeNull();
		expect(typeof walkRecap).toBe("string");

		const windowRecap = getEventRecap(
			"nice-weather-opportunity",
			"open-window",
			42,
		);
		expect(windowRecap).not.toBeNull();

		const laterRecap = getEventRecap("nice-weather-opportunity", "later", 42);
		expect(laterRecap).not.toBeNull();
	});

	it("opportunity events are all standalone (no arcId)", () => {
		for (const id of [
			"rooftop-bbq",
			"friends-birthday",
			"nice-weather-opportunity",
		] as const) {
			const def = getEventDefinition(id);
			expect(def?.arcId).toBeUndefined();
		}
	});
});

describe("contextual task variants (modifyTask)", () => {
	/** Creates a cook task matching the default pool. */
	function makeCookTask(): Task {
		return {
			id: "cook" as TaskId,
			name: "Cook Meal",
			category: "food",
			baseRate: 0.1,
			minimalVariant: {
				name: "Microwave something",
				baseRate: 0.5,
				unlockHints: ["hint"],
			},
			availableBlocks: ["morning", "afternoon", "evening"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
		};
	}

	it("neighbor-hello has a modifyTask targeting cook", () => {
		const def = getEventDefinition("neighbor-hello");
		expect(def?.modifyTask).toBeDefined();
		expect(def?.modifyTask?.taskId).toBe("cook");
		expect(def?.modifyTask?.baseRate).toBeDefined();
	});

	it("changes task name and sets contextModifiedBy", () => {
		const state = createTestState({ tasks: [makeCookTask()] });
		const store = createStore(state);

		applyTaskModification(store, "neighbor-hello", {
			taskId: "cook",
			baseRate: 0.08,
		});

		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.name).toBe("Cook for Neighbor");
		expect(task?.contextModifiedBy).toBe("neighbor-hello");
	});

	it("changes task baseRate when specified", () => {
		const state = createTestState({ tasks: [makeCookTask()] });
		const store = createStore(state);

		applyTaskModification(store, "neighbor-hello", {
			taskId: "cook",
			baseRate: 0.08,
		});

		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.baseRate).toBe(0.08);
	});

	it("updates minimalVariant name when variant exists", () => {
		const state = createTestState({ tasks: [makeCookTask()] });
		const store = createStore(state);

		applyTaskModification(store, "neighbor-hello", {
			taskId: "cook",
			baseRate: 0.08,
		});

		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.minimalVariant?.name).toBe("Order Pizza for Neighbor");
	});

	it("preserves minimalVariant baseRate", () => {
		const state = createTestState({ tasks: [makeCookTask()] });
		const store = createStore(state);

		applyTaskModification(store, "neighbor-hello", {
			taskId: "cook",
			baseRate: 0.08,
		});

		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.minimalVariant?.baseRate).toBe(0.5);
	});

	it("does nothing when task is not in pool", () => {
		const otherTask: Task = {
			id: "shower" as TaskId,
			name: "Shower",
			category: "hygiene",
			baseRate: 0.35,
			availableBlocks: ["morning", "evening"],
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
		};
		const state = createTestState({ tasks: [otherTask] });
		const store = createStore(state);

		applyTaskModification(store, "neighbor-hello", {
			taskId: "cook",
			baseRate: 0.08,
		});

		// Tasks unchanged
		expect(store.getState().tasks).toHaveLength(1);
		expect(store.getState().tasks[0]?.name).toBe("Shower");
	});

	it("activateEvent applies modifyTask for minor events", () => {
		const state = createTestState({
			events: [{ id: "neighbor-hello", status: "pending" }],
			day: "tuesday",
			dayIndex: 1,
			timeBlock: "afternoon",
			tasks: [makeCookTask()],
		});
		const store = createStore(state);

		const delivery = activateEvent(store, "neighbor-hello");

		expect(delivery).toBe("inline");
		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.name).toBe("Cook for Neighbor");
		expect(task?.baseRate).toBe(0.08);
		expect(task?.minimalVariant?.name).toBe("Order Pizza for Neighbor");
	});

	it("does not modify task when cook is absent from seed pool", () => {
		const state = createTestState({
			events: [{ id: "neighbor-hello", status: "pending" }],
			day: "tuesday",
			dayIndex: 1,
			timeBlock: "afternoon",
			tasks: [],
		});
		const store = createStore(state);

		activateEvent(store, "neighbor-hello");

		expect(store.getState().tasks).toHaveLength(0);
	});

	it("still applies momentum effect alongside task modification", () => {
		const state = createTestState({
			events: [{ id: "neighbor-hello", status: "pending" }],
			day: "tuesday",
			dayIndex: 1,
			timeBlock: "afternoon",
			tasks: [makeCookTask()],
			momentum: 0.5,
		});
		const store = createStore(state);

		activateEvent(store, "neighbor-hello");

		// neighbor-hello has effects: { momentum: M.NUDGE (0.03) }
		expect(store.getState().momentum).toBeGreaterThan(0.5);
	});

	it("revertTaskModification restores original name and rate", () => {
		const state = createTestState({ tasks: [makeCookTask()] });
		const store = createStore(state);

		applyTaskModification(store, "neighbor-hello", {
			taskId: "cook",
			baseRate: 0.08,
		});
		expect(store.getState().tasks.find((t) => t.id === "cook")?.name).toBe(
			"Cook for Neighbor",
		);

		revertTaskModification(store, "cook" as TaskId);

		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.name).toBe("Cook Meal");
		expect(task?.baseRate).toBe(0.1);
		expect(task?.contextModifiedBy).toBeUndefined();
	});

	it("revertTaskModification restores minimalVariant name", () => {
		const state = createTestState({ tasks: [makeCookTask()] });
		const store = createStore(state);

		applyTaskModification(store, "neighbor-hello", {
			taskId: "cook",
			baseRate: 0.08,
		});
		expect(
			store.getState().tasks.find((t) => t.id === "cook")?.minimalVariant?.name,
		).toBe("Order Pizza for Neighbor");

		revertTaskModification(store, "cook" as TaskId);

		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.minimalVariant?.name).toBe("Microwave something");
		expect(task?.minimalVariant?.baseRate).toBe(0.5);
	});

	it("revertTaskModification does nothing if task not modified", () => {
		const state = createTestState({ tasks: [makeCookTask()] });
		const store = createStore(state);

		// No modification applied -- revert should be a no-op
		revertTaskModification(store, "cook" as TaskId);

		const task = store.getState().tasks.find((t) => t.id === "cook");
		expect(task?.name).toBe("Cook Meal");
		expect(task?.baseRate).toBe(0.1);
	});

	describe("friend-visits", () => {
		it("has a modifyTask targeting cook with higher rate", () => {
			const def = getEventDefinition("friend-visits");
			expect(def?.modifyTask).toBeDefined();
			expect(def?.modifyTask?.taskId).toBe("cook");
			expect(def?.modifyTask?.baseRate).toBeGreaterThan(0.1);
		});

		it("changes task name to Cook for Friend", () => {
			const state = createTestState({ tasks: [makeCookTask()] });
			const store = createStore(state);

			applyTaskModification(store, "friend-visits", {
				taskId: "cook",
				baseRate: 0.13,
			});

			const task = store.getState().tasks.find((t) => t.id === "cook");
			expect(task?.name).toBe("Cook for Friend");
			expect(task?.contextModifiedBy).toBe("friend-visits");
		});

		it("sets easier baseRate (motivated by social context)", () => {
			const state = createTestState({ tasks: [makeCookTask()] });
			const store = createStore(state);

			applyTaskModification(store, "friend-visits", {
				taskId: "cook",
				baseRate: 0.13,
			});

			const task = store.getState().tasks.find((t) => t.id === "cook");
			expect(task?.baseRate).toBe(0.13);
		});

		it("updates minimalVariant name", () => {
			const state = createTestState({ tasks: [makeCookTask()] });
			const store = createStore(state);

			applyTaskModification(store, "friend-visits", {
				taskId: "cook",
				baseRate: 0.13,
			});

			const task = store.getState().tasks.find((t) => t.id === "cook");
			expect(task?.minimalVariant?.name).toBe("Order Pizza for Friend");
		});

		it("activateEvent applies modification inline", () => {
			const state = createTestState({
				events: [{ id: "friend-visits", status: "pending" }],
				day: "thursday",
				dayIndex: 3,
				timeBlock: "evening",
				tasks: [makeCookTask()],
			});
			const store = createStore(state);

			const delivery = activateEvent(store, "friend-visits");

			expect(delivery).toBe("inline");
			const task = store.getState().tasks.find((t) => t.id === "cook");
			expect(task?.name).toBe("Cook for Friend");
			expect(task?.baseRate).toBe(0.13);
			expect(task?.minimalVariant?.name).toBe("Order Pizza for Friend");
		});

		it("does not fire when cook is already contextually modified", () => {
			const modifiedCook = {
				...makeCookTask(),
				name: "Cook for Neighbor",
				baseRate: 0.08,
				contextModifiedBy: "neighbor-hello" as const,
			};
			const state = createTestState({
				events: [{ id: "friend-visits", status: "pending" }],
				day: "thursday",
				dayIndex: 3,
				timeBlock: "evening",
				tasks: [modifiedCook],
			});

			const def = getEventDefinition("friend-visits");
			expect(def?.condition?.(state)).toBe(false);
		});

		it("fires when cook has no active modification", () => {
			const state = createTestState({
				events: [{ id: "friend-visits", status: "pending" }],
				day: "thursday",
				dayIndex: 3,
				timeBlock: "evening",
				tasks: [makeCookTask()],
			});

			const def = getEventDefinition("friend-visits");
			expect(def?.condition?.(state)).toBe(true);
		});

		it("fires after neighbor modification is reverted via success", () => {
			const state = createTestState({
				events: [{ id: "friend-visits", status: "pending" }],
				day: "friday",
				dayIndex: 4,
				timeBlock: "afternoon",
				tasks: [makeCookTask()], // no contextModifiedBy = reverted
			});

			const def = getEventDefinition("friend-visits");
			expect(def?.condition?.(state)).toBe(true);
		});

		it("uses message delivery style", () => {
			const def = getEventDefinition("friend-visits");
			expect(def?.deliveryStyle).toBe("message");
		});
	});
});

describe("consequence ripple (skipCurrentBlock)", () => {
	it("leak-worse has skipCurrentBlock in its effects", () => {
		const def = getEventDefinition("leak-worse");
		expect(def?.effects?.skipCurrentBlock).toBe(true);
	});

	it("leak-worse still has momentum and energy penalties", () => {
		const def = getEventDefinition("leak-worse");
		expect(def?.effects?.momentum).toBeLessThan(0);
		expect(def?.effects?.energy).toBeLessThan(0);
	});

	it("skipCurrentBlock sets slotsRemaining to 0 on weekday", () => {
		const state = createTestState({
			events: [
				{ id: "leak-drip", status: "resolved" },
				{
					id: "leak-found",
					status: "resolved",
					choiceId: "towel",
				},
				{ id: "leak-worse", status: "pending", scheduledDay: 4 },
			],
			eventFlags: ["leak-ignored"],
			day: "friday",
			dayIndex: 4,
			timeBlock: "morning",
			slotsRemaining: 3,
			momentum: 0.5,
			energy: 0.5,
		});
		const store = createStore(state);

		activateEvent(store, "leak-worse");

		expect(store.getState().slotsRemaining).toBe(0);
	});

	it("skipCurrentBlock deducts weekend points on weekend", () => {
		const state = createTestState({
			events: [
				{ id: "leak-drip", status: "resolved" },
				{
					id: "leak-found",
					status: "resolved",
					choiceId: "towel",
				},
				{ id: "leak-worse", status: "pending", scheduledDay: 5 },
			],
			eventFlags: ["leak-ignored"],
			day: "saturday",
			dayIndex: 5,
			weekendPointsRemaining: 8,
			momentum: 0.5,
			energy: 0.5,
		});
		const store = createStore(state);

		activateEvent(store, "leak-worse");

		expect(store.getState().weekendPointsRemaining).toBe(5);
	});

	it("skipCurrentBlock weekend deduction does not go below 0", () => {
		const state = createTestState({
			events: [
				{ id: "leak-drip", status: "resolved" },
				{
					id: "leak-found",
					status: "resolved",
					choiceId: "towel",
				},
				{ id: "leak-worse", status: "pending", scheduledDay: 5 },
			],
			eventFlags: ["leak-ignored"],
			day: "saturday",
			dayIndex: 5,
			weekendPointsRemaining: 1,
			momentum: 0.5,
			energy: 0.5,
		});
		const store = createStore(state);

		activateEvent(store, "leak-worse");

		expect(store.getState().weekendPointsRemaining).toBe(0);
	});

	it("applies momentum and energy effects alongside skipCurrentBlock", () => {
		const state = createTestState({
			events: [
				{ id: "leak-drip", status: "resolved" },
				{
					id: "leak-found",
					status: "resolved",
					choiceId: "towel",
				},
				{ id: "leak-worse", status: "pending", scheduledDay: 4 },
			],
			eventFlags: ["leak-ignored"],
			day: "friday",
			dayIndex: 4,
			timeBlock: "morning",
			slotsRemaining: 3,
			momentum: 0.5,
			energy: 0.5,
		});
		const store = createStore(state);

		activateEvent(store, "leak-worse");

		// Slots consumed AND momentum/energy hit
		expect(store.getState().slotsRemaining).toBe(0);
		expect(store.getState().momentum).toBeLessThan(0.5);
		expect(store.getState().energy).toBeLessThan(0.5);
	});
});
