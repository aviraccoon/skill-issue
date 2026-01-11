import { panelStyles, taskStyles } from "../components/App";
import { type GameState, isWeekend } from "../state";
import type { Store } from "../store";
import { calculateSuccessProbability } from "../systems/probability";

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
 */
export function attemptTask(store: Store<GameState>, taskId: string) {
	const state = store.getState();
	const task = state.tasks.find((t) => t.id === taskId);
	if (!task || task.succeededToday) return;

	// Check resource availability based on day type
	const weekend = isWeekend(state);
	if (weekend) {
		const cost = task.weekendCost ?? 1;
		if (state.weekendPointsRemaining < cost) return;
	} else {
		if (state.slotsRemaining <= 0) return;
	}

	const probability = calculateSuccessProbability(task, state);
	const succeeded = Math.random() < probability;

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

	// Update momentum based on outcome
	if (succeeded) {
		store.update("momentum", (m) => Math.min(m + 0.05, 1));

		// Saturday work penalty: drains energy for Sunday
		if (weekend && task.category === "work" && state.day === "saturday") {
			store.update("energy", (e) => Math.max(e - 0.1, 0));
		}
	} else {
		store.update("momentum", (m) => Math.max(m - 0.03, 0));
		// Trigger failure animations on both task and attempt button
		playFailureAnimation(taskId);
		playAttemptButtonFailure();
	}
}

/**
 * Plays the "almost" animation on a task button to indicate
 * the click didn't work. No error message - just the feeling.
 */
function playFailureAnimation(taskId: string) {
	const button = document.querySelector(`[data-id="${taskId}"]`);
	if (!button) return;

	button.classList.add(taskStyles.failing);
	button.addEventListener(
		"animationend",
		() => {
			button.classList.remove(taskStyles.failing);
		},
		{ once: true },
	);
}

/**
 * Plays a subtle shake on the Attempt button when task fails.
 */
function playAttemptButtonFailure() {
	const button = document.querySelector(`.${panelStyles.attemptBtn}`);
	if (!button) return;

	button.classList.add(panelStyles.attemptFailed);
	button.addEventListener(
		"animationend",
		() => {
			button.classList.remove(panelStyles.attemptFailed);
		},
		{ once: true },
	);
}
