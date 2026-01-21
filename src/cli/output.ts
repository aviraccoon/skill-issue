import { getScrollTrapFlavor } from "../data/scrollTrap";
import type { GameState } from "../state";
import { getEvolvedDescription } from "../systems/evolution";
import type {
	ActionResult,
	DaySummary,
	Decision,
	SimulationObserver,
	SimulationResult,
} from "./engine";
import { type BatchStats, formatPercent } from "./stats";

/**
 * Output verbosity levels.
 */
export type Verbosity = "quiet" | "normal" | "verbose" | "json";

/**
 * Creates an observer that outputs based on verbosity level.
 */
export function createOutputObserver(verbosity: Verbosity): SimulationObserver {
	switch (verbosity) {
		case "quiet":
			return quietObserver;
		case "normal":
			return normalObserver;
		case "verbose":
			return verboseObserver;
		case "json":
			return jsonObserver;
		default:
			return normalObserver;
	}
}

/**
 * Quiet observer - only outputs final stats.
 */
const quietObserver: SimulationObserver = {
	onWeekEnd(result: SimulationResult) {
		console.log(result.survived ? "Survived" : "Failed");
	},
};

/**
 * Normal observer - outputs day summaries.
 */
const normalObserver: SimulationObserver = {
	onDayEnd(_state: GameState, summary: DaySummary) {
		const succeeded = summary.tasksSucceeded.length;
		const failed = summary.tasksFailed.length;
		const energy = formatPercent(summary.energyEnd);
		const momentum = formatPercent(summary.momentumEnd);

		let extras = "";
		if (summary.pulledAllNighter) extras += " [All-nighter]";
		if (summary.friendRescueAccepted) extras += " [Friend]";

		console.log(
			`${summary.day}: ${succeeded}/${succeeded + failed} tasks | E:${energy} M:${momentum}${extras}`,
		);
	},

	onWeekEnd(result: SimulationResult) {
		console.log("");
		console.log(result.survived ? "Week survived!" : "Week failed.");
		console.log(
			`Final: Energy ${formatPercent(result.stats.energy.end)}, Momentum ${formatPercent(result.stats.momentum.end)}`,
		);
	},
};

/**
 * Verbose observer - outputs every action.
 */
const verboseObserver: SimulationObserver = {
	onAction(state: GameState, decision: Decision, result: ActionResult) {
		const action = formatDecisionWithState(decision, state);
		const energyDelta = result.energyAfter - result.energyBefore;
		const momentumDelta = result.momentumAfter - result.momentumBefore;

		let line = `  ${action}`;

		if (decision.type === "attempt") {
			const outcome = result.succeeded ? "SUCCESS" : "FAIL";
			const prob = formatPercent(result.probability ?? 0);
			line += ` (${prob}) ${outcome}`;
		}

		// Show state changes
		const changes: string[] = [];
		if (Math.abs(energyDelta) > 0.001) {
			const sign = energyDelta > 0 ? "+" : "";
			changes.push(`E:${sign}${formatPercent(energyDelta)}`);
		}
		if (Math.abs(momentumDelta) > 0.001) {
			const sign = momentumDelta > 0 ? "+" : "";
			changes.push(`M:${sign}${formatPercent(momentumDelta)}`);
		}

		if (changes.length > 0) {
			line += ` [${changes.join(", ")}]`;
		}

		if (result.friendRescueTriggered) {
			line += " -> Friend rescue!";
		}

		// Add scroll trap flavor
		if (decision.type === "checkPhone") {
			line += ` "${getScrollTrapFlavor(state.rollCount)}"`;
		}

		console.log(line);
	},

	onDayEnd(_state: GameState, summary: DaySummary) {
		console.log("");
		console.log(`--- ${summary.day.toUpperCase()} END ---`);
		console.log(
			`Energy: ${formatPercent(summary.energyStart)} -> ${formatPercent(summary.energyEnd)}`,
		);
		console.log(
			`Momentum: ${formatPercent(summary.momentumStart)} -> ${formatPercent(summary.momentumEnd)}`,
		);
		if (summary.pulledAllNighter) {
			console.log("Pulled an all-nighter");
		}
		console.log("");
	},

	onWeekEnd(result: SimulationResult) {
		console.log("=".repeat(40));
		console.log(result.survived ? "WEEK SURVIVED" : "WEEK FAILED");
		console.log("=".repeat(40));
		console.log("");
		console.log("Final Stats:");
		console.log(
			`  Energy: ${formatPercent(result.stats.energy.end)} (min: ${formatPercent(result.stats.energy.min)})`,
		);
		console.log(
			`  Momentum: ${formatPercent(result.stats.momentum.end)} (min: ${formatPercent(result.stats.momentum.min)})`,
		);
		console.log(
			`  Tasks: ${result.stats.tasks.succeeded}/${result.stats.tasks.attempted} (${formatPercent(result.stats.tasks.successRate)})`,
		);
		console.log(`  Phone checks: ${result.stats.phoneChecks}`);
		console.log(`  All-nighters: ${result.stats.allNighters}`);
		console.log(
			`  Friend rescues: ${result.stats.friendRescues.triggered} triggered, ${result.stats.friendRescues.accepted} accepted`,
		);
	},
};

