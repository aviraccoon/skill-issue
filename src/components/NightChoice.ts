import type { Decision } from "../core/controller";
import type { NightChoiceInfo } from "../core/screenInfo";
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
	container.innerHTML = `
		<div class="${styles.choice}">
			<h2 class="${styles.title}">${screenInfo.dayCapitalized} Night</h2>
			<p class="${styles.prompt}">It's late. You could sleep. Or...</p>
			<p class="${styles.info}">${screenInfo.description}</p>
			<div class="${styles.buttons}">
				<button class="${styles.sleepBtn}">Sleep</button>
				${screenInfo.canPushThrough ? `<button class="${styles.pushThroughBtn}">Push Through</button>` : ""}
			</div>
		</div>
	`;

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
