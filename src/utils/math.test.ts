import { describe, expect, test } from "bun:test";
import { clamp } from "./math";

describe("clamp", () => {
	test("returns value when within range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	test("returns min when value is below", () => {
		expect(clamp(-5, 0, 10)).toBe(0);
	});

	test("returns max when value is above", () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});

	test("handles equal min and max", () => {
		expect(clamp(5, 3, 3)).toBe(3);
	});

	test("works with decimals", () => {
		expect(clamp(0.5, 0, 1)).toBe(0.5);
		expect(clamp(-0.1, 0, 1)).toBe(0);
		expect(clamp(1.5, 0, 1)).toBe(1);
	});
});
