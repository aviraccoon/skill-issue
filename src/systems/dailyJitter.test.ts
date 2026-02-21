import { describe, expect, test } from "bun:test";
import { createInitialTasks } from "../data/tasks";
import {
	SLOTS_PER_BLOCK,
	TIME_BLOCKS,
	type TimeBlock,
} from "../data/timeBlocks";
import type { Task } from "../state";
import { getDayBlocks } from "./dailyJitter";
import { getPersonalityFromSeed } from "./personality";
import { selectTasksForSeed } from "./taskSelection";

/** Creates a minimal task for testing. */
function makeTask(id: string, blocks: TimeBlock[]): Task {
	return {
		id: id as Task["id"],
		name: id,
		category: "chores",
		baseRate: 0.5,
		availableBlocks: blocks,
		failureCount: 0,
		successCount: 0,
		attemptedToday: false,
		succeededToday: false,
	};
}

/**
 * Creates a large synthetic pool where no block falls below 3 after jitter.
 * This lets us test jitter behavior without the minimum guarantee interfering.
 */
function makeLargePool(): Task[] {
	return [
		// 8 three-block tasks covering morning/afternoon/evening
		...Array.from({ length: 8 }, (_, i) =>
			makeTask(`three-${i}`, ["morning", "afternoon", "evening"]),
		),
		// 10 four-block tasks -- enough that night stays well above 3 after jitter
		...Array.from({ length: 10 }, (_, i) =>
			makeTask(`four-${i}`, ["morning", "afternoon", "evening", "night"]),
		),
	];
}

