import { getPhoneBuzzText, getPhoneIgnoredText } from "../data/friendRescue";
import { type GameState, isWeekend } from "../state";
import type { Store } from "../store";
import {
	applyEnergyChange,
	calculateTaskEnergyEffect,
	getSaturdayWorkPenalty,
} from "../systems/energy";
import {
	FRIEND_RESCUE_THRESHOLD,
	PHONE_BUZZ_THRESHOLD,
	shouldTriggerFriendRescue,
} from "../systems/friend";
import {
	getMomentumFailurePenalty,
	getMomentumSuccessBonus,
} from "../systems/momentum";
import { calculateSuccessProbability } from "../systems/probability";
import { nextRoll } from "../utils/random";

/**
 * Callbacks for visual feedback during task attempts.
 * Optional - only provided in browser context.
 */
export interface AttemptCallbacks {
	onFailure?: (taskId: string) => void;
}

/**
 * Result of a task attempt.
 */
export interface AttemptResult {
	/** Whether the task attempt succeeded. */
	succeeded: boolean;
	/** The probability that was used for the roll. */
	probability: number;
	/** Whether the friend rescue screen was triggered. */
	friendRescueTriggered: boolean;
	/** Phone buzz flavor text (pre-rescue hint), if applicable. */
	phoneBuzzText?: string;
}

/**
 * Selects a task to view its details in the panel.
 */
export function selectTask(store: Store<GameState>, taskId: string) {
	store.set("selectedTaskId", taskId);
}

/**
 * Attempts to complete a task. Success is probabilistic based on
 * hidden state (energy, momentum) and time of day.
 * Consumes action slots (weekday) or points (weekend) regardless of outcome.
 *
 * @param callbacks Optional callbacks for visual feedback (browser only)
 * @returns Result of the attempt, or undefined if task cannot be attempted
 */
export function attemptTask(
	store: Store<GameState>,
	taskId: string,
	callbacks?: AttemptCallbacks,
): AttemptResult | undefined {
	const state = store.getState();
	const task = state.tasks.find((t) => t.id === taskId);
	if (!task || task.succeededToday) return undefined;

	// Check resource availability based on day type
	const weekend = isWeekend(state);
	if (weekend) {
		const cost = task.weekendCost ?? 1;
		if (state.weekendPointsRemaining < cost) return undefined;
	} else {
		if (state.slotsRemaining <= 0) return undefined;
	}

	const probability = calculateSuccessProbability(task, state);
	const succeeded = nextRoll(store) < probability;
	let friendRescueTriggered = false;

	// Update task state
	store.update("tasks", (tasks) =>
		tasks.map((t) => {
			if (t.id !== taskId) return t;
			return {
				...t,
				attemptedToday: true,
				succeededToday: succeeded,
				failureCount: succeeded ? t.failureCount : t.failureCount + 1,
			};
		}),
	);

	// Consume resource based on day type
	if (weekend) {
		const cost = task.weekendCost ?? 1;
		store.update("weekendPointsRemaining", (p) => p - cost);
	} else {
		store.update("slotsRemaining", (s) => s - 1);
	}

	// Apply energy effect from task attempt (personality-aware)
	const energyEffect = calculateTaskEnergyEffect(task, succeeded, state);
	store.update("energy", (e) => applyEnergyChange(e, energyEffect));

	// Update momentum and consecutive failures based on outcome
	if (succeeded) {
		const bonus = getMomentumSuccessBonus(state.runSeed);
		store.update("momentum", (m) => Math.min(m + bonus, 1));
		store.set("consecutiveFailures", 0);

		// Auto-satisfy linked task if defined (e.g., walk-dog -> go-outside)
		if (task.autoSatisfies) {
			const targetId = task.autoSatisfies;
			store.update("tasks", (tasks) =>
				tasks.map((t) => {
					if (t.id !== targetId) return t;
					return { ...t, succeededToday: true };
				}),
			);
		}

		// Saturday work penalty: drains energy for Sunday (varies by seed)
		if (weekend && task.category === "work" && state.day === "saturday") {
			const penalty = getSaturdayWorkPenalty(state.runSeed);
			store.update("energy", (e) => Math.max(e - penalty, 0));
		}
	} else {
		const penalty = getMomentumFailurePenalty(state.runSeed);
		store.update("momentum", (m) => Math.max(m - penalty, 0));
		store.update("consecutiveFailures", (c) => c + 1);

		// Trigger failure callback if provided (browser animations)
		callbacks?.onFailure?.(taskId);

		// Check if friend rescue should trigger
		if (shouldTriggerFriendRescue(store)) {
			store.set("screen", "friendRescue");
			friendRescueTriggered = true;
		}
	}

	// Get phone buzz text based on updated state (after failure increment)
	let phoneBuzzText: string | undefined;
	if (!succeeded) {
		const newState = store.getState();
		const failures = newState.consecutiveFailures;

		if (failures === PHONE_BUZZ_THRESHOLD) {
			// First hint at 2 failures
			phoneBuzzText = getPhoneBuzzText(newState);
		} else if (failures >= FRIEND_RESCUE_THRESHOLD && !friendRescueTriggered) {
			// Follow-up when rescue doesn't trigger
			phoneBuzzText = getPhoneIgnoredText(newState);
		}
	}

	return { succeeded, probability, friendRescueTriggered, phoneBuzzText };
}
