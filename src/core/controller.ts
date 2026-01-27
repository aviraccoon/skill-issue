/**
 * Shared game controller.
 * Provides the decision flow for both CLI and browser interfaces.
 */

import {
	ACTIVITIES,
	type ActivityTier,
	acceptFriendRescue,
	declineFriendRescue,
} from "../actions/friend";
import { chooseSleep, pushThrough } from "../actions/night";
import { checkPhone } from "../actions/phone";
import { type AttemptCallbacks, attemptTask } from "../actions/tasks";
import { endWeekendDay, skipTimeBlock } from "../actions/time";
import type { PhoneOutcome } from "../data/scrollTrap";
import type { TaskCategory, TaskId } from "../data/tasks";
import { type GameState, isWeekend, type Task } from "../state";
import type { Store } from "../store";
import { canPushThrough } from "../systems/allnighter";

/**
 * Possible decisions during gameplay.
 */
export type Decision =
	| { type: "attempt"; taskId: TaskId; useVariant?: boolean }
	| { type: "skip" }
	| { type: "checkPhone" }
	| { type: "endDay" } // weekend only
	| { type: "sleep" }
	| { type: "pushThrough" }
	| { type: "acceptRescue"; activity: ActivityTier }
	| { type: "declineRescue" };

/**
 * Result of a single action.
 */
export interface ActionResult {
	decision: Decision;
	succeeded?: boolean;
	probability?: number;
	friendRescueTriggered?: boolean;
	/** Phone buzz flavor text (pre-rescue hint), if applicable. */
	phoneBuzzText?: string;
	/** Scroll trap flavor text, if applicable. */
	scrollTrapText?: string;
	/** Phone outcome tier, if checkPhone was used. */
	phoneOutcome?: PhoneOutcome;
	/** Variant category unlocked via phone, if applicable. */
	phoneUnlockedVariant?: TaskCategory;
	/** Whether friend rescue nudge was applied via phone, if applicable. */
	phoneFriendNudge?: boolean;
	/** Pattern hint from friend rescue, if applicable. */
	rescueHint?: string;
	/** Whether rescue tier was correct for energy level. */
	rescueCorrect?: boolean;
	energyBefore: number;
	energyAfter: number;
	momentumBefore: number;
	momentumAfter: number;
}

/**
 * Gets available tasks for the current state.
 */
export function getAvailableTasks(state: GameState): Task[] {
	const weekend = isWeekend(state);

	if (weekend) {
		// Weekend: all tasks available that haven't succeeded
		return state.tasks.filter((t) => !t.succeededToday);
	}

	// Weekday: filter by time block and not succeeded
	return state.tasks.filter(
		(t) => t.availableBlocks.includes(state.timeBlock) && !t.succeededToday,
	);
}

/**
 * Gets all available decisions for the current state.
 */
export function getAvailableDecisions(state: GameState): Decision[] {
	const decisions: Decision[] = [];
	const weekend = isWeekend(state);

	// Handle special screens first
	if (state.screen === "friendRescue") {
		for (const activity of ACTIVITIES) {
			decisions.push({ type: "acceptRescue", activity: activity.id });
		}
		decisions.push({ type: "declineRescue" });
		return decisions;
	}

	if (state.screen === "nightChoice") {
		decisions.push({ type: "sleep" });
		if (canPushThrough(state)) {
			decisions.push({ type: "pushThrough" });
		}
		return decisions;
	}

	// Game screen decisions
	if (weekend) {
		// Weekend: can attempt tasks if have points, can end day anytime
		if (state.weekendPointsRemaining > 0) {
			const availableTasks = getAvailableTasks(state);
			for (const task of availableTasks) {
				const cost = task.weekendCost ?? 1;
				if (state.weekendPointsRemaining >= cost) {
					decisions.push({ type: "attempt", taskId: task.id });
				}
			}
			decisions.push({ type: "checkPhone" });
		}
		decisions.push({ type: "endDay" });
	} else {
		// Weekday: can attempt tasks if have slots
		if (state.slotsRemaining > 0) {
			const availableTasks = getAvailableTasks(state);
			for (const task of availableTasks) {
				decisions.push({ type: "attempt", taskId: task.id });
			}
			decisions.push({ type: "checkPhone" });
		}
		decisions.push({ type: "skip" });
	}

	return decisions;
}

/**
 * Executes a decision and returns the result.
 * Optional callbacks allow browser to hook in animations.
 */
export function executeDecision(
	store: Store<GameState>,
	decision: Decision,
	callbacks?: AttemptCallbacks,
): ActionResult {
	const stateBefore = store.getState();
	const energyBefore = stateBefore.energy;
	const momentumBefore = stateBefore.momentum;

	let succeeded: boolean | undefined;
	let probability: number | undefined;
	let friendRescueTriggered: boolean | undefined;
	let phoneBuzzText: string | undefined;
	let scrollTrapText: string | undefined;
	let phoneOutcome: PhoneOutcome | undefined;
	let phoneUnlockedVariant: TaskCategory | undefined;
	let phoneFriendNudge: boolean | undefined;
	let rescueHint: string | undefined;
	let rescueCorrect: boolean | undefined;

	switch (decision.type) {
		case "attempt": {
			const result = attemptTask(
				store,
				decision.taskId,
				callbacks,
				decision.useVariant,
			);
			if (result) {
				succeeded = result.succeeded;
				probability = result.probability;
				friendRescueTriggered = result.friendRescueTriggered;
				phoneBuzzText = result.phoneBuzzText;
			}
			break;
		}

		case "skip":
			skipTimeBlock(store);
			break;

		case "checkPhone": {
			const result = checkPhone(store);
			scrollTrapText = result.flavorText;
			phoneOutcome = result.outcome;
			phoneUnlockedVariant = result.unlocksVariant;
			phoneFriendNudge = result.friendNudge;
			break;
		}

		case "endDay":
			endWeekendDay(store);
			break;

		case "sleep":
			chooseSleep(store);
			break;

		case "pushThrough":
			pushThrough(store);
			break;

		case "acceptRescue": {
			const activity = ACTIVITIES.find((a) => a.id === decision.activity);
			if (activity) {
				const result = acceptFriendRescue(store, activity);
				rescueHint = result.hint;
				rescueCorrect = result.correct;
				store.set("screen", "game");
			}
			break;
		}

		case "declineRescue":
			declineFriendRescue(store);
			store.set("screen", "game");
			break;
	}

	const stateAfter = store.getState();

	return {
		decision,
		succeeded,
		probability,
		friendRescueTriggered,
		phoneBuzzText,
		scrollTrapText,
		phoneOutcome,
		phoneUnlockedVariant,
		phoneFriendNudge,
		rescueHint,
		rescueCorrect,
		energyBefore,
		energyAfter: stateAfter.energy,
		momentumBefore,
		momentumAfter: stateAfter.momentum,
	};
}

/**
 * Checks if the game has reached a losing condition.
 */
export function hasLost(state: GameState): boolean {
	return state.energy <= 0;
}

/**
 * Checks if the game is complete (reached week end).
 */
export function isComplete(state: GameState): boolean {
	return state.screen === "weekComplete";
}