describe("getDayBlocks", () => {
	test("single-block tasks are unchanged", () => {
		const pool = makeLargePool();
		const singleBlock = makeTask("single-a", ["morning"]);
		pool.push(singleBlock);

		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(pool, day, 42);
			expect(result.get("single-a" as Task["id"])).toEqual(["morning"]);
		}
	});

	test("noBlockShift tasks are unchanged", () => {
		// walk-dog has noBlockShift in taskStatics
		const seed = 42;
		const p = getPersonalityFromSeed(seed);
		const taskIds = selectTasksForSeed(seed, p);
		const tasks = createInitialTasks(taskIds, p.time, seed);
		const walkDog = tasks.find((t) => t.id === "walk-dog");
		expect(walkDog).toBeDefined();
		if (!walkDog) return;

		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(tasks, day, seed);
			expect(result.get("walk-dog")).toEqual(walkDog.availableBlocks);
		}
	});

	test("3-block tasks always lose exactly 1 block", () => {
		const pool = makeLargePool();
		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(pool, day, 42);
			for (let i = 0; i < 8; i++) {
				const id = `three-${i}` as Task["id"];
				const blocks = result.get(id) ?? [];
				expect(blocks.length).toBe(2);
				for (const b of blocks) {
					expect(["morning", "afternoon", "evening"]).toContain(b);
				}
			}
		}
	});

	test("4-block tasks always lose exactly 1 block", () => {
		const pool = makeLargePool();
		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(pool, day, 42);
			for (let i = 0; i < 10; i++) {
				const id = `four-${i}` as Task["id"];
				const blocks = result.get(id) ?? [];
				expect(blocks.length).toBe(3);
				for (const b of blocks) {
					expect(TIME_BLOCKS).toContain(b);
				}
			}
		}
	});

	test("2-block tasks lose a block on roughly 40% of days", () => {
		// Use large pool + a 2-block task to avoid minimum guarantee interference
		const pool = makeLargePool();
		const twoBlock = makeTask("two-a", ["morning", "evening"]);
		pool.push(twoBlock);

		let droppedCount = 0;
		const trials = 1000;

		for (let seed = 0; seed < trials; seed++) {
			const result = getDayBlocks(pool, 0, seed);
			const blocks = result.get("two-a" as Task["id"]);
			if (blocks && blocks.length === 1) {
				droppedCount++;
			}
		}

		const dropRate = droppedCount / trials;
		expect(dropRate).toBeGreaterThan(0.3);
		expect(dropRate).toBeLessThan(0.5);
	});

	test("2-block tasks keep both blocks most of the time", () => {
		const pool = makeLargePool();
		const twoBlock = makeTask("two-b", ["afternoon", "night"]);
		pool.push(twoBlock);

		let keptCount = 0;
		const trials = 1000;

		for (let seed = 0; seed < trials; seed++) {
			const result = getDayBlocks(pool, 0, seed);
			const blocks = result.get("two-b" as Task["id"]);
			if (blocks && blocks.length === 2) {
				keptCount++;
			}
		}

		const keepRate = keptCount / trials;
		// ~60% should keep both blocks
		expect(keepRate).toBeGreaterThan(0.5);
		expect(keepRate).toBeLessThan(0.7);
	});

	test("weekends return original blocks unchanged", () => {
		const pool = makeLargePool();
		for (let day = 5; day <= 6; day++) {
			const result = getDayBlocks(pool, day, 42);
			for (let i = 0; i < 8; i++) {
				expect(result.get(`three-${i}` as Task["id"])).toEqual([
					"morning",
					"afternoon",
					"evening",
				]);
			}
			for (let i = 0; i < 10; i++) {
				expect(result.get(`four-${i}` as Task["id"])).toEqual([
					"morning",
					"afternoon",
					"evening",
					"night",
				]);
			}
		}
	});

	test("deterministic: same inputs produce same results", () => {
		const pool = makeLargePool();
		const r1 = getDayBlocks(pool, 2, 12345);
		const r2 = getDayBlocks(pool, 2, 12345);

		for (const task of pool) {
			expect(r1.get(task.id)).toEqual(r2.get(task.id));
		}
	});

	test("different days produce different block assignments", () => {
		const pool = makeLargePool();
		const dayResults: string[] = [];
		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(pool, day, 42);
			const serialized = pool
				.map((t) => `${t.id}:${(result.get(t.id) ?? []).join(",")}`)
				.join("|");
			dayResults.push(serialized);
		}

		const uniqueDays = new Set(dayResults);
		expect(uniqueDays.size).toBeGreaterThan(1);
	});

	test("which block is dropped varies across days for same task", () => {
		const pool = makeLargePool();
		// Track which block is dropped from three-0 across 5 days
		const droppedBlocks = new Set<TimeBlock>();
		const original: TimeBlock[] = ["morning", "afternoon", "evening"];
		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(pool, day, 42);
			const blocks = result.get("three-0" as Task["id"]) ?? [];
			for (const b of original) {
				if (!blocks.includes(b)) {
					droppedBlocks.add(b);
				}
			}
		}
		// Over 5 days, more than 1 different block should be dropped
		expect(droppedBlocks.size).toBeGreaterThan(1);
	});

	test("every block has >= SLOTS_PER_BLOCK tasks with real task pools", () => {
		for (let seed = 0; seed < 300; seed++) {
			const p = getPersonalityFromSeed(seed);
			const taskIds = selectTasksForSeed(seed, p);
			const tasks = createInitialTasks(taskIds, p.time, seed);

			for (let day = 0; day < 5; day++) {
				const result = getDayBlocks(tasks, day, seed);

				for (const block of TIME_BLOCKS) {
					const tasksInBlock = tasks.filter((t) =>
						result.get(t.id)?.includes(block),
					);
					expect(tasksInBlock.length).toBeGreaterThanOrEqual(SLOTS_PER_BLOCK);
				}
			}
		}
	});

	test("obligation tasks skip jitter (keep all blocks)", () => {
		const obligation = makeTask("dentist-visit", ["afternoon"]) as Task & {
			isObligation: boolean;
		};
		obligation.isObligation = true;

		const pool = makeLargePool();
		pool.push(obligation);

		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(pool, day, 42);
			// Obligation task with 1 block should always keep it
			expect(result.get("dentist-visit" as Task["id"])).toEqual(["afternoon"]);
		}
	});

	test("jitter creates variety across days in real task pools", () => {
		const seed = 12345;
		const p = getPersonalityFromSeed(seed);
		const taskIds = selectTasksForSeed(seed, p);
		const tasks = createInitialTasks(taskIds, p.time, seed);

		const morningTaskSets: string[] = [];
		for (let day = 0; day < 5; day++) {
			const result = getDayBlocks(tasks, day, seed);
			const morningTasks = tasks
				.filter((t) => result.get(t.id)?.includes("morning"))
				.map((t) => t.id)
				.sort()
				.join(",");
			morningTaskSets.push(morningTasks);
		}

		const uniqueSets = new Set(morningTaskSets);
		expect(uniqueSets.size).toBeGreaterThan(1);
	});
});
