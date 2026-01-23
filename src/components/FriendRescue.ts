import { type AcceptRescueResult, acceptFriendRescue } from "../actions/friend";
import type { Decision } from "../core/controller";
import type { FriendRescueInfo } from "../core/screenInfo";
import { getRescueResultMessage } from "../data/friendRescue";
import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import { announce } from "../utils/announce";
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
	const s = strings();

	container.innerHTML = `
		<div class="${styles.rescue}">
			<h1 class="sr-only">${s.a11y.screenFriendRescue}</h1>
			<p class="${styles.message}">"${screenInfo.message}"</p>
			<p class="${styles.cost}">${s.game.rescueCost(screenInfo.costLabel)}</p>
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
			<button class="${styles.declineBtn}">${s.game.rescueDecline}</button>
		</div>
	`;

	// Wire up activity buttons
	for (const activity of screenInfo.activities) {
		container
			.querySelector(`[data-activity="${activity.id}"]`)
			?.addEventListener("click", () => {
				// Call action directly to get result for intermediate screen
				const result = acceptFriendRescue(store, activity);
				showRescueResult(store, result);
			});
	}

	// Wire up decline button - use decision pattern
	container
		.querySelector(`.${styles.declineBtn}`)
		?.addEventListener("click", () => {
			onDecision({ type: "declineRescue" });
		});

	// Focus first activity button for keyboard users
	const firstActivity = container.querySelector<HTMLElement>(
		`.${styles.activity}`,
	);
	firstActivity?.focus();
}

/**
 * Shows the result of the rescue with a pattern hint.
 * Browser-only intermediate screen before returning to game.
 */
function showRescueResult(store: Store<GameState>, result: AcceptRescueResult) {
	const container = document.getElementById("app");
	if (!container) return;

	const s = strings();
	const message = getRescueResultMessage(store.getState(), result.correct);

	// Announce result and hint for screen readers
	announce(`${message} ${result.hint}`);

	container.innerHTML = `
		<div class="${styles.rescue}">
			<h1 class="sr-only">${s.a11y.screenFriendRescue}</h1>
			<p class="${styles.message}">${message}</p>
			<p class="${styles.hint}">"${result.hint}"</p>
			<button class="${styles.declineBtn}">${s.game.continue}</button>
		</div>
	`;

	// Focus continue button for screen reader announcement
	const continueBtn = container.querySelector<HTMLElement>(
		`.${styles.declineBtn}`,
	);
	continueBtn?.focus();

	container
		.querySelector(`.${styles.declineBtn}`)
		?.addEventListener("click", () => {
			store.set("screen", "game");
		});
}
