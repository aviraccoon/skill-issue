import { chooseSleep, pushThrough } from "../actions/night";
import type { GameState } from "../state";
import type { Store } from "../store";
import { getExtendedNightDescription } from "../systems/allnighter";
import { capitalize } from "../utils/string";
import styles from "./NightChoice.module.css";

/**
 * Renders the night choice screen: Sleep or Push Through.
 * Shown at end of night block when player can choose to pull an all-nighter.
 */
export function renderNightChoice(
	store: Store<GameState>,
	state: GameState,
	container: HTMLElement,
) {
	const description = getExtendedNightDescription(state.energy);

	container.innerHTML = `
		<div class="${styles.choice}">
			<h2 class="${styles.title}">${capitalize(state.day)} Night</h2>
			<p class="${styles.prompt}">It's late. You could sleep. Or...</p>
			<p class="${styles.info}">${description}</p>
			<div class="${styles.buttons}">
				<button class="${styles.sleepBtn}">Sleep</button>
				<button class="${styles.pushThroughBtn}">Push Through</button>
			</div>
		</div>
	`;

	container
		.querySelector(`.${styles.sleepBtn}`)
		?.addEventListener("click", () => {
			chooseSleep(store);
		});

	container
		.querySelector(`.${styles.pushThroughBtn}`)
		?.addEventListener("click", () => {
			pushThrough(store);
		});
}
