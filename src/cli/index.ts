#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { runCompare } from "./commands/compare";
import { runFindSeed } from "./commands/find-seed";
import { runInteractive } from "./commands/interactive";
import { runBatchSimulation } from "./commands/simulate";
import {
	printCompareHelp,
	printFindSeedHelp,
	printHelp,
	printPlayHelp,
	printSimulateHelp,
} from "./help";
import type { Verbosity } from "./output";
import { GROUP_BY_DIMENSIONS, type GroupByDimension } from "./stats";
import type { CliArgs } from "./types";

/** Valid group-by dimensions as a Set for validation. */
const VALID_GROUP_BY = new Set<string>(GROUP_BY_DIMENSIONS);

/**
 * Extracts the subcommand from argv before full parsing.
 */
function getCommand(args: string[]): CliArgs["command"] {
	const first = args[0];
	if (first === "simulate" || first === "sim") return "simulate";
	if (first === "play" || first === "interactive") return "play";
	if (first === "compare" || first === "cmp") return "compare";
	if (first === "find-seed" || first === "find") return "find-seed";
	return "help";
}

/**
 * Parses command line arguments using Node's parseArgs.
 */
function tryParseArgs(): CliArgs {
	const args = process.argv.slice(2);
	const command = getCommand(args);

	const { values, positionals } = parseArgs({
		args,
		allowPositionals: true,
		options: {
			// Simulate options
			runs: { type: "string", short: "n", default: "1" },
			seed: { type: "string", short: "s" },
			strategy: { type: "string", short: "t", multiple: true },

			// Verbosity
			quiet: { type: "boolean", short: "q", default: false },
			verbose: { type: "boolean", short: "v", default: false },
			json: { type: "boolean", default: false },

			// Filter options
			personality: { type: "string", short: "p" },
			"time-pref": { type: "string" },
			"social-pref": { type: "string" },
			survived: { type: "boolean", default: false },
			failed: { type: "boolean", default: false },

			// Grouping
			"group-by": { type: "string", short: "g", multiple: true },

			// Find-seed options
			limit: { type: "string", short: "l", default: "10" },
			"max-phone": { type: "string" },
			"min-phone": { type: "string" },
			"max-allnighters": { type: "string" },
			"min-allnighters": { type: "string" },
			"min-energy": { type: "string" },
			"max-energy": { type: "string" },
			"friend-unlocks": { type: "string", multiple: true },
			event: { type: "string", multiple: true },

			// Score filters
			"min-fun": { type: "string" },
			"max-fun": { type: "string" },
			"min-frustration": { type: "string" },
			"max-frustration": { type: "string" },
			"min-engagement": { type: "string" },
			"max-engagement": { type: "string" },

			// Debug
			debug: { type: "boolean", short: "d", default: false },

			// Help
			help: { type: "boolean", short: "h", default: false },
		},
	});

	// Check if --help was passed (for subcommand help)
	const showHelp = values.help || positionals.includes("help");

	// Determine verbosity from flags
	let verbosity: Verbosity = "normal";
	if (values.quiet) verbosity = "quiet";
	if (values.verbose) verbosity = "verbose";
	if (values.json) verbosity = "json";

	// Parse group-by values, filtering invalid ones
	const groupByRaw = values["group-by"] ?? [];
	const groupBy = groupByRaw.filter((g): g is GroupByDimension =>
		VALID_GROUP_BY.has(g),
	);

	// Handle strategy (single for simulate, multiple for compare)
	const strategies = values.strategy ?? [];
	const strategy = strategies[0] ?? "realistic";

	// Parse optional numeric value, returning null for missing or invalid input
	const parseNum = (v: string | undefined): number | null => {
		if (!v) return null;
		const n = Number.parseFloat(v);
		return Number.isNaN(n) ? null : n;
	};

	// Parse percentage as decimal (input is 0-100, store as 0-1)
	const parsePct = (v: string | undefined): number | null => {
		if (!v) return null;
		const n = Number.parseFloat(v);
		return Number.isNaN(n) ? null : n / 100;
	};

	// Alias for readability
	const parseEnergy = parsePct;

	const runs = Number.parseInt(values.runs, 10);
	if (Number.isNaN(runs) || runs < 1) {
		console.error(`Invalid value for --runs: "${values.runs}"`);
		process.exit(1);
	}

	const seed = values.seed ? Number.parseInt(values.seed, 10) : null;
	if (values.seed && (seed === null || Number.isNaN(seed))) {
		console.error(`Invalid value for --seed: "${values.seed}"`);
		process.exit(1);
	}

	return {
		command,
		showHelp,
		runs,
		seed,
		strategy,
		strategies,
		verbosity,
		filters: {
			personality: values.personality ?? null,
			timePref: values["time-pref"] ?? null,
			socialPref: values["social-pref"] ?? null,
			survivedOnly: values.survived,
			failedOnly: values.failed,
		},
		searchCriteria: {
			maxPhone: parseNum(values["max-phone"]),
			minPhone: parseNum(values["min-phone"]),
			maxAllNighters: parseNum(values["max-allnighters"]),
			minAllNighters: parseNum(values["min-allnighters"]),
			minEnergy: parseEnergy(values["min-energy"]),
			maxEnergy: parseEnergy(values["max-energy"]),
			friendUnlocks: values["friend-unlocks"] ?? [],
			events: values.event ?? [],
			minFun: parsePct(values["min-fun"]),
			maxFun: parsePct(values["max-fun"]),
			minFrustration: parsePct(values["min-frustration"]),
			maxFrustration: parsePct(values["max-frustration"]),
			minEngagement: parsePct(values["min-engagement"]),
			maxEngagement: parsePct(values["max-engagement"]),
		},
		limit: parseNum(values.limit) ?? 10,
		groupBy,
		debug: values.debug,
	};
}
/**
 * Main entry point.
 */
async function main(): Promise<void> {
	let args: CliArgs;

	try {
		args = tryParseArgs();
	} catch (err) {
		// Handle parseArgs errors with friendly messages
		if (err instanceof Error && "code" in err) {
			const code = (err as { code: string }).code;
			if (code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
				const match = err.message.match(/Unknown option '([^']+)'/);
				const option = match?.[1] ?? "unknown";
				console.error(`Unknown option: ${option}`);
				console.error(`Run 'bun run cli --help' for usage.`);
				process.exit(1);
			}
			if (code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE") {
				console.error(`Invalid option value: ${err.message}`);
				process.exit(1);
			}
		}
		throw err;
	}

	switch (args.command) {
		case "help":
			printHelp();
			break;

		case "simulate":
			if (args.showHelp) {
				printSimulateHelp();
			} else {
				runBatchSimulation(args);
			}
			break;

		case "compare":
			if (args.showHelp) {
				printCompareHelp();
			} else {
				runCompare(args);
			}
			break;

		case "find-seed":
			if (args.showHelp) {
				printFindSeedHelp();
			} else {
				runFindSeed(args);
			}
			break;

		case "play":
			if (args.showHelp) {
				printPlayHelp();
			} else {
				const seed = args.seed ?? Math.floor(Math.random() * 2147483647);
				await runInteractive(seed, args.debug);
			}
			break;
	}
}

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});
