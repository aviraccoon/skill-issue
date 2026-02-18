/**
 * Daily block jitter system.
 * Creates day-to-day variety by shifting which time blocks each task
 * is available in. Same task pool all week, but the windows shift daily.
 *
 * Encodes the real experience: some days cooking is a morning thing,
 * other days that window just doesn't open until evening.
 */

import { getTaskStatic, type TaskId } from "../data/tasks";
import {
	SLOTS_PER_BLOCK,
	TIME_BLOCKS,
	type TimeBlock,
} from "../data/timeBlocks";
import type { Task } from "../state";
import { hashString, seededRandom, seededShuffle } from "../utils/random";

/** Salt offset for daily jitter (7000 range, avoids collision with other seed uses). */
const JITTER_SALT_BASE = 7000;

/** Probability that a 2-block task loses a block on a given day. */
const TWO_BLOCK_DROP_CHANCE = 0.4;

/**
 * Computes effective available blocks for all tasks on a given day.
 * Creates day-to-day variety by dropping blocks from multi-block tasks.
 *
 * - Single-block tasks: unchanged
 * - Tasks with noBlockShift: unchanged
 * - 3+ block tasks: always lose 1 block per day (which one rotates)
 * - 2-block tasks: lose 1 block on ~40% of days
 * - Weekends (dayIndex >= 5): no jitter
 * - Every block guaranteed >= SLOTS_PER_BLOCK tasks (restores dropped,
 *   then pulls from adjacent blocks if still short)
 */
export function getDayBlocks(
	tasks: readonly Task[],
	dayIndex: number,
	runSeed: number,
): Map<TaskId, readonly TimeBlock[]> {
	const result = new Map<TaskId, readonly TimeBlock[]>();

	// Weekends: no jitter
	if (dayIndex >= 5) {
		for (const task of tasks) {
			result.set(task.id, task.availableBlocks);
		}
		return result;
	}

	// Track which tasks were dropped from which block (for restoration)
	const droppedFromBlock = new Map<TimeBlock, TaskId[]>();
	for (const block of TIME_BLOCKS) {
		droppedFromBlock.set(block, []);
	}

	// Phase 1: Compute jittered blocks per task
	for (const task of tasks) {
		const numBlocks = task.availableBlocks.length;
		const isExempt =
			numBlocks <= 1 ||
			task.isObligation === true ||
			getTaskStatic(task.id)?.noBlockShift === true;

		if (isExempt) {
			result.set(task.id, task.availableBlocks);
			continue;
		}

		const taskSalt = JITTER_SALT_BASE + hashString(task.id);

		if (numBlocks >= 3) {
			// Always drop 1 block
			const dropIndex = Math.floor(
				seededRandom(runSeed + dayIndex, taskSalt) * numBlocks,
			);
			const droppedBlock = task.availableBlocks[dropIndex];
			const blocks = task.availableBlocks.filter((_, i) => i !== dropIndex);
			result.set(task.id, blocks);
			if (droppedBlock) {
				droppedFromBlock.get(droppedBlock)?.push(task.id);
			}
		} else {
			// 2-block: drop on ~40% of days
			const shouldDrop =
				seededRandom(runSeed + dayIndex, taskSalt) < TWO_BLOCK_DROP_CHANCE;
			if (shouldDrop) {
				// Use different salt for which block to drop
				const dropIndex = Math.floor(
					seededRandom(runSeed + dayIndex, taskSalt + 100) * numBlocks,
				);
				const droppedBlock = task.availableBlocks[dropIndex];
				const blocks = task.availableBlocks.filter((_, i) => i !== dropIndex);
				result.set(task.id, blocks);
				if (droppedBlock) {
					droppedFromBlock.get(droppedBlock)?.push(task.id);
				}
			} else {
				result.set(task.id, task.availableBlocks);
			}
		}
	}

	// Phase 2: Ensure every block has >= SLOTS_PER_BLOCK tasks
	for (let bi = 0; bi < TIME_BLOCKS.length; bi++) {
		const block = TIME_BLOCKS[bi] as TimeBlock;
		let countInBlock = countTasksInBlock(tasks, result, block);

		if (countInBlock >= SLOTS_PER_BLOCK) continue;

		// Step A: Restore tasks that jitter dropped from this block
		const jitterDropped = droppedFromBlock.get(block) ?? [];
		const orderedDropped = seededShuffle(
			[...jitterDropped],
			runSeed + dayIndex + bi * 37,
		);
		for (const taskId of orderedDropped) {
			if (countInBlock >= SLOTS_PER_BLOCK) break;
			if (addBlockToTask(result, taskId, block)) {
				countInBlock++;
			}
		}

		if (countInBlock >= SLOTS_PER_BLOCK) continue;

		// Step B: Pull tasks from adjacent blocks that aren't in this block yet
		const adjacentTasks = getAdjacentCandidates(tasks, result, block);
		const orderedAdjacent = seededShuffle(
			adjacentTasks,
			runSeed + dayIndex + bi * 53,
		);
		for (const taskId of orderedAdjacent) {
			if (countInBlock >= SLOTS_PER_BLOCK) break;
			if (addBlockToTask(result, taskId, block)) {
				countInBlock++;
			}
		}
	}

	return result;
}

/** Counts how many tasks are currently assigned to a block. */
function countTasksInBlock(
	tasks: readonly Task[],
	result: Map<TaskId, readonly TimeBlock[]>,
	block: TimeBlock,
): number {
	return tasks.filter((t) => result.get(t.id)?.includes(block)).length;
}

/** Adds a block to a task's effective blocks. Returns true if added. */
function addBlockToTask(
	result: Map<TaskId, readonly TimeBlock[]>,
	taskId: TaskId,
	block: TimeBlock,
): boolean {
	const current = result.get(taskId);
	if (!current || current.includes(block)) return false;
	result.set(taskId, [...current, block]);
	return true;
}

/**
 * Finds tasks in adjacent blocks that aren't currently in the target block.
 * Adjacent = nearest neighbors in the TIME_BLOCKS sequence.
 * Prefers the later neighbor first (morning pulls from afternoon, not night).
 * Obligation tasks are excluded -- they have fixed timing.
 */
function getAdjacentCandidates(
	tasks: readonly Task[],
	result: Map<TaskId, readonly TimeBlock[]>,
	block: TimeBlock,
): TaskId[] {
	const bi = TIME_BLOCKS.indexOf(block);
	// Collect adjacent blocks: prefer later, then earlier
	const neighbors: TimeBlock[] = [];
	if (bi + 1 < TIME_BLOCKS.length)
		neighbors.push(TIME_BLOCKS[bi + 1] as TimeBlock);
	if (bi - 1 >= 0) neighbors.push(TIME_BLOCKS[bi - 1] as TimeBlock);

	const candidates: TaskId[] = [];
	const seen = new Set<TaskId>();

	for (const neighbor of neighbors) {
		for (const task of tasks) {
			if (seen.has(task.id)) continue;
			if (task.isObligation) continue;
			const blocks = result.get(task.id);
			if (blocks?.includes(neighbor) && !blocks.includes(block)) {
				candidates.push(task.id);
				seen.add(task.id);
			}
		}
	}

	return candidates;
}
