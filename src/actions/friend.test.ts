import { describe, expect, test } from "bun:test";
import { createTestStore, getActivity } from "../test-utils";
import { acceptFriendRescue, declineFriendRescue } from "./friend";

describe("acceptFriendRescue", () => {
	test("returns result with momentum and energy changes", () => {
		const store = createTestStore();
		const result = acceptFriendRescue(store, getActivity("low"));
		expect(typeof result.momentumChange).toBe("number");
		expect(typeof result.energyChange).toBe("number");
		expect(typeof result.correct).toBe("boolean");
		expect(typeof result.hint).toBe("string");
	});

	test("applies momentum change", () => {
		const store = createTestStore({ momentum: 0.3 });
		const result = acceptFriendRescue(store, getActivity("low"));
		expect(store.get("momentum")).toBeCloseTo(0.3 + result.momentumChange, 5);
	});

	test("applies energy change", () => {
		const store = createTestStore({ energy: 0.5 });
		const result = acceptFriendRescue(store, getActivity("low"));
		expect(store.get("energy")).toBeCloseTo(0.5 + result.energyChange, 5);
	});

	test("clamps momentum to [0, 1]", () => {
		const store = createTestStore({ momentum: 0.95 });
		acceptFriendRescue(store, getActivity("low"));
		expect(store.get("momentum")).toBeLessThanOrEqual(1);
		expect(store.get("momentum")).toBeGreaterThanOrEqual(0);
	});

	test("clamps energy to [0, 1]", () => {
		const store = createTestStore({ energy: 0.95 });
		acceptFriendRescue(store, getActivity("low"));
		expect(store.get("energy")).toBeLessThanOrEqual(1);
		expect(store.get("energy")).toBeGreaterThanOrEqual(0);
	});

	test("marks friendRescueUsedToday", () => {
		const store = createTestStore();
		acceptFriendRescue(store, getActivity("low"));
		expect(store.get("friendRescueUsedToday")).toBe(true);
	});

	test("resets consecutiveFailures to 0", () => {
		const store = createTestStore({ consecutiveFailures: 5 });
		acceptFriendRescue(store, getActivity("low"));
		expect(store.get("consecutiveFailures")).toBe(0);
	});

	test("consumes slot cost on weekday", () => {
		const store = createTestStore({ slotsRemaining: 3, dayIndex: 0 });
		acceptFriendRescue(store, getActivity("low"));
		expect(store.get("slotsRemaining")).toBe(2); // Cost is 1 on weekday
	});

	test("consumes point cost on weekend", () => {
		const store = createTestStore({
			dayIndex: 5,
			weekendPointsRemaining: 8,
		});
		acceptFriendRescue(store, getActivity("low"));
		expect(store.get("weekendPointsRemaining")).toBe(6); // Cost is 2 on weekend
	});

	test("increments runStats.friendRescues.accepted", () => {
		const store = createTestStore();
		acceptFriendRescue(store, getActivity("low"));
		expect(store.get("runStats").friendRescues.accepted).toBe(1);
	});

	test("reports correct tier for matching energy", () => {
		// Low tier threshold is 0.2, energy 0.5 is above it
		const store = createTestStore({ energy: 0.5 });
		const result = acceptFriendRescue(store, getActivity("low"));
		expect(result.correct).toBe(true);
	});

	test("reports wrong tier for mismatched energy", () => {
		// High tier threshold is 0.7, energy 0.3 is below it
		const store = createTestStore({ energy: 0.3 });
		const result = acceptFriendRescue(store, getActivity("high"));
		expect(result.correct).toBe(false);
	});

	test("returns a hint string", () => {
		const store = createTestStore();
		const result = acceptFriendRescue(store, getActivity("low"));
		expect(result.hint.length).toBeGreaterThan(0);
	});
});

describe("declineFriendRescue", () => {
	test("resets consecutiveFailures to 0", () => {
		const store = createTestStore({ consecutiveFailures: 4 });
		declineFriendRescue(store);
		expect(store.get("consecutiveFailures")).toBe(0);
	});

	test("marks friendRescueUsedToday", () => {
		const store = createTestStore();
		declineFriendRescue(store);
		expect(store.get("friendRescueUsedToday")).toBe(true);
	});

	test("does not change momentum", () => {
		const store = createTestStore({ momentum: 0.3 });
		declineFriendRescue(store);
		expect(store.get("momentum")).toBe(0.3);
	});

	test("does not change energy", () => {
		const store = createTestStore({ energy: 0.5 });
		declineFriendRescue(store);
		expect(store.get("energy")).toBe(0.5);
	});

	test("does not consume slots", () => {
		const store = createTestStore({ slotsRemaining: 3 });
		declineFriendRescue(store);
		expect(store.get("slotsRemaining")).toBe(3);
	});
});
