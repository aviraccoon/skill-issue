import type { SimulationResult } from "./engine";

/**
 * Available grouping dimensions.
 */
export const GROUP_BY_DIMENSIONS = [
	"personality",
	"timePref",
	"socialPref",
	"startingEnergy",
	"allNighters",
] as const;

export type GroupByDimension = (typeof GROUP_BY_DIMENSIONS)[number];

/**
 * Statistics for a single simulation run.
 */
export interface RunStats {
	energy: {
		start: number;
		end: number;
		min: number;
	};
	momentum: {
		start: number;
		end: number;
		min: number;
	};
	tasks: {
		attempted: number;
		succeeded: number;
		successRate: number;
	};
	friendRescues: {
		triggered: number;
		accepted: number;
	};
	allNighters: number;
	phoneChecks: number;
}

/**
 * Group entry for batch stats.
 */
export interface GroupEntry {
	runs: number;
	survived: number;
	survivalRate: number;
}

/**
 * A single grouping result.
 */
export interface GroupingResult {
	label: string;
	entries: Record<string, GroupEntry>;
}

/**
 * Aggregated statistics across multiple runs.
 */
export interface BatchStats {
	runs: number;
	survivalRate: number;
	/** Stats grouped by each requested dimension */
	groupings: GroupingResult[];
	energy: {
		startAvg: number;
		endAvg: number;
		minAvg: number;
		endMin: number;
		endMax: number;
		endMedian: number;
	};
	momentum: {
		startAvg: number;
		endAvg: number;
		minAvg: number;
		endMin: number;
		endMax: number;
		endMedian: number;
	};
	tasks: {
		attemptedAvg: number;
		succeededAvg: number;
		successRateAvg: number;
	};
	friendRescues: {
		triggeredRate: number;
		acceptedRate: number;
	};
	allNighterRate: number;
	phoneChecksAvg: number;
}

/**
 * Gets the group key for a result based on the grouping dimension.
 */
function getGroupKey(
	result: SimulationResult,
	groupBy: GroupByDimension,
): string {
	switch (groupBy) {
		case "personality":
			return `${result.personality.time} + ${result.personality.social}`;
		case "timePref":
			return result.personality.time;
		case "socialPref":
			return result.personality.social;
		case "startingEnergy": {
			const energy = result.stats.energy.start;
			if (energy < 0.58) return "low (<58%)";
			if (energy < 0.62) return "medium (58-62%)";
			return "high (>62%)";
		}
		case "allNighters": {
			const count = result.stats.allNighters;
			if (count === 0) return "0 all-nighters";
			if (count === 1) return "1 all-nighter";
			return `${count}+ all-nighters`;
		}
	}
}

/**
 * Gets the label for a grouping dimension.
 */
function getGroupLabel(groupBy: GroupByDimension): string {
	switch (groupBy) {
		case "personality":
			return "Personality";
		case "timePref":
			return "Time Preference";
		case "socialPref":
			return "Social Preference";
		case "startingEnergy":
			return "Starting Energy";
		case "allNighters":
			return "All-Nighters";
	}
}

/**
 * Computes a single grouping from results.
 */
function computeGrouping(
	results: SimulationResult[],
	groupBy: GroupByDimension,
): GroupingResult {
	const entries: Record<string, GroupEntry> = {};

	for (const result of results) {
		const key = getGroupKey(result, groupBy);
		if (!entries[key]) {
			entries[key] = { runs: 0, survived: 0, survivalRate: 0 };
		}
		const entry = entries[key];
		if (entry) {
			entry.runs++;
			if (result.survived) entry.survived++;
		}
	}

	// Calculate survival rates
	for (const entry of Object.values(entries)) {
		entry.survivalRate = entry.runs > 0 ? entry.survived / entry.runs : 0;
	}

	return { label: getGroupLabel(groupBy), entries };
}

/**
 * Aggregates statistics from multiple simulation results.
 */
