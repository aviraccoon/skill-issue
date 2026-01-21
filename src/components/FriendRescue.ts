import {
	ACTIVITIES,
	type Activity,
	acceptFriendRescue,
	declineFriendRescue,
} from "../actions/friend";
import { type GameState, isWeekend } from "../state";
import type { Store } from "../store";
import { getRandomRescueMessage, getRescueCost } from "../systems/friend";
import { getPatternHint } from "../systems/patternHints";
import styles from "./FriendRescue.module.css";

/**
 * Renders the friend rescue screen.
 * Shows friend's message and activity choices.
 */
export function renderFriendRescue(
	store: Store<GameState>,
	state: GameState,
	container: HTMLElement,
) {
	const message = getRandomRescueMessage(
		state.runSeed + state.dayIndex + state.consecutiveFailures,
	);
	const cost = getRescueCost(state);
	const costLabel = isWeekend(state)
		? `${cost} action points`
		: `${cost} action slot`;

	container.innerHTML = `
		<div class="${styles.rescue}">
			<p class="${styles.message}">"${message}"</p>
			<p class="${styles.cost}">Meeting up will use ${costLabel}</p>
			<div class="${styles.activities}">
				${ACTIVITIES.map(
					(a) => `
					<button class="${styles.activity}" data-activity="${a.id}">
						<div class="${styles.activityName}">${a.name}</div>
						<div class="${styles.activityDesc}">${a.description}</div>
					</button>
				`,
				).join("")}
			</div>
			<button class="${styles.declineBtn}">Not right now</button>
		</div>
	`;

	// Wire up activity buttons
	for (const activity of ACTIVITIES) {
		container
			.querySelector(`[data-activity="${activity.id}"]`)
			?.addEventListener("click", () => {
				acceptRescue(store, activity);
			});
	}

	// Wire up decline button
	container
		.querySelector(`.${styles.declineBtn}`)
		?.addEventListener("click", () => {
			declineRescue(store);
		});
}

/**
 * Handles accepting the friend rescue with chosen activity.
 */
function acceptRescue(store: Store<GameState>, activity: Activity) {
	const result = acceptFriendRescue(store, activity);

	// Show brief result with pattern hint, then return to game
	showRescueResult(store, result.correct);
}

/**
 * Shows the result of the rescue with a pattern hint.
 */
function showRescueResult(store: Store<GameState>, correctTier: boolean) {
	const state = store.getState();
	const hint = getPatternHint(state);
	const container = document.getElementById("app");
	if (!container) return;

	const resultMessage = correctTier
		? "That was good. You feel better."
		: "You pushed yourself a bit too much. Still, you saw your friend.";

	container.innerHTML = `
		<div class="${styles.rescue}">
			<p class="${styles.message}">${resultMessage}</p>
			<p class="${styles.hint}">"${hint}"</p>
			<button class="${styles.declineBtn}">Continue</button>
		</div>
	`;

	container
		.querySelector(`.${styles.declineBtn}`)
		?.addEventListener("click", () => {
			store.set("screen", "game");
		});
}

/**
 * Handles declining the friend rescue.
 */
function declineRescue(store: Store<GameState>) {
	declineFriendRescue(store);

	// Return to game
	store.set("screen", "game");
}
