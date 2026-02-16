import { describe, expect, it } from "bun:test";
import { taskStatics } from "../data/tasks";
import type { Personality } from "./personality";
import { getPersonalityFromSeed } from "./personality";
import { selectTasksForSeed } from "./taskSelection";

const CORE_TASKS = taskStatics.filter((ts) => ts.core).map((ts) => ts.id);

/** Food tasks tagged "low" (guaranteed in every run). */
const FOOD_LOW = taskStatics
	.filter((ts) => ts.category === "food" && ts.selectionTag === "low")
	.map((ts) => ts.id);

/** Food tasks tagged "high" (at least one guaranteed). */
const FOOD_HIGH = taskStatics
	.filter((ts) => ts.category === "food" && ts.selectionTag === "high")
	.map((ts) => ts.id);

function personality(
	time: Personality["time"],
	social: Personality["social"],
): Personality {
	return { time, social };
}

describe("selectTasksForSeed", () => {
	it("always includes core tasks", () => {
		for (let seed = 0; seed < 200; seed++) {
			const p = getPersonalityFromSeed(seed);
			const tasks = selectTasksForSeed(seed, p);
			for (const core of CORE_TASKS) {
				expect(tasks).toContain(core);
			}
		}
	});

	it("always includes at least one low-success food task", () => {
		for (let seed = 0; seed < 200; seed++) {
			const p = getPersonalityFromSeed(seed);
			const tasks = selectTasksForSeed(seed, p);
			const hasLow = tasks.some((id) => FOOD_LOW.includes(id));
			expect(hasLow).toBe(true);
		}
	});

	it("always includes at least one high-success food task", () => {
		for (let seed = 0; seed < 200; seed++) {
			const p = getPersonalityFromSeed(seed);
			const tasks = selectTasksForSeed(seed, p);
			const hasHigh = tasks.some((id) => FOOD_HIGH.includes(id));
			expect(hasHigh).toBe(true);
		}
	});

	it("returns 10-14 tasks", () => {
		for (let seed = 0; seed < 500; seed++) {
			const p = getPersonalityFromSeed(seed);
			const tasks = selectTasksForSeed(seed, p);
			expect(tasks.length).toBeGreaterThanOrEqual(10);
			expect(tasks.length).toBeLessThanOrEqual(14);
		}
	});

	it("contains no duplicates", () => {
		for (let seed = 0; seed < 200; seed++) {
			const p = getPersonalityFromSeed(seed);
			const tasks = selectTasksForSeed(seed, p);
			expect(new Set(tasks).size).toBe(tasks.length);
		}
	});

	it("is deterministic (same seed + personality = same tasks)", () => {
		const p = personality("nightOwl", "hermit");
		for (let seed = 0; seed < 100; seed++) {
			const a = selectTasksForSeed(seed, p);
			const b = selectTasksForSeed(seed, p);
			expect(a).toEqual(b);
		}
	});

	it("different seeds produce different selections", () => {
		const p = personality("neutral", "neutral");
		const selections = new Set<string>();
		for (let seed = 0; seed < 100; seed++) {
			const tasks = selectTasksForSeed(seed, p);
			selections.add(tasks.sort().join(","));
		}
		// With 100 seeds, we should get meaningful variety
		expect(selections.size).toBeGreaterThan(5);
	});

	it("hermit personality gets fewer social tasks than socialBattery", () => {
		let hermitSocial = 0;
		let batterySocial = 0;
		const socialIds = new Set(
			taskStatics.filter((ts) => ts.category === "social").map((ts) => ts.id),
		);

		const runs = 200;
		for (let seed = 0; seed < runs; seed++) {
			const hermit = selectTasksForSeed(seed, personality("neutral", "hermit"));
			const battery = selectTasksForSeed(
				seed,
				personality("neutral", "socialBattery"),
			);
			hermitSocial += hermit.filter((id) => socialIds.has(id)).length;
			batterySocial += battery.filter((id) => socialIds.has(id)).length;
		}

		// socialBattery should average more social tasks than hermit
		expect(batterySocial / runs).toBeGreaterThan(hermitSocial / runs);
	});

	it("only returns valid TaskIds from taskStatics", () => {
		const validIds = new Set(taskStatics.map((ts) => ts.id));
		for (let seed = 0; seed < 100; seed++) {
			const p = getPersonalityFromSeed(seed);
			const tasks = selectTasksForSeed(seed, p);
			for (const id of tasks) {
				expect(validIds.has(id)).toBe(true);
			}
		}
	});
});
