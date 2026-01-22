import { acceptFriendRescue } from "../actions/friend";
import type { Decision } from "../core/controller";
import {
	type FriendRescueInfo,
	getFriendRescueResultInfo,
} from "../core/screenInfo";
import type { GameState } from "../state";
import type { Store } from "../store";
import styles from "./FriendRescue.module.css";

/**
 * Renders the friend rescue screen.
 * Shows friend's message and activity choices.
 *
 * Note: This component handles the intermediate result screen locally
 * rather than using executeDecision, because the browser shows a pattern
 * hint before returning to the game screen. The CLI handles this inline.
 */
export function renderFriendRescue(
	screenInfo: FriendRescueInfo,
	container: HTMLElement,
	onDecision: (decision: Decision) => void,
	store: Store<GameState>,
) {
	container.innerHTML = `
		<div class="${styles.rescue}">
			<p class="${styles.message}">"${screenInfo.message}"</p>
			<p class="${styles.cost}">Meeting up will use ${screenInfo.costLabel}</p>
			<div class="${styles.activities}">
				${screenInfo.activities
					.map(
						(a) => `
					<button class="${styles.activity}" data-activity="${a.id}">
						<div class="${styles.activityName}">${a.name}</div>
						<div class="${styles.activityDesc}">${a.description}</div>
					</button>
				`,
					)
					.join("")}
			</div>
			<button class="${styles.declineBtn}">Not right now</button>
		</div>
	`;

	// Wire up activity buttons
	for (const activity of screenInfo.activities) {
		container
			.querySelector(`[data-activity="${activity.id}"]`)
			?.addEventListener("click", () => {
				// Call action directly to get result for intermediate screen
				const result = acceptFriendRescue(store, activity);
				showRescueResult(store, result.correct);
			});
	}

	// Wire up decline button - use decision pattern
	container
		.querySelector(`.${styles.declineBtn}`)
		?.addEventListener("click", () => {
			onDecision({ type: "declineRescue" });
		});
}

/**
 * Shows the result of the rescue with a pattern hint.
 * Browser-only intermediate screen before returning to game.
 */
function showRescueResult(store: Store<GameState>, correctTier: boolean) {
	const state = store.getState();
	const resultInfo = getFriendRescueResultInfo(state, correctTier);
	const container = document.getElementById("app");
	if (!container) return;

	container.innerHTML = `
		<div class="${styles.rescue}">
			<p class="${styles.message}">${resultInfo.message}</p>
			<p class="${styles.hint}">"${resultInfo.hint}"</p>
			<button class="${styles.declineBtn}">Continue</button>
		</div>
	`;

	container
		.querySelector(`.${styles.declineBtn}`)
		?.addEventListener("click", () => {
			store.set("screen", "game");
		});
}
