import { describe, expect, test } from "bun:test";
import { hashString, seededShuffle } from "./random";

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
