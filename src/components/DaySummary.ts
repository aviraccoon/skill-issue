import { continueToNextDay } from "../actions/time";
import type { DaySummaryInfo } from "../core/screenInfo";
import { strings } from "../i18n";
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
	const s = strings();

	container.innerHTML = `
		<div class="${styles.summary}">
			<h1 class="${styles.day}">${screenInfo.title}</h1>
			<p class="${styles.stats}">
				${s.game.taskStats(screenInfo.succeededCount, screenInfo.attemptedCount)}
			</p>
			<p class="${styles.narrative}">${screenInfo.narrative}</p>
			${screenInfo.dogNote ? `<p class="${styles.dogNote}">${screenInfo.dogNote}</p>` : ""}
			<button class="${styles.continueBtn}">${s.game.continue}</button>
		</div>
	`;

	// Focus continue button for keyboard users (announcement handles context)
	const continueBtn = container.querySelector<HTMLElement>(
		`.${styles.continueBtn}`,
	);
	continueBtn?.focus();

	container
		.querySelector(`.${styles.continueBtn}`)
		?.addEventListener("click", () => {
			continueToNextDay(store);
		});
}