export function aggregateStats(
	results: SimulationResult[],
	groupByDimensions: GroupByDimension[] = [],
): BatchStats {
	if (results.length === 0) {
		return emptyBatchStats();
	}

	// Default to personality if no groupings specified
	const dimensions =
		groupByDimensions.length > 0 ? groupByDimensions : ["personality" as const];

	const survived = results.filter((r) => r.survived).length;
	const groupings = dimensions.map((dim) => computeGrouping(results, dim));

	const energyEnds: number[] = [];
	const momentumEnds: number[] = [];

	let totalEnergyStart = 0;
	let totalEnergyEnd = 0;
	let totalEnergyMin = 0;
	let totalMomentumStart = 0;
	let totalMomentumEnd = 0;
	let totalMomentumMin = 0;
	let totalAttempts = 0;
	let totalSuccesses = 0;
	let totalSuccessRate = 0;
	let totalFriendRescuesTriggered = 0;
	let totalFriendRescuesAccepted = 0;
	let totalAllNighters = 0;
	let totalPhoneChecks = 0;

	for (const result of results) {
		energyEnds.push(result.stats.energy.end);
		momentumEnds.push(result.stats.momentum.end);

		totalEnergyStart += result.stats.energy.start;
		totalEnergyEnd += result.stats.energy.end;
		totalEnergyMin += result.stats.energy.min;
		totalMomentumStart += result.stats.momentum.start;
		totalMomentumEnd += result.stats.momentum.end;
		totalMomentumMin += result.stats.momentum.min;
		totalAttempts += result.stats.tasks.attempted;
		totalSuccesses += result.stats.tasks.succeeded;
		totalSuccessRate += result.stats.tasks.successRate;
		totalFriendRescuesTriggered += result.stats.friendRescues.triggered;
		totalFriendRescuesAccepted += result.stats.friendRescues.accepted;
		totalAllNighters += result.stats.allNighters;
		totalPhoneChecks += result.stats.phoneChecks;
	}

	const n = results.length;

	energyEnds.sort((a, b) => a - b);
	momentumEnds.sort((a, b) => a - b);

	const median = (arr: number[]): number => {
		const mid = Math.floor(arr.length / 2);
		return arr.length % 2 !== 0
			? (arr[mid] ?? 0)
			: ((arr[mid - 1] ?? 0) + (arr[mid] ?? 0)) / 2;
	};

	return {
		runs: n,
		survivalRate: survived / n,
		groupings,
		energy: {
			startAvg: totalEnergyStart / n,
			endAvg: totalEnergyEnd / n,
			minAvg: totalEnergyMin / n,
			endMin: energyEnds[0] ?? 0,
			endMax: energyEnds[energyEnds.length - 1] ?? 0,
			endMedian: median(energyEnds),
		},
		momentum: {
			startAvg: totalMomentumStart / n,
			endAvg: totalMomentumEnd / n,
			minAvg: totalMomentumMin / n,
			endMin: momentumEnds[0] ?? 0,
			endMax: momentumEnds[momentumEnds.length - 1] ?? 0,
			endMedian: median(momentumEnds),
		},
		tasks: {
			attemptedAvg: totalAttempts / n,
			succeededAvg: totalSuccesses / n,
			successRateAvg: totalSuccessRate / n,
		},
		friendRescues: {
			triggeredRate: totalFriendRescuesTriggered / n,
			acceptedRate:
				totalFriendRescuesTriggered > 0
					? totalFriendRescuesAccepted / totalFriendRescuesTriggered
					: 0,
		},
		allNighterRate: totalAllNighters / n,
		phoneChecksAvg: totalPhoneChecks / n,
	};
}

/**
 * Returns empty batch stats.
 */
function emptyBatchStats(): BatchStats {
	return {
		runs: 0,
		survivalRate: 0,
		groupings: [],
		energy: {
			startAvg: 0,
			endAvg: 0,
			minAvg: 0,
			endMin: 0,
			endMax: 0,
			endMedian: 0,
		},
		momentum: {
			startAvg: 0,
			endAvg: 0,
			minAvg: 0,
			endMin: 0,
			endMax: 0,
			endMedian: 0,
		},
		tasks: {
			attemptedAvg: 0,
			succeededAvg: 0,
			successRateAvg: 0,
		},
		friendRescues: {
			triggeredRate: 0,
			acceptedRate: 0,
		},
		allNighterRate: 0,
		phoneChecksAvg: 0,
	};
}

/**
 * Formats a percentage for display.
 */
export function formatPercent(value: number): string {
	return `${(value * 100).toFixed(1)}%`;
}
