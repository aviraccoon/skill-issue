import * as readline from "node:readline";
import { getLocalizedActivities } from "../../actions/friend";
import { continueToNextDay } from "../../actions/time";
import {
	determineTone,
	generateAllNighterNarrative,
	generateNarrative,
	getAllNighterTitle,
	getDogNote,
} from "../../data/daySummary";
import {
	getRandomRescueMessage,
	getRescueResultMessage,
} from "../../data/friendRescue";
import { getScrollTrapFlavor } from "../../data/scrollTrap";
import type { GameState, Task } from "../../state";
import { createStore } from "../../store";
import { getExtendedNightDescription } from "../../systems/allnighter";
import { getDogUrgency, getUrgencyDisplay } from "../../systems/dog";
import { getEvolvedDescription } from "../../systems/evolution";
import { nextRoll } from "../../utils/random";
import {
	createStateFromSeed,
	type Decision,
	type DecisionContext,
	executeDecision,
	getAvailableDecisions,
	hasLost,
	isComplete,
	type Strategy,
} from "../engine";

/** Result of parsing user input. */
type ParseResult =
	| { ok: true; decision: Decision }
	| { ok: false; handled: boolean };

/**
 * Gets all tasks visible in the current time block (for stable numbering).
 * Includes completed tasks so numbers don't shift mid-block.
 */
function getVisibleTasks(state: GameState): Task[] {
	const weekend = state.dayIndex >= 5;
	if (weekend) {
		return state.tasks;
	}
	return state.tasks.filter((t) => t.availableBlocks.includes(state.timeBlock));
}

/**
 * Interactive strategy that prompts the user for decisions.
 */
export class InteractiveStrategy implements Strategy {
	private rl: readline.Interface;
	private debug: boolean;

	constructor(debug = false) {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		this.debug = debug;
	}

	async prompt(question: string): Promise<string> {
		return new Promise((resolve) => {
			this.rl.question(question, (answer) => {
				resolve(answer.trim().toLowerCase());
			});
		});
	}

	decide(_context: DecisionContext): Decision {
		// This synchronous method won't work well for interactive mode
		// We need to handle this differently in the main loop
		throw new Error("Use decideAsync for interactive mode");
	}

	async decideAsync(context: DecisionContext): Promise<Decision> {
		const { state, availableDecisions, screen } = context;

		// Display current state
		this.displayState(state, screen);

		// Display available options
		this.displayOptions(availableDecisions, state);

		// Get user input
		while (true) {
			const input = await this.prompt("\n> ");

			const result = this.parseInput(input, availableDecisions, state);
			if (result.ok) {
				return result.decision;
			}
			if (!result.handled) {
				console.log("Invalid input. Try again.");
			}
		}
	}

	private displayState(state: GameState, screen: string): void {
		console.log("");
		console.log("=".repeat(50));

		const weekend = state.dayIndex >= 5;

		if (screen === "friendRescue") {
			const message = getRandomRescueMessage(state);
			console.log("FRIEND RESCUE");
			console.log(`"${message}"`);
		} else if (screen === "nightChoice") {
			const description = getExtendedNightDescription(
				state.energy,
				state.rollCount,
			);
			console.log(`${state.day.toUpperCase()} NIGHT`);
			console.log("It's late. Sleep or push through?");
			console.log(description);
		} else if (weekend) {
			console.log(
				`${state.day.toUpperCase()} | ${state.weekendPointsRemaining} points`,
			);
		} else {
			console.log(
				`${state.day.toUpperCase()} ${state.timeBlock.toUpperCase()} | ${state.slotsRemaining} slots`,
			);
		}

		// Show hidden state if debug mode
		if (this.debug) {
			const e = (state.energy * 100).toFixed(1);
			const m = (state.momentum * 100).toFixed(1);
			console.log(`Energy: ${e}% | Momentum: ${m}%`);
			console.log(
				`Variants unlocked: ${state.variantsUnlocked.join(", ") || "none"}`,
			);
		} else {
			console.log(`Energy: [hidden] | Momentum: [hidden]`);
		}
		console.log("=".repeat(50));
	}

