import { strings } from "../i18n";
import type { Task, TaskEvolution } from "../state";
import {
	adjustBlocksForPersonality,
	type TimePreference,
} from "../systems/personality";
import { seededRandom, seededShuffle } from "../utils/random";
import { SLOTS_PER_BLOCK, TIME_BLOCKS, type TimeBlock } from "./timeBlocks";

/** Task category for grouping and modifiers. */
export type TaskCategory =
	| "hygiene"
	| "food"
	| "chores"
	| "dog"
	| "work"
	| "creative"
	| "selfcare"
	| "social";

/**
 * Priority weights by category for simulation strategies.
 * Higher = more important. Used by realistic strategy to decide task order.
 */
export const CATEGORY_PRIORITIES: Record<TaskCategory, number> = {
	dog: 100, // Dog comes first - external accountability
	work: 90, // Work is important for survival
	food: 80, // Need to eat
	hygiene: 70, // Self-care matters
	selfcare: 40, // Good but not urgent
	chores: 30, // Can wait
	social: 20, // Optional
	creative: 10, // Aspirational, low priority
};

/**
 * Energy effect from completing a task.
 * If not specified, defaults to 0 on success, -0.02 on failure.
 */
interface TaskEnergyEffect {
	success?: number; // energy change on success (default: 0)
	failure?: number; // energy change on failure (default: -0.02)
}

/**
 * Minimal variant of a task with higher success rate.
 * Unlocked through friend hints during rescue.
 */
export interface MinimalVariant {
	name: string;
	baseRate: number;
	/** Friend hint messages that unlock this variant. One selected randomly. */
	unlockHints: string[];
}

/** Task ID type - all valid task identifiers. */
export type TaskId =
	// Hygiene
	| "shower"
	| "brush-teeth-morning"
	| "brush-teeth-evening"
	// Food
	| "cook"
	| "delivery"
	| "go-out-to-eat"
	| "make-coffee"
	// Chores
	| "dishes"
	| "laundry"
	| "take-out-trash"
	| "tidy-up"
	| "shopping"
	// Dog
	| "walk-dog"
	| "feed-dog"
	| "play-with-dog"
	| "chill-with-dog"
	// Work
	| "work"
	// Creative
	| "practice-music"
	| "draw-sketch"
	| "write"
	| "exercise"
	// Social
	| "social-event"
	| "meet-friend"
	| "text-someone"
	// Self-care
	| "go-outside"
	| "take-meds"
	| "read"
	| "meditate"
	// Obligations (injected by events, not in seed pool)
	| "dentist-visit"
	| "vet-visit"
	| "work-deadline";

/** Static task data that doesn't change (rates, blocks, category). */
export interface TaskStatic {
	id: TaskId;
	category: TaskCategory;
	baseRate: number;
	variantBaseRate?: number;
	availableBlocks: readonly TimeBlock[];
	weekendCost?: number;
	energyEffect?: TaskEnergyEffect;
	autoSatisfies?: string;
	/** Core tasks are always included in every run's task pool. */
	core?: boolean;
	/** Selection pool override. Defaults to category if not set. */
	selectionPool?: string;
	/** Sub-group tag within pool for selection constraints (e.g., food "high"/"low"). */
	selectionTag?: string;
	/** If true, personality time-block shifts don't apply. */
	noBlockShift?: boolean;
}

