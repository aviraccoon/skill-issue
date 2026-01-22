import { continueToNextDay } from "../actions/time";
import type { DaySummaryInfo } from "../core/screenInfo";
import type { GameState } from "../state";
import type { Store } from "../store";
import styles from "./DaySummary.module.css";

/**
 * Renders the end-of-day summary screen.
 */
export function renderDaySummary(
	screenInfo: DaySummaryInfo,
	container: HTMLElement,
	store: Store<GameState>,
) {
	container.innerHTML = `
		<div class="${styles.summary}">
			<h2 class="${styles.day}">${screenInfo.title}</h2>
			<p class="${styles.stats}">
				${screenInfo.succeededCount} of ${screenInfo.attemptedCount} tasks
			</p>
			<p class="${styles.narrative}">${screenInfo.narrative}</p>
			${screenInfo.dogNote ? `<p class="${styles.dogNote}">${screenInfo.dogNote}</p>` : ""}
			<button class="${styles.continueBtn}">Continue</button>
		</div>
	`;

	container
		.querySelector(`.${styles.continueBtn}`)
		?.addEventListener("click", () => {
			continueToNextDay(store);
		});
}
