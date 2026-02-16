/**
 * Seed-based task pool selection.
 * Picks 10-14 tasks from the full pool per run, deterministically based on seed.
 * Core tasks always included. Social tasks personality-weighted.
 *
 * Pool membership is defined on each TaskStatic (selectionPool/selectionTag fields).
 * This module reads that metadata and applies the selection algorithm.
 */

import { type TaskId, type TaskStatic, taskStatics } from "../data/tasks";
import { seededRandom, seededShuffle } from "../utils/random";
import type { Personality, SocialPreference } from "./personality";

const MIN_TASKS = 10;
const MAX_TASKS = 14;

// --- Per-pool selection specs ---

interface PoolSpec {
	min: number;
	max: number;
	/** If set, at least one task with each listed tag must be included. */
	guaranteeTags?: string[];
}

/** Base pool specs (social overridden by personality). */
const POOL_SPECS: Record<string, PoolSpec> = {
	food: { min: 2, max: 3, guaranteeTags: ["low", "high"] },
	hygiene: { min: 1, max: 2 },
	chores: { min: 1, max: 3 },
	dog: { min: 1, max: 2 },
	creative: { min: 1, max: 2 },
	social: { min: 0, max: 2 }, // overridden per personality
	selfcare: { min: 1, max: 2 },
};

/** Social task count ranges vary by personality. */
const SOCIAL_RANGES: Record<SocialPreference, { min: number; max: number }> = {
	socialBattery: { min: 1, max: 2 },
	hermit: { min: 0, max: 1 },
	neutral: { min: 0, max: 2 },
};

// --- Salt values for deterministic selection (5000-5099 range) ---
// Two salts per pool: one for count, one for shuffle.
const POOL_SALTS: Record<string, { count: number; shuffle: number }> = {
	food: { count: 5001, shuffle: 5002 },
	hygiene: { count: 5010, shuffle: 5011 },
	chores: { count: 5020, shuffle: 5021 },
	dog: { count: 5030, shuffle: 5031 },
	creative: { count: 5040, shuffle: 5041 },
	social: { count: 5050, shuffle: 5051 },
	selfcare: { count: 5060, shuffle: 5061 },
};

/** Fallback salt for pools without explicit entries. */
const DEFAULT_SALT = { count: 5090, shuffle: 5091 };

/**
 * Determines a count within [min, max] inclusive, using seeded random.
 */
function seededCount(
	min: number,
	max: number,
	seed: number,
	salt: number,
): number {
	if (min === max) return min;
	const r = seededRandom(seed, salt);
	return min + Math.floor(r * (max - min + 1));
}

/**
 * Picks N items from a pool using seeded shuffle.
 */
function pickFromPool(
	pool: readonly TaskStatic[],
	count: number,
	seed: number,
	salt: number,
): TaskId[] {
	if (count <= 0) return [];
	if (count >= pool.length) return pool.map((ts) => ts.id);
	const ids = pool.map((ts) => ts.id);
	const shuffled = seededShuffle(ids, seed + salt);
	return shuffled.slice(0, count);
}

/**
 * Groups non-core tasks by their effective selection pool.
 */
function buildPools(): Map<string, TaskStatic[]> {
	const pools = new Map<string, TaskStatic[]>();
	for (const ts of taskStatics) {
		if (ts.core) continue;
		const pool = ts.selectionPool ?? ts.category;
		const group = pools.get(pool);
		if (group) {
			group.push(ts);
		} else {
			pools.set(pool, [ts]);
		}
	}
	return pools;
}

/**
 * Resolves the effective spec for a pool, applying personality overrides.
 */
function getPoolSpec(poolName: string, personality: Personality): PoolSpec {
	const base = POOL_SPECS[poolName];
	if (!base) return { min: 0, max: 0 };
	if (poolName === "social") {
		return { ...base, ...SOCIAL_RANGES[personality.social] };
	}
	return base;
}

/**
 * Picks per-pool counts, then normalizes the total to [MIN_TASKS, MAX_TASKS].
 * When over budget, trims from pools furthest above their minimum.
 */