/** Static task definitions - rates, timing, categories. Strings come from i18n. */
export const taskStatics: readonly TaskStatic[] = [
	// --- Hygiene ---
	{
		id: "shower",
		category: "hygiene",
		baseRate: 0.35,
		variantBaseRate: 0.7,
		availableBlocks: ["morning", "evening"],
		core: true,
	},
	{
		id: "brush-teeth-morning",
		category: "hygiene",
		baseRate: 0.35,
		availableBlocks: ["morning"],
	},
	{
		id: "brush-teeth-evening",
		category: "hygiene",
		baseRate: 0.2,
		availableBlocks: ["evening", "night"],
	},
	// --- Food ---
	{
		id: "cook",
		category: "food",
		baseRate: 0.1,
		variantBaseRate: 0.5,
		availableBlocks: ["morning", "afternoon", "evening"],
		energyEffect: { success: -0.02 },
		selectionTag: "low",
	},
	{
		id: "delivery",
		category: "food",
		baseRate: 0.75,
		availableBlocks: ["afternoon", "evening", "night"],
		selectionTag: "high",
	},
	{
		id: "go-out-to-eat",
		category: "food",
		baseRate: 0.35,
		availableBlocks: ["afternoon", "evening"],
		weekendCost: 2,
	},
	{
		id: "make-coffee",
		category: "food",
		baseRate: 0.6,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		selectionTag: "high",
	},
	// --- Chores ---
	{
		id: "dishes",
		category: "chores",
		baseRate: 0.25,
		variantBaseRate: 0.55,
		availableBlocks: ["morning", "afternoon", "evening"],
	},
	{
		id: "laundry",
		category: "chores",
		baseRate: 0.25,
		variantBaseRate: 0.55,
		availableBlocks: ["morning", "afternoon", "evening"],
	},
	{
		id: "take-out-trash",
		category: "chores",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon", "evening"],
	},
	{
		id: "tidy-up",
		category: "chores",
		baseRate: 0.2,
		variantBaseRate: 0.5,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
	},
	{
		id: "shopping",
		category: "chores",
		baseRate: 0.3,
		availableBlocks: ["morning", "afternoon", "evening"],
		weekendCost: 2,
	},
	// --- Dog ---
	{
		id: "walk-dog",
		category: "dog",
		baseRate: 0.85,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		energyEffect: { success: 0.04 },
		autoSatisfies: "go-outside",
		core: true,
		noBlockShift: true,
	},
	{
		id: "feed-dog",
		category: "dog",
		baseRate: 0.92,
		availableBlocks: ["morning", "afternoon", "evening"],
	},
	{
		id: "play-with-dog",
		category: "dog",
		baseRate: 0.75,
		availableBlocks: ["morning", "afternoon", "evening"],
		energyEffect: { success: 0.03 },
	},
	{
		id: "chill-with-dog",
		category: "dog",
		baseRate: 0.8,
		availableBlocks: ["afternoon", "evening", "night"],
		energyEffect: { success: 0.02 },
	},
	// --- Work ---
	{
		id: "work",
		category: "work",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		core: true,
	},
	// --- Creative ---
	{
		id: "practice-music",
		category: "creative",
		baseRate: 0.05,
		availableBlocks: ["afternoon", "evening", "night"],
		energyEffect: { success: 0.05 },
	},
	{
		id: "draw-sketch",
		category: "creative",
		baseRate: 0.05,
		availableBlocks: ["afternoon", "evening", "night"],
		energyEffect: { success: 0.05 },
	},
	{
		id: "write",
		category: "creative",
		baseRate: 0.05,
		availableBlocks: ["evening", "night"],
		energyEffect: { success: 0.05 },
	},
	{
		id: "exercise",
		category: "creative",
		baseRate: 0.08,
		availableBlocks: ["morning", "afternoon", "evening"],
		energyEffect: { success: 0.04 },
	},
	// --- Social ---
	{
		id: "social-event",
		category: "social",
		baseRate: 0.35,
		availableBlocks: ["afternoon", "evening"],
		weekendCost: 3,
	},
	{
		id: "meet-friend",
		category: "social",
		baseRate: 0.45,
		availableBlocks: ["afternoon", "evening"],
		weekendCost: 2,
	},
	{
		id: "text-someone",
		category: "social",
		baseRate: 0.5,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
	},
	// --- Self-care ---
	{
		id: "go-outside",
		category: "selfcare",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon", "evening"],
	},
	{
		id: "take-meds",
		category: "selfcare",
		baseRate: 0.45,
		availableBlocks: ["morning", "evening"],
		selectionPool: "hygiene",
	},
	{
		id: "read",
		category: "selfcare",
		baseRate: 0.15,
		availableBlocks: ["afternoon", "evening", "night"],
	},
	{
		id: "meditate",
		category: "selfcare",
		baseRate: 0.1,
		availableBlocks: ["morning", "evening", "night"],
	},
];

/** Gets a task's static data by ID. */
export function getTaskStatic(id: TaskId): TaskStatic | undefined {
	return taskStatics.find((ts) => ts.id === id);
}

/** Gets task content from i18n by task ID. */
function getTaskContent(id: TaskId) {
	const s = strings();
	return s.tasks[id];
}

/** Builds a MinimalVariant from static data and i18n strings, if task has one. */
function buildVariant(taskStatic: TaskStatic): MinimalVariant | undefined {
	if (!taskStatic.variantBaseRate) return undefined;

	const content = getTaskContent(taskStatic.id);
	if (!("variant" in content)) return undefined;

	return {
		name: content.variant.name,
		baseRate: taskStatic.variantBaseRate,
		unlockHints: [...content.variant.unlockHints],
	};
}

