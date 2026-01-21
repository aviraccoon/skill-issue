import { getPersonalityFromSeed } from "../../systems/personality";
import { createStateFromSeed, simulate } from "../engine";
import {
	createOutputObserver,
	outputBatchStats,
	outputSimulationHeader,
} from "../output";
import { aggregateStats, formatPercent } from "../stats";
import { getStrategy, getStrategyNames } from "../strategies";
import type { CliArgs, FilterOptions } from "../types";

/**
 * Checks if a personality matches the filter criteria.
 */
function matchesPersonalityFilter(
	personality: { time: string; social: string },
	filters: FilterOptions,
): boolean {
	// Check full personality filter (e.g., "nightOwl+hermit")
	if (filters.personality) {
		const parts = filters.personality.toLowerCase().split("+");
		const timePart = parts[0];
		const socialPart = parts[1];

		if (timePart && personality.time.toLowerCase() !== timePart) {
			return false;
		}
		if (socialPart && personality.social.toLowerCase() !== socialPart) {
			return false;
		}
	}

	// Check individual axis filters
	if (
		filters.timePref &&
		personality.time.toLowerCase() !== filters.timePref.toLowerCase()
	) {
		return false;
	}

	if (
		filters.socialPref &&
		personality.social.toLowerCase() !== filters.socialPref.toLowerCase()
	) {
		return false;
	}

	return true;
}

/**
 * Checks if a simulation result matches the outcome filter.
 */
function matchesOutcomeFilter(
	survived: boolean,
	filters: FilterOptions,
): boolean {
	if (filters.survivedOnly && !survived) return false;
	if (filters.failedOnly && survived) return false;
	return true;
}

/**
 * Checks if any personality filter is active.
 */
function hasPersonalityFilter(filters: FilterOptions): boolean {
	return !!(filters.personality || filters.timePref || filters.socialPref);
}

/**
 * Formats the active filters for display.
 */
function formatFilters(filters: FilterOptions): string {
	const parts: string[] = [];

	if (filters.personality) {
		parts.push(`personality=${filters.personality}`);
	}
	if (filters.timePref) {
		parts.push(`time=${filters.timePref}`);
	}
	if (filters.socialPref) {
		parts.push(`social=${filters.socialPref}`);
	}
	if (filters.survivedOnly) {
		parts.push("survived only");
	}
	if (filters.failedOnly) {
		parts.push("failed only");
	}

	return parts.length > 0 ? ` [${parts.join(", ")}]` : "";
}

/**
 * Runs batch simulation.
 */
export function runBatchSimulation(args: CliArgs): void {
	const strategy = getStrategy(args.strategy);
	if (!strategy) {
		console.error(`Unknown strategy: ${args.strategy}`);
		console.error(`Available: ${getStrategyNames().join(", ")}`);
		process.exit(1);
	}

	const results = [];
	const { filters } = args;
	const usePersonalityPreFilter = hasPersonalityFilter(filters);
	const useOutcomePostFilter = filters.survivedOnly || filters.failedOnly;

	if (args.runs === 1) {
		// Single run - show detailed output
		const seed = args.seed ?? Math.floor(Math.random() * 2147483647);
		const initialState = createStateFromSeed(seed);

		outputSimulationHeader(
			seed,
			initialState.personality,
			initialState.energy,
			initialState.momentum,
		);

		const observer = createOutputObserver(args.verbosity);
		const result = simulate(seed, strategy, observer);
		results.push(result);
	} else {
		// Batch run - show progress
		const filterDesc = formatFilters(filters);
		console.log(
			`Simulating ${args.runs} runs with ${args.strategy} strategy...${filterDesc}`,
		);
		console.log("");

		let seedCounter = 0;
		let matchingRuns = 0;
		const maxIterations = args.runs * 100; // Safety limit to avoid infinite loops

		while (matchingRuns < args.runs && seedCounter < maxIterations) {
			const seed =
				args.seed !== null
					? args.seed + seedCounter
					: Math.floor(Math.random() * 2147483647);

			// Pre-filter by personality before running simulation
			if (usePersonalityPreFilter) {
				const personality = getPersonalityFromSeed(seed);
				if (!matchesPersonalityFilter(personality, filters)) {
					seedCounter++;
					continue;
				}
			}

			const result = simulate(seed, strategy);

			// Post-filter by outcome
			if (
				useOutcomePostFilter &&
				!matchesOutcomeFilter(result.survived, filters)
			) {
				seedCounter++;
				continue;
			}

			results.push(result);
			matchingRuns++;
			seedCounter++;

			// Progress indicator
			if (matchingRuns % 100 === 0 || matchingRuns === args.runs) {
				const survived = results.filter((r) => r.survived).length;
				const rate = matchingRuns > 0 ? survived / matchingRuns : 0;
				process.stdout.write(
					`\r  ${matchingRuns}/${args.runs} runs (${formatPercent(rate)} survival)`,
				);
			}
		}

		if (matchingRuns < args.runs) {
			console.log("");
			console.log(
				`Warning: Only found ${matchingRuns} matching runs after ${seedCounter} iterations`,
			);
		}

		console.log("");
	}

	// Output stats
	if (args.runs > 1 && args.verbosity !== "json") {
		const stats = aggregateStats(results, args.groupBy);
		outputBatchStats(stats);
	} else if (args.verbosity === "json" && args.runs > 1) {
		const stats = aggregateStats(results, args.groupBy);
		console.log(JSON.stringify({ stats, results }, null, 2));
	}
}