function pickPoolCounts(
	pools: Map<string, TaskStatic[]>,
	seed: number,
	personality: Personality,
): Map<string, number> {
	const counts = new Map<string, number>();
	const coreCount = taskStatics.filter((ts) => ts.core).length;
	let total = coreCount;

	// Pick ideal count per pool
	for (const [poolName, poolTasks] of pools) {
		const spec = getPoolSpec(poolName, personality);
		const salts = POOL_SALTS[poolName] ?? DEFAULT_SALT;
		const count = Math.min(
			seededCount(spec.min, spec.max, seed, salts.count),
			poolTasks.length,
		);
		counts.set(poolName, count);
		total += count;
	}

	// Trim from pools furthest above their minimum until at budget
	while (total > MAX_TASKS) {
		let maxExcess = 0;
		let trimPool = "";
		for (const [name, count] of counts) {
			const spec = getPoolSpec(name, personality);
			const excess = count - spec.min;
			if (excess > maxExcess) {
				maxExcess = excess;
				trimPool = name;
			}
		}
		if (maxExcess === 0) break;
		counts.set(trimPool, (counts.get(trimPool) ?? 0) - 1);
		total--;
	}

	// Inflate pools furthest below their max until at minimum
	while (total < MIN_TASKS) {
		let maxRoom = 0;
		let growPool = "";
		for (const [name, count] of counts) {
			const spec = getPoolSpec(name, personality);
			const poolSize = pools.get(name)?.length ?? 0;
			const room = Math.min(spec.max, poolSize) - count;
			if (room > maxRoom) {
				maxRoom = room;
				growPool = name;
			}
		}
		if (maxRoom === 0) break;
		counts.set(growPool, (counts.get(growPool) ?? 0) + 1);
		total++;
	}

	return counts;
}

/**
 * Selects tasks from a pool, respecting tag guarantees.
 * If guaranteeTags is set, ensures at least one task with each tag
 * is included before filling remaining slots from the rest of the pool.
 */
function selectFromPool(
	pool: TaskStatic[],
	count: number,
	spec: PoolSpec,
	seed: number,
	shuffleSalt: number,
): TaskId[] {
	if (count <= 0) return [];

	if (!spec.guaranteeTags || spec.guaranteeTags.length === 0) {
		return pickFromPool(pool, count, seed, shuffleSalt);
	}

	// Fulfill tag guarantees first
	const guaranteed: TaskId[] = [];
	const usedIds = new Set<TaskId>();

	for (const tag of spec.guaranteeTags) {
		const tagged = pool.filter(
			(ts) => ts.selectionTag === tag && !usedIds.has(ts.id),
		);
		if (tagged.length > 0) {
			const picked = pickFromPool(
				tagged,
				1,
				seed,
				shuffleSalt + guaranteed.length,
			);
			for (const id of picked) {
				guaranteed.push(id);
				usedIds.add(id);
			}
		}
	}

	// Fill remaining slots from untagged + unused tagged tasks
	const remaining = pool.filter((ts) => !usedIds.has(ts.id));
	const extraCount = Math.max(0, count - guaranteed.length);
	const extra = pickFromPool(remaining, extraCount, seed, shuffleSalt + 10);

	return [...guaranteed, ...extra];
}

/**
 * Selects which tasks appear in a run based on seed and personality.
 * Returns 10-14 TaskIds deterministically. Same seed + personality = same tasks.
 */
export function selectTasksForSeed(
	seed: number,
	personality: Personality,
): TaskId[] {
	const selected: TaskId[] = [];

	// Core tasks always included
	for (const ts of taskStatics) {
		if (ts.core) selected.push(ts.id);
	}

	// Build pools from task metadata and pick normalized counts
	const pools = buildPools();
	const counts = pickPoolCounts(pools, seed, personality);

	// Select specific tasks from each pool
	for (const [poolName, poolTasks] of pools) {
		const count = counts.get(poolName) ?? 0;
		const spec = getPoolSpec(poolName, personality);
		const salts = POOL_SALTS[poolName] ?? DEFAULT_SALT;
		selected.push(
			...selectFromPool(poolTasks, count, spec, seed, salts.shuffle),
		);
	}

	return selected;
}
