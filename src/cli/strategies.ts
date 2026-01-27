import type { Decision } from "../core/controller";
import {
	type DecisionContext,
	humanLikeStrategy,
	type Strategy,
} from "../core/strategies";
import { CATEGORY_PRIORITIES, type TaskId } from "../data/tasks";

/**
 * Random strategy - picks randomly from available options.
 * Useful for baseline testing.
 */
export const randomStrategy: Strategy = {
	decide(context: DecisionContext): Decision {
		const index = Math.floor(
			context.roll() * context.availableDecisions.length,
		);
		return context.availableDecisions[index] as Decision;
	},
};

/**
 * Priority strategy - prioritizes essential tasks, never checks phone.
 * Uses category priorities from data layer.
 */
export const priorityStrategy: Strategy = {
	decide(context: DecisionContext): Decision {
		const { state, availableDecisions, screen } = context;

		// Handle special screens
		if (screen === "friendRescue") {
			// Accept rescue with medium activity (safe choice)
			const accept = availableDecisions.find(
				(d) => d.type === "acceptRescue" && d.activity === "medium",
			);
			return accept ?? (availableDecisions[0] as Decision);
		}

		if (screen === "nightChoice") {
			// Sleep unless we have high energy and momentum
			if (state.energy > 0.6 && state.momentum > 0.5) {
				const pushThrough = availableDecisions.find(
					(d) => d.type === "pushThrough",
				);
				if (pushThrough) return pushThrough;
			}
			return availableDecisions.find((d) => d.type === "sleep") as Decision;
		}

		// Find task attempts by priority
		const taskAttempts = availableDecisions.filter(
			(d) => d.type === "attempt",
		) as Array<{ type: "attempt"; taskId: TaskId }>;

		if (taskAttempts.length > 0) {
			// Sort by category priority (highest first), then by base rate (highest first)
			const sorted = [...taskAttempts].sort((a, b) => {
				const taskA = state.tasks.find((t) => t.id === a.taskId);
				const taskB = state.tasks.find((t) => t.id === b.taskId);
				if (!taskA || !taskB) return 0;

				const priorityA = CATEGORY_PRIORITIES[taskA.category] ?? 0;
				const priorityB = CATEGORY_PRIORITIES[taskB.category] ?? 0;

				if (priorityA !== priorityB) {
					return priorityB - priorityA; // Higher priority first
				}
				return taskB.baseRate - taskA.baseRate; // Easier tasks first within category
			});

			// Find first task that hasn't been attempted yet today
			for (const attempt of sorted) {
				const task = state.tasks.find((t) => t.id === attempt.taskId);
				if (task && !task.attemptedToday && !task.succeededToday) {
					return attempt;
				}
			}

			// If all sorted tasks attempted, try any available
			const unattempted = sorted.find((d) => {
				const task = state.tasks.find((t) => t.id === d.taskId);
				return task && !task.attemptedToday;
			});
			if (unattempted) return unattempted;
		}

		// Skip time block if no tasks to attempt (never check phone)
		return (
			availableDecisions.find((d) => d.type === "skip") ??
			availableDecisions.find((d) => d.type === "endDay") ??
			(availableDecisions[0] as Decision)
		);
	},
};

/**
 * Worst case strategy - makes deliberately poor decisions.
 * Always checks phone, picks hardest tasks, pulls all-nighters.
 */
export const worstCaseStrategy: Strategy = {
	decide(context: DecisionContext): Decision {
		const { state, availableDecisions, screen } = context;

		// Handle special screens
		if (screen === "friendRescue") {
			// Decline rescue - isolate yourself
			return availableDecisions.find(
				(d) => d.type === "declineRescue",
			) as Decision;
		}

		if (screen === "nightChoice") {
			// Always push through if possible
			return (
				availableDecisions.find((d) => d.type === "pushThrough") ??
				(availableDecisions.find((d) => d.type === "sleep") as Decision)
			);
		}

		// Always check phone if available
		const checkPhone = availableDecisions.find((d) => d.type === "checkPhone");
		if (checkPhone && context.roll() < 0.5) {
			return checkPhone;
		}

		// Pick hardest tasks (lowest base rate)
		const taskAttempts = availableDecisions.filter(
			(d) => d.type === "attempt",
		) as Array<{ type: "attempt"; taskId: TaskId }>;

		if (taskAttempts.length > 0) {
			// Sort by difficulty (lowest base rate first)
			const sorted = taskAttempts.sort((a, b) => {
				const taskA = state.tasks.find((t) => t.id === a.taskId);
				const taskB = state.tasks.find((t) => t.id === b.taskId);
				return (taskA?.baseRate ?? 0) - (taskB?.baseRate ?? 0);
			});
			return sorted[0] as Decision;
		}

		// Skip if nothing else
		return (
			availableDecisions.find((d) => d.type === "skip") ??
			availableDecisions.find((d) => d.type === "endDay") ??
			(availableDecisions[0] as Decision)
		);
	},
};

/**
 * Best case strategy - makes optimal decisions.
 * Never checks phone, picks easiest tasks, sleeps well.
 */