/** Builds TaskEvolution from i18n strings, if the task has evolution text. */
function buildEvolution(id: TaskId): TaskEvolution | undefined {
	const content = getTaskContent(id);
	if (!("evolution" in content)) return undefined;
	return {
		aware: [...content.evolution.aware],
		honest: [...content.evolution.honest],
		resigned: [...content.evolution.resigned],
	};
}

/** Creates initial tasks with runtime state fields from a seed's task pool. */
export function createInitialTasks(
	taskIds: TaskId[],
	timePref: TimePreference,
	seed: number,
): Task[] {
	const statics = taskIds
		.map((id) => taskStatics.find((ts) => ts.id === id))
		.filter((ts): ts is TaskStatic => ts !== undefined);

	const tasks = statics.map((ts) => {
		const content = getTaskContent(ts.id);
		const blocks =
			timePref && !ts.noBlockShift
				? adjustBlocksForPersonality(ts.availableBlocks, timePref)
				: [...ts.availableBlocks];
		return {
			id: ts.id,
			name: content.name,
			category: ts.category,
			baseRate: ts.baseRate,
			minimalVariant: buildVariant(ts),
			availableBlocks: blocks,
			weekendCost: ts.weekendCost,
			evolution: buildEvolution(ts.id),
			energyEffect: ts.energyEffect,
			autoSatisfies: ts.autoSatisfies,
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
		};
	});

	// Ensure personality shifts don't leave any block below the playable minimum
	if (timePref !== "neutral") {
		ensurePersonalityMinimums(tasks, statics, seed);
	}

	return tasks;
}

/** Salt offset for personality block minimum restoration. */
const PERSONALITY_MIN_SALT = 8000;

/** Seeded range for how many tasks to keep in personality-shifted blocks. */
const KEEP_RATIO_MIN = 0.45;
const KEEP_RATIO_MAX = 0.65;

/**
 * After personality adjustment, blocks can be too sparse -- either below the
 * playable minimum (SLOTS_PER_BLOCK) or sparse enough to make the personality
 * type immediately obvious. Restores personality-removed tasks using seeded
 * selection. The keep ratio varies by seed (0.45-0.65), so some runs have
 * sparser off-preference blocks than others.
 */
function ensurePersonalityMinimums(
	tasks: Task[],
	statics: readonly TaskStatic[],
	seed: number,
): void {
	const keepRatio =
		KEEP_RATIO_MIN +
		seededRandom(seed, PERSONALITY_MIN_SALT + 100) *
			(KEEP_RATIO_MAX - KEEP_RATIO_MIN);

	for (let bi = 0; bi < TIME_BLOCKS.length; bi++) {
		const block = TIME_BLOCKS[bi] as TimeBlock;

		const originalCount = statics.filter((s) =>
			s.availableBlocks.includes(block),
		).length;
		const target = Math.max(
			SLOTS_PER_BLOCK,
			Math.ceil(originalCount * keepRatio),
		);

		let count = tasks.filter((t) => t.availableBlocks.includes(block)).length;
		if (count >= target) continue;

		// Tasks that had this block originally but lost it to personality shift
		const candidates = tasks.filter((t) => {
			const original = statics.find((s) => s.id === t.id);
			return (
				original?.availableBlocks.includes(block) &&
				!t.availableBlocks.includes(block)
			);
		});

		const shuffled = seededShuffle(
			candidates,
			seed + PERSONALITY_MIN_SALT + bi,
		);
		for (const task of shuffled) {
			if (count >= target) break;
			task.availableBlocks.push(block);
			count++;
		}
	}
}

/** Info about a task with a variant, for friend rescue hint generation. */
export interface TaskVariantInfo {
	id: string;
	category: TaskCategory;
	minimalVariant: MinimalVariant;
}

/**
 * Tasks that have minimal variants with unlock hints.
 * Used by friend rescue to generate variant unlock hint groups.
 */
export function getTasksWithVariants(): TaskVariantInfo[] {
	return taskStatics
		.filter((ts) => ts.variantBaseRate !== undefined)
		.map((ts) => {
			const variant = buildVariant(ts);
			if (!variant) throw new Error(`Missing variant for ${ts.id}`);
			return {
				id: ts.id,
				category: ts.category,
				minimalVariant: variant,
			};
		});
}