/**
 * JSON observer - outputs as JSON (for programmatic consumption).
 */
const jsonObserver: SimulationObserver = {
	onWeekEnd(result: SimulationResult) {
		console.log(JSON.stringify(result, null, 2));
	},
};

/**
 * Formats a decision for display.
 */
function formatDecision(decision: Decision): string {
	switch (decision.type) {
		case "attempt":
			return `Attempt: ${decision.taskId}`;
		case "skip":
			return "Skip time block";
		case "checkPhone":
			return "Check phone";
		case "endDay":
			return "End day";
		case "sleep":
			return "Sleep";
		case "pushThrough":
			return "Push through";
		case "acceptRescue":
			return `Accept rescue (${decision.activity})`;
		case "declineRescue":
			return "Decline rescue";
	}
}

/**
 * Formats a decision for display with state context (evolved task names).
 */
function formatDecisionWithState(decision: Decision, state: GameState): string {
	if (decision.type === "attempt") {
		const task = state.tasks.find((t) => t.id === decision.taskId);
		if (task) {
			const name = getEvolvedDescription(task, state.runSeed);
			return `Attempt: ${name}`;
		}
		return `Attempt: ${decision.taskId}`;
	}
	return formatDecision(decision);
}

/**
 * Outputs batch statistics.
 */
export function outputBatchStats(stats: BatchStats): void {
	console.log("");
	console.log("=".repeat(50));
	console.log("BATCH SIMULATION RESULTS");
	console.log("=".repeat(50));
	console.log("");
	console.log(`Runs: ${stats.runs}`);
	console.log(`Survival rate: ${formatPercent(stats.survivalRate)}`);
	console.log("");

	for (const grouping of stats.groupings) {
		console.log(`By ${grouping.label}:`);
		const sortedEntries = Object.entries(grouping.entries).sort(
			([, a], [, b]) => b.survivalRate - a.survivalRate,
		);
		for (const [key, data] of sortedEntries) {
			console.log(
				`  ${key}: ${formatPercent(data.survivalRate)} (${data.runs} runs)`,
			);
		}
		console.log("");
	}

	console.log("Energy (end of week):");
	console.log(`  Min: ${formatPercent(stats.energy.endMin)}`);
	console.log(`  Max: ${formatPercent(stats.energy.endMax)}`);
	console.log(`  Median: ${formatPercent(stats.energy.endMedian)}`);
	console.log(`  Avg: ${formatPercent(stats.energy.endAvg)}`);
	console.log("");

	console.log("Momentum (end of week):");
	console.log(`  Min: ${formatPercent(stats.momentum.endMin)}`);
	console.log(`  Max: ${formatPercent(stats.momentum.endMax)}`);
	console.log(`  Median: ${formatPercent(stats.momentum.endMedian)}`);
	console.log(`  Avg: ${formatPercent(stats.momentum.endAvg)}`);
	console.log("");

	console.log("Tasks:");
	console.log(`  Avg attempted: ${stats.tasks.attemptedAvg.toFixed(1)}`);
	console.log(`  Avg succeeded: ${stats.tasks.succeededAvg.toFixed(1)}`);
	console.log(
		`  Avg success rate: ${formatPercent(stats.tasks.successRateAvg)}`,
	);
	console.log("");

	console.log(
		`Friend rescue: ${stats.friendRescues.triggeredRate.toFixed(1)}x per run avg`,
	);
	console.log(
		`Friend rescue accepted: ${formatPercent(stats.friendRescues.acceptedRate)} when triggered`,
	);
	console.log(`All-nighters: ${formatPercent(stats.allNighterRate)} of runs`);
	console.log(`Avg phone checks: ${stats.phoneChecksAvg.toFixed(1)}`);
}

/**
 * Outputs a single simulation header.
 */
export function outputSimulationHeader(
	seed: number,
	personality: { time: string; social: string },
	startEnergy: number,
	startMomentum: number,
): void {
	console.log("");
	console.log(`Seed: ${seed}`);
	console.log(`Personality: ${personality.time} + ${personality.social}`);
	console.log(
		`Starting: Energy ${formatPercent(startEnergy)} | Momentum ${formatPercent(startMomentum)}`,
	);
	console.log("");
}

/**
 * Outputs a time block header in verbose mode.
 */
export function outputTimeBlockHeader(state: GameState): void {
	const weekend = state.dayIndex >= 5;
	if (weekend) {
		console.log(
			`${state.day} | ${state.weekendPointsRemaining} points remaining`,
		);
	} else {
		console.log(
			`${state.day} ${state.timeBlock} | ${state.slotsRemaining} slots`,
		);
	}
}
