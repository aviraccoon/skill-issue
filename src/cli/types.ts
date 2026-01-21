import type { Verbosity } from "./output";
import type { GroupByDimension } from "./stats";

/**
 * Filter options for simulation runs.
 */
export interface FilterOptions {
	/** Full personality filter, e.g., "nightOwl+hermit" */
	personality: string | null;
	/** Time preference filter, e.g., "nightOwl" */
	timePref: string | null;
	/** Social preference filter, e.g., "hermit" */
	socialPref: string | null;
	/** Only show survived runs */
	survivedOnly: boolean;
	/** Only show failed runs */
	failedOnly: boolean;
}

/**
 * Search criteria for find-seed command.
 */
export interface SearchCriteria {
	maxPhone: number | null;
	minPhone: number | null;
	maxAllNighters: number | null;
	minAllNighters: number | null;
	minEnergy: number | null;
	maxEnergy: number | null;
}

/**
 * CLI argument parsing result.
 */
export interface CliArgs {
	command: "simulate" | "play" | "compare" | "find-seed" | "help";
	showHelp: boolean;
	runs: number;
	seed: number | null;
	strategy: string;
	strategies: string[];
	verbosity: Verbosity;
	filters: FilterOptions;
	searchCriteria: SearchCriteria;
	limit: number;
	groupBy: GroupByDimension[];
}
