import { describe, expect, test } from "bun:test";
import type { Task } from "../state";
import { getEvolutionStage, getEvolvedDescription } from "./evolution";

function makeTask(
	failureCount: number,
	options: { hasEvolution?: boolean } = {},
): Task {
	const { hasEvolution = true } = options;
	return {
		id: "dishes",
		name: "Test Task",
		category: "chores",
		baseRate: 0.5,
		availableBlocks: ["morning"],
		failureCount,
		attemptedToday: false,
		succeededToday: false,
		...(hasEvolution && {
			evolution: {
				aware: ["Test Task - You should", "Test Task - Aware variant 2"],
				honest: ["The Test Situation", "Honest variant 2"],
				resigned: ["Testing. A concept.", "Resigned variant 2"],
			},
		}),
	};
}

describe("getEvolutionStage", () => {
	test("returns neutral for 0 failures", () => {
		expect(getEvolutionStage(0)).toBe("neutral");
	});

	test("returns neutral for 1 failure", () => {
		expect(getEvolutionStage(1)).toBe("neutral");
	});

	test("returns aware for 2 failures", () => {
		expect(getEvolutionStage(2)).toBe("aware");
	});

	test("returns aware for 3 failures", () => {
		expect(getEvolutionStage(3)).toBe("aware");
	});

	test("returns honest for 4 failures", () => {
		expect(getEvolutionStage(4)).toBe("honest");
	});

	test("returns honest for 5 failures", () => {
		expect(getEvolutionStage(5)).toBe("honest");
	});

	test("returns resigned for 6+ failures", () => {
		expect(getEvolutionStage(6)).toBe("resigned");
		expect(getEvolutionStage(10)).toBe("resigned");
		expect(getEvolutionStage(100)).toBe("resigned");
	});
});

describe("getEvolvedDescription", () => {
	const seed = 12345;

	test("returns original name at neutral stage", () => {
		const task = makeTask(0);
		expect(getEvolvedDescription(task, seed)).toBe("Test Task");
	});

	test("returns a variant from aware array at 2-3 failures", () => {
		const task = makeTask(2);
		const result = getEvolvedDescription(task, seed);
		expect(["Test Task - You should", "Test Task - Aware variant 2"]).toContain(
			result,
		);
	});

	test("returns a variant from honest array at 4-5 failures", () => {
		const task = makeTask(4);
		const result = getEvolvedDescription(task, seed);
		expect(["The Test Situation", "Honest variant 2"]).toContain(result);
	});

	test("returns a variant from resigned array at 6+ failures", () => {
		const task = makeTask(6);
		const result = getEvolvedDescription(task, seed);
		expect(["Testing. A concept.", "Resigned variant 2"]).toContain(result);
	});

	test("falls back to name when no evolution defined", () => {
		const task = makeTask(5, { hasEvolution: false });
		expect(getEvolvedDescription(task, seed)).toBe("Test Task");
	});

	test("returns same variant for same task id and seed (deterministic)", () => {
		const task1 = makeTask(4);
		const task2 = makeTask(4);
		expect(getEvolvedDescription(task1, seed)).toBe(
			getEvolvedDescription(task2, seed),
		);
	});

	test("different seeds can produce different variants", () => {
		const task = makeTask(4);
		const results = new Set<string>();
		for (let i = 0; i < 20; i++) {
			results.add(getEvolvedDescription(task, i * 1000));
		}
		// With 20 different seeds and 2 variants, we should hit both
		expect(results.size).toBeGreaterThanOrEqual(2);
	});
});
