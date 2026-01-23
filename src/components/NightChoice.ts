import type { Decision } from "../core/controller";
import type { NightChoiceInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import styles from "./NightChoice.module.css";

/**
 * Renders the night choice screen: Sleep or Push Through.
 * Shown at end of night block when player can choose to pull an all-nighter.
 */
export function renderNightChoice(
	screenInfo: NightChoiceInfo,
	container: HTMLElement,
	onDecision: (decision: Decision) => void,
) {
	const s = strings();

	container.innerHTML = `
		<div class="${styles.choice}">
			<h1 class="${styles.title}" tabindex="-1">${s.game.nightTitle(screenInfo.day)}</h1>
			<p class="${styles.prompt}">${s.game.nightPrompt}</p>
			<p class="${styles.info}">${screenInfo.description}</p>
			<div class="${styles.buttons}">
				<button class="${styles.sleepBtn}">${s.game.sleep}</button>
				${screenInfo.canPushThrough ? `<button class="${styles.pushThroughBtn}">${s.game.pushThrough}</button>` : ""}
			</div>
		</div>
	`;

	// Focus heading for screen reader announcement
	const heading = container.querySelector<HTMLElement>(`.${styles.title}`);
	heading?.focus();

	container
		.querySelector(`.${styles.sleepBtn}`)
		?.addEventListener("click", () => {
			onDecision({ type: "sleep" });
		});

	container
		.querySelector(`.${styles.pushThroughBtn}`)
		?.addEventListener("click", () => {
			onDecision({ type: "pushThrough" });
		});
}
