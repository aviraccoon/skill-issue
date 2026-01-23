import { getPersonalityFromSeed } from "../../systems/personality";
import { createStateFromSeed, simulate } from "../engine";
import { formatPercent } from "../stats";
import { getStrategy, getStrategyNames } from "../strategies";
import type { CliArgs, FilterOptions, SearchCriteria } from "../types";

/**
 * Checks if a personality matches the filter criteria.
 */
function matchesPersonalityFilter(
	personality: { time: string; social: string },
	filters: FilterOptions,
): boolean {
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
 * Checks if a simulation result matches the search criteria.
 */
function matchesSearchCriteria(
	result: {
		survived: boolean;
		stats: {
			phoneChecks: number;
			allNighters: number;
			energy: { end: number };
			variantsUnlocked: string[];
		};
	},
	filters: FilterOptions,
	criteria: SearchCriteria,
): boolean {
	// Outcome filter
	if (filters.survivedOnly && !result.survived) return false;
	if (filters.failedOnly && result.survived) return false;

	// Phone checks
	if (
		criteria.maxPhone !== null &&
		result.stats.phoneChecks > criteria.maxPhone
	) {
		return false;
	}
	if (
		criteria.minPhone !== null &&
		result.stats.phoneChecks < criteria.minPhone
	) {
		return false;
	}

	// All-nighters
	if (
		criteria.maxAllNighters !== null &&
		result.stats.allNighters > criteria.maxAllNighters
	) {
		return false;
	}
	if (
		criteria.minAllNighters !== null &&
		result.stats.allNighters < criteria.minAllNighters
	) {
		return false;
	}

	// End energy
	if (
		criteria.minEnergy !== null &&
		result.stats.energy.end < criteria.minEnergy
	) {
		return false;
	}
	if (
		criteria.maxEnergy !== null &&
		result.stats.energy.end > criteria.maxEnergy
	) {
		return false;
	}

	// Friend unlocks - all specified categories must be unlocked
	for (const category of criteria.friendUnlocks) {
		if (!result.stats.variantsUnlocked.includes(category)) {
			return false;
		}
	}

	return true;
}

/**
 * Formats criteria for display.
 */
function formatCriteria(
	filters: FilterOptions,
	criteria: SearchCriteria,
): string {
	const parts: string[] = [];

	if (filters.personality) parts.push(`personality=${filters.personality}`);
	if (filters.timePref) parts.push(`time=${filters.timePref}`);
	if (filters.socialPref) parts.push(`social=${filters.socialPref}`);
	if (filters.survivedOnly) parts.push("survived");
	if (filters.failedOnly) parts.push("failed");
	if (criteria.maxPhone !== null) parts.push(`phone<=${criteria.maxPhone}`);
	if (criteria.minPhone !== null) parts.push(`phone>=${criteria.minPhone}`);
	if (criteria.maxAllNighters !== null)
		parts.push(`allNighters<=${criteria.maxAllNighters}`);
	if (criteria.minAllNighters !== null)
		parts.push(`allNighters>=${criteria.minAllNighters}`);
	if (criteria.minEnergy !== null)
		parts.push(`energy>=${formatPercent(criteria.minEnergy)}`);
	if (criteria.maxEnergy !== null)
		parts.push(`energy<=${formatPercent(criteria.maxEnergy)}`);
	if (criteria.friendUnlocks.length > 0)
		parts.push(`unlocks=${criteria.friendUnlocks.join("+")}`);

	return parts.length > 0 ? parts.join(", ") : "any";
}

/**
 * Runs seed search.
 */
export function runFindSeed(args: CliArgs): void {
	const strategy = getStrategy(args.strategy);
	if (!strategy) {
		console.error(`Unknown strategy: ${args.strategy}`);
		console.error(`Available: ${getStrategyNames().join(", ")}`);
		process.exit(1);
	}

	const { filters, searchCriteria, limit } = args;
	const hasPersonalityFilter = !!(
		filters.personality ||
		filters.timePref ||
		filters.socialPref
	);

	console.log(
		`Searching for seeds matching: ${formatCriteria(filters, searchCriteria)}`,
	);
	console.log(`Strategy: ${args.strategy}, Limit: ${limit}`);
	console.log("");

	const found: number[] = [];
	let seed = args.seed ?? Math.floor(Math.random() * 2147483647);
	let checked = 0;
	const maxIterations = limit * 10000; // Safety limit

	while (found.length < limit && checked < maxIterations) {
		// Pre-filter by personality
		if (hasPersonalityFilter) {
			const personality = getPersonalityFromSeed(seed);
			if (!matchesPersonalityFilter(personality, filters)) {
				seed++;
				checked++;
				continue;
			}
		}

		const result = simulate(seed, strategy);

		if (matchesSearchCriteria(result, filters, searchCriteria)) {
			found.push(seed);
			const state = createStateFromSeed(seed);
			const personality = `${state.personality.time} + ${state.personality.social}`;
			const status = result.survived ? "SURVIVED" : "FAILED";
			const energy = formatPercent(result.stats.energy.end);
			const phone = result.stats.phoneChecks;
			const allNighters = result.stats.allNighters;
			const unlocks =
				result.stats.variantsUnlocked.length > 0
					? ` unlocks=${result.stats.variantsUnlocked.join(",")}`
					: "";

			console.log(
				`${seed}: ${personality.padEnd(25)} ${status.padEnd(8)} energy=${energy.padStart(6)} phone=${phone} allNighters=${allNighters}${unlocks}`,
			);
		}

		seed++;
		checked++;

		// Progress every 1000 seeds
		if (checked % 1000 === 0) {
			process.stdout.write(
				`\r  Checked ${checked} seeds, found ${found.length}/${limit}...`,
			);
		}
	}

	if (checked >= maxIterations && found.length < limit) {
		console.log("");
		console.log(
			`Warning: Stopped after ${checked} seeds, found only ${found.length}`,
		);
	} else {
		process.stdout.write(
			`\r  Checked ${checked} seeds, found ${found.length}/${limit}    \n`,
		);
	}
}