	private displayOptions(decisions: Decision[], state: GameState): void {
		const hasTaskAttempts = decisions.some((d) => d.type === "attempt");
		const isSpecialScreen =
			state.screen === "friendRescue" || state.screen === "nightChoice";

		// Only show tasks on game screen when there are attempts available
		if (hasTaskAttempts) {
			const visibleTasks = getVisibleTasks(state);
			const dogUrgency = getDogUrgency(state);

			console.log("");
			console.log("Tasks:");
			visibleTasks.forEach((task, i) => {
				const status = task.succeededToday ? " [done]" : "";
				const cost =
					state.dayIndex >= 5 && (task.weekendCost ?? 1) > 1
						? ` [${task.weekendCost}pt]`
						: "";
				const name = getEvolvedDescription(task, state.runSeed);

				// Show dog urgency for Walk Dog when not yet done
				let urgency = "";
				if (task.id === "walk-dog" && !task.succeededToday) {
					urgency = ` (${getUrgencyDisplay(dogUrgency, state.runSeed)})`;
				}

				console.log(`  ${i + 1}. ${name}${cost}${urgency}${status}`);

				// Show variant if unlocked for this task's category
				if (
					task.minimalVariant &&
					state.variantsUnlocked.includes(task.category) &&
					!task.succeededToday
				) {
					console.log(`  ${i + 1}v. ${task.minimalVariant.name}`);
				}
			});
		} else if (!isSpecialScreen) {
			console.log("");
			console.log("[Out of slots]");
		}

		// List other options
		console.log("");
		console.log("Commands:");

		const hasPhone = decisions.some((d) => d.type === "checkPhone");
		const hasSkip = decisions.some((d) => d.type === "skip");
		const hasEndDay = decisions.some((d) => d.type === "endDay");
		const hasSleep = decisions.some((d) => d.type === "sleep");
		const hasPushThrough = decisions.some((d) => d.type === "pushThrough");
		const hasAcceptRescue = decisions.some((d) => d.type === "acceptRescue");
		const hasDeclineRescue = decisions.some((d) => d.type === "declineRescue");

		if (hasPhone) console.log("  p, phone  - Check your phone");
		if (hasSkip) console.log("  s, skip   - Skip to next time block");
		if (hasEndDay) console.log("  e, end    - End the day");
		if (hasSleep) console.log("  sleep     - Go to sleep");
		if (hasPushThrough) console.log("  push      - Push through the night");

		if (hasAcceptRescue) {
			console.log("");
			console.log("Friend activities:");
			getLocalizedActivities(state.runSeed, state.dayIndex).forEach((a) => {
				console.log(`  ${a.id} - ${a.name}: ${a.description}`);
			});
		}
		if (hasDeclineRescue) console.log("  d, decline - Not right now");

		console.log("  q, quit   - Exit game");
	}

	/**
	 * Tries to find an attempt decision for a task.
	 * Returns result if task matched, undefined to continue parsing other options.
	 *
	 * @param useVariant If true, attempt the minimal variant instead
	 * @param state Game state for checking unlocked variants
	 */
	private tryAttemptTask(
		task: Task,
		decisions: Decision[],
		useVariant: boolean,
		state: GameState,
	): ParseResult | undefined {
		// Check if variant is requested but not available
		if (useVariant) {
			if (!task.minimalVariant) {
				console.log(`${task.name} has no variant.`);
				return { ok: false, handled: true };
			}
			if (!state.variantsUnlocked.includes(task.category)) {
				console.log(`${task.name} variant is not unlocked yet.`);
				return { ok: false, handled: true };
			}
		}

		const decision = decisions.find(
			(d) => d.type === "attempt" && d.taskId === task.id,
		);
		if (decision && decision.type === "attempt") {
			// Return with useVariant flag if requested
			if (useVariant) {
				return {
					ok: true,
					decision: {
						type: "attempt",
						taskId: decision.taskId,
						useVariant: true,
					},
				};
			}
			return { ok: true, decision };
		}

		// Task matched but not available
		if (task.succeededToday) {
			console.log(`${task.name} is already done.`);
			return { ok: false, handled: true };
		}

		return undefined; // Not this task, continue parsing
	}

