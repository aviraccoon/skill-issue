import { continueToNextDay } from "../actions/time";
import {
	determineTone,
	generateAllNighterNarrative,
	generateNarrative,
	getAllNighterTitle,
	getDogNote,
} from "../data/daySummary";
import type { GameState } from "../state";
import type { Store } from "../store";
import { capitalize } from "../utils/string";
import styles from "./DaySummary.module.css";

/**
 * Renders the end-of-day summary screen.
 */
export function renderDaySummary(
	store: Store<GameState>,
	state: GameState,
	container: HTMLElement,
) {
	const tasks = state.tasks;
	const attempted = tasks.filter((t) => t.attemptedToday);
	const succeeded = tasks.filter((t) => t.succeededToday);

	const pulledAllNighter = state.inExtendedNight;
	const tone = determineTone(attempted.length, succeeded.length);
	const narrative = pulledAllNighter
		? generateAllNighterNarrative(state)
		: generateNarrative(tone);
	const dogNote = getDogNote(state);

	// Title shows the bleed-over if all-nighter
	const title = pulledAllNighter
		? getAllNighterTitle(state)
		: capitalize(state.day);

	container.innerHTML = `
		<div class="${styles.summary}">
			<h2 class="${styles.day}">${title}</h2>
			<p class="${styles.stats}">
				${succeeded.length} of ${attempted.length} tasks
			</p>
			<p class="${styles.narrative}">${narrative}</p>
			${dogNote ? `<p class="${styles.dogNote}">${dogNote}</p>` : ""}
			<button class="${styles.continueBtn}">Continue</button>
		</div>
	`;

	container
		.querySelector(`.${styles.continueBtn}`)
		?.addEventListener("click", () => {
			continueToNextDay(store);
		});
}
