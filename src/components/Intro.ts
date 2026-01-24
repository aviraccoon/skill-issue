import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import { markIntroSeen } from "../systems/persistence";
import styles from "./Intro.module.css";

/**
 * Renders the intro screen for new players.
 * Shows brief instructions before the game starts.
 */
export function renderIntro(container: HTMLElement, store: Store<GameState>) {
	const s = strings();

	container.innerHTML = `
		<div class="${styles.intro}">
			<h1 class="${styles.title}">${s.intro.title}</h1>
			<p class="${styles.description}">${s.intro.description}</p>
			<button class="${styles.startBtn}">${s.intro.start}</button>
		</div>
	`;

	// Focus the start button
	const startBtn = container.querySelector<HTMLElement>(`.${styles.startBtn}`);
	startBtn?.focus();

	startBtn?.addEventListener("click", () => {
		// Mark intro as seen so it won't show again
		markIntroSeen();
		// Transition to game screen
		store.set("screen", "game");
	});
}