	private parseInput(
		input: string,
		decisions: Decision[],
		state: GameState,
	): ParseResult {
		// Check for quit
		if (input === "quit" || input === "q" || input === "exit") {
			this.close();
			process.exit(0);
		}

		// Check for commands first (before partial matching could steal short inputs like "s")
		const command = this.parseCommand(input, decisions);
		if (command) {
			return { ok: true, decision: command };
		}

		// Get visible tasks for stable numbering
		const visibleTasks = getVisibleTasks(state);

		// Check for variant suffix (e.g., "1v", "2v")
		const variantMatch = input.match(/^(\d+)v$/);
		if (variantMatch) {
			const num = Number.parseInt(variantMatch[1] as string, 10);
			if (num > 0 && num <= visibleTasks.length) {
				const task = visibleTasks[num - 1];
				if (task) {
					const result = this.tryAttemptTask(task, decisions, true, state);
					if (result !== undefined) return result;
				}
			}
		}

		// Check for numbered task selection (using stable list)
		const num = Number.parseInt(input, 10);
		if (!Number.isNaN(num) && num > 0 && num <= visibleTasks.length) {
			const task = visibleTasks[num - 1];
			if (task) {
				const result = this.tryAttemptTask(task, decisions, false, state);
				if (result !== undefined) return result;
			}
		}

		// Check for task by partial name match with optional "-v" suffix for variant
		const variantSuffix = input.endsWith("-v");
		const searchTerm = variantSuffix ? input.slice(0, -2) : input;

		const matchingTask = visibleTasks.find(
			(t) =>
				t.name.toLowerCase().includes(searchTerm) ||
				t.id.toLowerCase().includes(searchTerm),
		);
		if (matchingTask) {
			const result = this.tryAttemptTask(
				matchingTask,
				decisions,
				variantSuffix,
				state,
			);
			if (result !== undefined) return result;
		}

		return { ok: false, handled: false };
	}

	/**
	 * Parses command input (non-task actions).
	 * Supports exact matches and partial prefix matching.
	 */
	private parseCommand(input: string, decisions: Decision[]): Decision | null {
		// Command definitions: [keywords, decision finder]
		const commands: Array<{
			keywords: string[];
			find: () => Decision | undefined;
		}> = [
			{
				keywords: ["phone", "p"],
				find: () => decisions.find((d) => d.type === "checkPhone"),
			},
			{
				keywords: ["skip", "s"],
				find: () => decisions.find((d) => d.type === "skip"),
			},
			{
				keywords: ["end", "e"],
				find: () => decisions.find((d) => d.type === "endDay"),
			},
			{
				keywords: ["sleep"],
				find: () => decisions.find((d) => d.type === "sleep"),
			},
			{
				keywords: ["push"],
				find: () => decisions.find((d) => d.type === "pushThrough"),
			},
			{
				keywords: ["decline", "d", "no"],
				find: () => decisions.find((d) => d.type === "declineRescue"),
			},
			{
				keywords: ["low", "coffee"],
				find: () =>
					decisions.find(
						(d) => d.type === "acceptRescue" && d.activity === "low",
					),
			},
			{
				keywords: ["medium", "med", "food"],
				find: () =>
					decisions.find(
						(d) => d.type === "acceptRescue" && d.activity === "medium",
					),
			},
			{
				keywords: ["high", "explore"],
				find: () =>
					decisions.find(
						(d) => d.type === "acceptRescue" && d.activity === "high",
					),
			},
		];

		// First try exact match
		for (const cmd of commands) {
			if (cmd.keywords.includes(input)) {
				return cmd.find() ?? null;
			}
		}

		// Then try prefix match (input is prefix of keyword)
		for (const cmd of commands) {
			if (cmd.keywords.some((kw) => kw.startsWith(input) && input.length > 0)) {
				return cmd.find() ?? null;
			}
		}

		return null;
	}

