import type { WeekCompleteInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import type { GameState } from "../state";
import { createInitialState } from "../state";
import type { Store } from "../store";
import { clearSave } from "../systems/persistence";
import styles from "./WeekComplete.module.css";

/**
 * Renders the week complete screen.
 */
export function renderWeekComplete(
	screenInfo: WeekCompleteInfo,
	container: HTMLElement,
	store: Store<GameState>,
) {
	const s = strings();

	container.innerHTML = `
		<div class="${styles.summary}">
			<h2 class="${styles.title}">${s.game.weekComplete}</h2>
			<p class="${styles.narrative}">${screenInfo.narrative}</p>
			<button class="${styles.restartBtn}">${s.game.startNewWeek}</button>
		</div>
	`;

	container
		.querySelector(`.${styles.restartBtn}`)
		?.addEventListener("click", () => {
			clearSave();
			const fresh = createInitialState();
			store.set("day", fresh.day);
			store.set("dayIndex", fresh.dayIndex);
			store.set("timeBlock", fresh.timeBlock);
			store.set("slotsRemaining", fresh.slotsRemaining);
			store.set("weekendPointsRemaining", fresh.weekendPointsRemaining);
			store.set("selectedTaskId", null);
			store.set("screen", "game");
			store.set("energy", fresh.energy);
			store.set("momentum", fresh.momentum);
			store.set("runSeed", fresh.runSeed);
			store.set("tasks", fresh.tasks);
		});
}
