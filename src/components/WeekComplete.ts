import type { GameState } from "../state";
import { initialState } from "../state";
import type { Store } from "../store";
import { clearSave } from "../systems/persistence";
import styles from "./WeekComplete.module.css";

/**
 * Renders the week complete screen.
 */
export function renderWeekComplete(
	store: Store<GameState>,
	state: GameState,
	container: HTMLElement,
) {
	const tasks = state.tasks;
	const totalSuccesses = tasks.reduce(
		(sum, t) => sum + (t.succeededToday ? 1 : 0),
		0,
	);
	const totalFailures = tasks.reduce((sum, t) => sum + t.failureCount, 0);

	const tone = determineWeekTone(totalSuccesses, totalFailures);
	const narrative = generateWeekNarrative(tone);

	container.innerHTML = `
		<div class="${styles.summary}">
			<h2 class="${styles.title}">Week Complete</h2>
			<p class="${styles.narrative}">${narrative}</p>
			<button class="${styles.restartBtn}">Start New Week</button>
		</div>
	`;

	container
		.querySelector(`.${styles.restartBtn}`)
		?.addEventListener("click", () => {
			clearSave();
			// Reset to initial state
			store.set("day", initialState.day);
			store.set("dayIndex", initialState.dayIndex);
			store.set("timeBlock", initialState.timeBlock);
			store.set("slotsRemaining", initialState.slotsRemaining);
			store.set("weekendPointsRemaining", initialState.weekendPointsRemaining);
			store.set("selectedTaskId", null);
			store.set("screen", "game");
			store.set("energy", initialState.energy);
			store.set("momentum", initialState.momentum);
			store.update("tasks", () =>
				initialState.tasks.map((t) => ({
					...t,
					failureCount: 0,
					attemptedToday: false,
					succeededToday: false,
				})),
			);
		});
}

type WeekTone = "survived" | "rough" | "good";

function determineWeekTone(successes: number, failures: number): WeekTone {
	const total = successes + failures;
	if (total === 0) return "rough";
	const ratio = successes / total;
	if (ratio >= 0.5) return "good";
	if (ratio >= 0.3) return "survived";
	return "rough";
}

function generateWeekNarrative(tone: WeekTone): string {
	switch (tone) {
		case "good":
			return "You made it through. The dog got walked. You ate food. Some tasks happened, some didn't. That's a week.";
		case "rough":
			return "You survived. Barely, some days. The dog still loves you. You fed yourself, even if it was delivery every time. You're still here.";
		default:
			return "A week of attempts. Some worked. Most didn't. You had that one good moment where things clicked. Normal week, really.";
	}
}
