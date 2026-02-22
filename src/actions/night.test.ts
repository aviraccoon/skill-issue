import { describe, expect, test } from "bun:test";
import { createTestStore } from "../test-utils";
import { chooseSleep, pushThrough } from "./night";

describe("chooseSleep", () => {
	test("sets screen to daySummary", () => {
		const store = createTestStore();
		chooseSleep(store);
		expect(store.get("screen")).toBe("daySummary");
	});
});

describe("pushThrough", () => {
	test("sets inExtendedNight to true", () => {
		const store = createTestStore();
		pushThrough(store);
		expect(store.get("inExtendedNight")).toBe(true);
	});

	test("sets screen to game", () => {
		const store = createTestStore();
		pushThrough(store);
		expect(store.get("screen")).toBe("game");
	});

	test("grants slots based on energy", () => {
		const store = createTestStore({ energy: 0.8 });
		const result = pushThrough(store);
		expect(result.slots).toBeGreaterThan(0);
		expect(store.get("slotsRemaining")).toBe(result.slots);
	});

	test("returns slots in result", () => {
		const store = createTestStore({ energy: 0.5 });
		const result = pushThrough(store);
		expect(typeof result.slots).toBe("number");
		expect(result.slots).toBeGreaterThanOrEqual(1);
	});

	test("high energy grants more slots than low energy", () => {
		const highStore = createTestStore({ energy: 0.9 });
		const lowStore = createTestStore({ energy: 0.1 });
		const highResult = pushThrough(highStore);
		const lowResult = pushThrough(lowStore);
		expect(highResult.slots).toBeGreaterThanOrEqual(lowResult.slots);
	});

	test("increments allNighters in runStats", () => {
		const store = createTestStore();
		pushThrough(store);
		expect(store.get("runStats").allNighters).toBe(1);
	});

	test("increments allNighters cumulatively", () => {
		const store = createTestStore();
		// Simulate first all-nighter stat already recorded
		store.update("runStats", (s) => ({ ...s, allNighters: 1 }));
		pushThrough(store);
		expect(store.get("runStats").allNighters).toBe(2);
	});
});
