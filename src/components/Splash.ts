import type { SplashInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import styles from "./Splash.module.css";

/**
 * Renders the splash screen - the click gate before the main menu.
 * Shows rotating snarky text and enables audio on click.
 */
export function renderSplash(
	screenInfo: SplashInfo,
	container: HTMLElement,
	store: Store<GameState>,
) {
	const s = strings();

	container.innerHTML = `
		<div class="${styles.splash}">
			<h1 class="${styles.title}">${s.splash.title}</h1>
			<p class="${styles.text}">${screenInfo.splashText}</p>
			<button class="btn btn-primary ${styles.startBtn}">${screenInfo.startButton}</button>
		</div>
	`;

	const startBtn = container.querySelector<HTMLElement>(`.${styles.startBtn}`);
	startBtn?.focus();

	startBtn?.addEventListener("click", () => {
		// Future: initialize audio context here
		store.set("screen", "menu");
	});
}