	close(): void {
		this.rl.close();
	}
}

/**
 * Runs the game in interactive mode.
 */
export async function runInteractive(
	seed: number,
	debug = false,
): Promise<void> {
	const initialState = createStateFromSeed(seed);
	const store = createStore(initialState);
	const strategy = new InteractiveStrategy(debug);

	console.log("");
	console.log("SKILL ISSUE - Interactive Mode");
	console.log("");
	console.log(`Seed: ${seed}`);
	console.log(
		`Personality: ${initialState.personality.time} + ${initialState.personality.social}`,
	);
	console.log("");

	try {
		while (!isComplete(store.getState()) && !hasLost(store.getState())) {
			const state = store.getState();

			// Handle day summary screen - show it then continue
			if (state.screen === "daySummary") {
				const attempted = state.tasks.filter((t) => t.attemptedToday);
				const succeeded = state.tasks.filter((t) => t.succeededToday);
				const pulledAllNighter = state.inExtendedNight;

				const title = pulledAllNighter
					? getAllNighterTitle(state)
					: state.day.toUpperCase();
				const tone = determineTone(attempted.length, succeeded.length);
				const narrative = pulledAllNighter
					? generateAllNighterNarrative(state)
					: generateNarrative(tone, state.runSeed + state.dayIndex);
				const dogNote = getDogNote(state);

				console.log("");
				console.log(`--- ${title} ---`);
				console.log(`${succeeded.length} of ${attempted.length} tasks`);
				console.log("");
				console.log(narrative);
				if (dogNote) {
					console.log(dogNote);
				}
				console.log("");
				await strategy.prompt("Press Enter to continue...");
				continueToNextDay(store);
				continue;
			}

			// Get available decisions
			const availableDecisions = getAvailableDecisions(state);
			if (availableDecisions.length === 0) {
				console.log("No decisions available - this shouldn't happen!");
				break;
			}

			// Get and execute decision
			const context = {
				state,
				availableDecisions,
				screen:
					state.screen === "friendRescue"
						? ("friendRescue" as const)
						: state.screen === "nightChoice"
							? ("nightChoice" as const)
							: ("game" as const),
				roll: () => nextRoll(store),
			};

			const decision = await strategy.decideAsync(context);
			const result = executeDecision(store, decision);

			// Show result
			if (decision.type === "attempt") {
				console.log("");
				const variantNote = decision.useVariant ? " (variant)" : "";
				if (result.succeeded) {
					console.log(`Success!${variantNote}`);
				} else {
					console.log(`Failed${variantNote}... the click just didn't work.`);
					// Show phone buzz hint if present
					if (result.phoneBuzzText) {
						console.log(result.phoneBuzzText);
					}
				}
			} else if (decision.type === "checkPhone") {
				console.log("");
				console.log(getScrollTrapFlavor(store.getState().rollCount));
			} else if (decision.type === "acceptRescue") {
				const resultMessage = getRescueResultMessage(
					store.getState(),
					result.rescueCorrect ?? false,
				);
				console.log("");
				console.log(resultMessage);
				if (result.rescueHint) {
					console.log(`"${result.rescueHint}"`);
				}
			}
		}

		// Game over
		const finalState = store.getState();
		console.log("");
		console.log("=".repeat(50));

		if (hasLost(finalState)) {
			console.log("WEEK FAILED");
			console.log("Your energy hit zero. You couldn't keep going.");
		} else {
			console.log("WEEK COMPLETE!");
			console.log("You made it through the week.");
		}

		console.log("=".repeat(50));
	} finally {
		strategy.close();
	}
}
