import { describe, expect, it } from "bun:test";
import { getEventDefinition } from "../data/events";
import { createInitialState, type GameState } from "../state";
import { createStore } from "../store";
import { activateEvent, checkForEvent, resolveEvent } from "./events";

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
