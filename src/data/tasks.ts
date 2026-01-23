import { strings } from "../i18n";
import type { Task, TaskEvolution, TimeBlock } from "../state";

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
	| "shower"
	| "brush-teeth-morning"
	| "brush-teeth-evening"
	| "cook"
	| "delivery"
	| "dishes"
	| "walk-dog"
	| "work"
	| "practice-music"
	| "shopping"
	| "social-event"
	| "go-outside";

/** Static task data that doesn't change (rates, blocks, category). */
interface TaskStatic {
	id: TaskId;
	category: TaskCategory;
	baseRate: number;
	variantBaseRate?: number;
	availableBlocks: readonly TimeBlock[];
	weekendCost?: number;
	energyEffect?: TaskEnergyEffect;
	autoSatisfies?: string;
}

/** Static task definitions - rates, timing, categories. Strings come from i18n. */
const taskStatics: readonly TaskStatic[] = [
	{
		id: "shower",
		category: "hygiene",
		baseRate: 0.35,
		variantBaseRate: 0.7,
		availableBlocks: ["morning", "evening"],
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
	{
		id: "cook",
		category: "food",
		baseRate: 0.1,
		variantBaseRate: 0.5,
		availableBlocks: ["morning", "afternoon", "evening"],
		energyEffect: { success: -0.02 },
	},
	{
		id: "delivery",
		category: "food",
		baseRate: 0.75,
		availableBlocks: ["afternoon", "evening", "night"],
	},
	{
		id: "dishes",
		category: "chores",
		baseRate: 0.25,
		variantBaseRate: 0.55,
		availableBlocks: ["morning", "afternoon", "evening"],
	},
	{
		id: "walk-dog",
		category: "dog",
		baseRate: 0.85,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		energyEffect: { success: 0.04 },
		autoSatisfies: "go-outside",
	},
	{
		id: "work",
		category: "work",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon"],
	},
	{
		id: "practice-music",
		category: "creative",
		baseRate: 0.05,
		availableBlocks: ["afternoon", "evening", "night"],
		energyEffect: { success: 0.05 },
	},
	{
		id: "shopping",
		category: "chores",
		baseRate: 0.3,
		availableBlocks: ["morning", "afternoon", "evening"],
		weekendCost: 2,
	},
	{
		id: "social-event",
		category: "social",
		baseRate: 0.35,
		availableBlocks: ["afternoon", "evening"],
		weekendCost: 3,
	},
	{
		id: "go-outside",
		category: "selfcare",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon", "evening"],
	},
];

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

/** Builds TaskEvolution from i18n strings. */
function buildEvolution(id: TaskId): TaskEvolution {
	const content = getTaskContent(id);
	return {
		aware: [...content.evolution.aware],
		honest: [...content.evolution.honest],
		resigned: [...content.evolution.resigned],
	};
}

/** Creates initial tasks with runtime state fields. */
export function createInitialTasks(): Task[] {
	return taskStatics.map((ts) => {
		const content = getTaskContent(ts.id);
		return {
			id: ts.id,
			name: content.name,
			category: ts.category,
			baseRate: ts.baseRate,
			minimalVariant: buildVariant(ts),
			availableBlocks: [...ts.availableBlocks],
			weekendCost: ts.weekendCost,
			evolution: buildEvolution(ts.id),
			energyEffect: ts.energyEffect,
			autoSatisfies: ts.autoSatisfies,
			failureCount: 0,
			attemptedToday: false,
			succeededToday: false,
		};
	});
}

/**
 * Initial tasks - for backwards compatibility.
 * Prefer createInitialTasks() for fresh state to ensure i18n is applied.
 */
export const initialTasks: Task[] = createInitialTasks();

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

/**
 * Static export for backwards compatibility.
 * Prefer getTasksWithVariants() to ensure i18n is applied.
 */
export const tasksWithVariants: TaskVariantInfo[] = getTasksWithVariants();
