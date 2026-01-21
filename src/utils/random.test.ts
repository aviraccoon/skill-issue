import { describe, expect, test } from "bun:test";
import { hashString, nextRoll, seededShuffle } from "./random";

describe("hashString", () => {
	test("returns same hash for same string", () => {
		expect(hashString("test")).toBe(hashString("test"));
	});

	test("returns different hash for different strings", () => {
		expect(hashString("test")).not.toBe(hashString("other"));
	});

	test("returns non-negative number", () => {
		expect(hashString("anything")).toBeGreaterThanOrEqual(0);
		expect(hashString("")).toBeGreaterThanOrEqual(0);
	});
});

describe("seededShuffle", () => {
	test("returns array of same length", () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = seededShuffle(arr, 12345);
		expect(shuffled.length).toBe(arr.length);
	});

	test("contains same elements", () => {
		const arr = [1, 2, 3, 4, 5];
		const shuffled = seededShuffle(arr, 12345);
		expect(shuffled.sort()).toEqual(arr.sort());
	});

	test("does not mutate original array", () => {
		const arr = [1, 2, 3, 4, 5];
		const original = [...arr];
		seededShuffle(arr, 12345);
		expect(arr).toEqual(original);
	});

	test("same seed produces same order", () => {
		const arr = ["a", "b", "c", "d", "e"];
		const first = seededShuffle(arr, 42);
		const second = seededShuffle(arr, 42);
		expect(first).toEqual(second);
	});

	test("different seeds produce different orders", () => {
		const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
		const results = new Set<string>();
		for (let seed = 0; seed < 10; seed++) {
			results.add(JSON.stringify(seededShuffle(arr, seed * 1000)));
		}
		// With 10 different seeds, should get multiple different orderings
		expect(results.size).toBeGreaterThan(1);
	});

	test("handles empty array", () => {
		expect(seededShuffle([], 123)).toEqual([]);
	});

	test("handles single element", () => {
		expect(seededShuffle([1], 123)).toEqual([1]);
	});
});

describe("nextRoll", () => {
	function createMockStore(seed: number, rollCount = 0) {
		let state = { runSeed: seed, rollCount };
		return {
			getState: () => state,
			set: (key: "rollCount", value: number) => {
				state = { ...state, [key]: value };
			},
		};
	}

	test("returns value in [0, 1) range", () => {
		const store = createMockStore(12345);
		for (let i = 0; i < 100; i++) {
			const value = nextRoll(store);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	test("increments rollCount each call", () => {
		const store = createMockStore(12345);
		expect(store.getState().rollCount).toBe(0);

		nextRoll(store);
		expect(store.getState().rollCount).toBe(1);

		nextRoll(store);
		expect(store.getState().rollCount).toBe(2);

		nextRoll(store);
		expect(store.getState().rollCount).toBe(3);
	});

	test("same seed + same rollCount gives same value", () => {
		const store1 = createMockStore(42, 5);
		const store2 = createMockStore(42, 5);

		expect(nextRoll(store1)).toBe(nextRoll(store2));
	});

	test("same seed + different rollCount gives different values", () => {
		const store = createMockStore(42);
		const values: number[] = [];
		for (let i = 0; i < 10; i++) {
			values.push(nextRoll(store));
		}
		// All values should be unique
		const unique = new Set(values);
		expect(unique.size).toBe(10);
	});

	test("different seeds give different sequences", () => {
		const store1 = createMockStore(100);
		const store2 = createMockStore(200);

		const seq1 = [nextRoll(store1), nextRoll(store1), nextRoll(store1)];
		const seq2 = [nextRoll(store2), nextRoll(store2), nextRoll(store2)];

		expect(seq1).not.toEqual(seq2);
	});

	test("deterministic across fresh stores with same initial state", () => {
		// Simulate what happens in CLI: create store, run simulation, recreate store, run again
		const runSimulation = (seed: number) => {
			const store = createMockStore(seed);
			const rolls: number[] = [];
			for (let i = 0; i < 5; i++) {
				rolls.push(nextRoll(store));
			}
			return rolls;
		};

		const run1 = runSimulation(12345);
		const run2 = runSimulation(12345);

		expect(run1).toEqual(run2);
	});
});
