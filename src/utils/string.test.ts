import { describe, expect, test } from "bun:test";
import { capitalize } from "./string";

describe("capitalize", () => {
	test("capitalizes first letter", () => {
		expect(capitalize("monday")).toBe("Monday");
	});

	test("handles already capitalized", () => {
		expect(capitalize("Monday")).toBe("Monday");
	});

	test("handles single character", () => {
		expect(capitalize("a")).toBe("A");
	});

	test("handles empty string", () => {
		expect(capitalize("")).toBe("");
	});
});