export const bestCaseStrategy: Strategy = {
	decide(context: DecisionContext): Decision {
		const { state, availableDecisions, screen } = context;

		// Handle special screens
		if (screen === "friendRescue") {
			// Accept rescue with appropriate activity based on energy
			if (state.energy >= 0.7) {
				const high = availableDecisions.find(
					(d) => d.type === "acceptRescue" && d.activity === "high",
				);
				if (high) return high;
			}
			if (state.energy >= 0.45) {
				const medium = availableDecisions.find(
					(d) => d.type === "acceptRescue" && d.activity === "medium",
				);
				if (medium) return medium;
			}
			const low = availableDecisions.find(
				(d) => d.type === "acceptRescue" && d.activity === "low",
			);
			return low ?? (availableDecisions[0] as Decision);
		}

		if (screen === "nightChoice") {
			// Always sleep - rest is important
			return availableDecisions.find((d) => d.type === "sleep") as Decision;
		}

		// Pick easiest tasks first (highest base rate)
		const taskAttempts = availableDecisions.filter(
			(d) => d.type === "attempt",
		) as Array<{ type: "attempt"; taskId: TaskId }>;

		if (taskAttempts.length > 0) {
			// Sort by ease (highest base rate first)
			const sorted = taskAttempts.sort((a, b) => {
				const taskA = state.tasks.find((t) => t.id === a.taskId);
				const taskB = state.tasks.find((t) => t.id === b.taskId);
				return (taskB?.baseRate ?? 0) - (taskA?.baseRate ?? 0);
			});
			return sorted[0] as Decision;
		}

		// Skip if nothing else (never check phone)
		return (
			availableDecisions.find((d) => d.type === "skip") ??
			availableDecisions.find((d) => d.type === "endDay") ??
			(availableDecisions[0] as Decision)
		);
	},
};

/**
 * Realistic strategy - simulates human-like decision making.
 * Balances priorities, occasionally checks phone, makes smart choices.
 */
export const realisticStrategy: Strategy = {
	decide(context: DecisionContext): Decision {
		const { state, availableDecisions, screen } = context;

		// Handle special screens
		if (screen === "friendRescue") {
			// Accept rescue with appropriate activity based on energy
			if (state.energy >= 0.7) {
				const high = availableDecisions.find(
					(d) => d.type === "acceptRescue" && d.activity === "high",
				);
				if (high) return high;
			}
			if (state.energy >= 0.45) {
				const medium = availableDecisions.find(
					(d) => d.type === "acceptRescue" && d.activity === "medium",
				);
				if (medium) return medium;
			}
			const low = availableDecisions.find(
				(d) => d.type === "acceptRescue" && d.activity === "low",
			);
			return low ?? (availableDecisions[0] as Decision);
		}

		if (screen === "nightChoice") {
			// Push through if high energy and not too late in the week
			if (state.energy > 0.6 && state.dayIndex < 4) {
				const pushThrough = availableDecisions.find(
					(d) => d.type === "pushThrough",
				);
				if (pushThrough && context.roll() < 0.3) return pushThrough;
			}
			return availableDecisions.find((d) => d.type === "sleep") as Decision;
		}

		// Occasionally check phone (10% chance when low momentum)
		const checkPhone = availableDecisions.find((d) => d.type === "checkPhone");
		if (checkPhone && state.momentum < 0.3 && context.roll() < 0.1) {
			return checkPhone;
		}

		// Find task attempts
		const taskAttempts = availableDecisions.filter(
			(d) => d.type === "attempt",
		) as Array<{ type: "attempt"; taskId: TaskId }>;

		if (taskAttempts.length > 0) {
			// Pick highest weighted available task that hasn't succeeded
			let best: { type: "attempt"; taskId: TaskId } | undefined;
			let bestWeight = -1;

			for (const attempt of taskAttempts) {
				const task = state.tasks.find((t) => t.id === attempt.taskId);
				if (task && !task.succeededToday) {
					// Base weight from category priority
					let weight = CATEGORY_PRIORITIES[task.category] ?? 0;

					// Add urgency for dog tasks if not walked yesterday
					if (state.dogFailedYesterday && task.category === "dog") {
						weight += 50;
					}

					// Boost work priority during work hours (morning/afternoon on weekdays)
					if (state.dayIndex < 5 && task.category === "work") {
						if (
							state.timeBlock === "morning" ||
							state.timeBlock === "afternoon"
						) {
							weight += 30;
						}
					}

					// Add some randomness
					const adjustedWeight = weight + context.roll() * 20;
					if (adjustedWeight > bestWeight) {
						bestWeight = adjustedWeight;
						best = attempt;
					}
				}
			}

			if (best) return best;
		}

		// Skip if nothing else
		return (
			availableDecisions.find((d) => d.type === "skip") ??
			availableDecisions.find((d) => d.type === "endDay") ??
			(availableDecisions[0] as Decision)
		);
	},
};

/**
 * Available strategies by name.
 */
export const STRATEGIES: Record<string, Strategy> = {
	random: randomStrategy,
	priority: priorityStrategy,
	worstCase: worstCaseStrategy,
	bestCase: bestCaseStrategy,
	realistic: realisticStrategy,
	humanLike: humanLikeStrategy,
};

/**
 * Gets a strategy by name.
 */
export function getStrategy(name: string): Strategy | undefined {
	return STRATEGIES[name];
}

/**
 * Gets all available strategy names.
 */
export function getStrategyNames(): string[] {
	return Object.keys(STRATEGIES);
}
