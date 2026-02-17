import type { Decision } from "../core/controller";
import type { NarrativeEventInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import styles from "./NarrativeEvent.module.css";

/**
 * Renders narrative event screens.
 * Minor events: interstitial with flavor text and Continue button.
 * Major events: title, description, and choice buttons.
 */
export function renderNarrativeEvent(
	screenInfo: NarrativeEventInfo,
	container: HTMLElement,
	onDecision: (decision: Decision) => void,
) {
	const s = strings();

	if (screenInfo.eventType === "major") {
		renderMajorEvent(screenInfo, container, onDecision);
	} else {
		renderMinorEvent(screenInfo, container, s, onDecision);
	}
}

/** Minor event: brief interstitial with text + Continue. */
function renderMinorEvent(
	screenInfo: NarrativeEventInfo,
	container: HTMLElement,
	s: ReturnType<typeof strings>,
	onDecision: (decision: Decision) => void,
) {
	container.innerHTML = `
		<div class="${styles.event}">
			<p class="${styles.text}">${screenInfo.text}</p>
			<button class="btn btn-secondary ${styles.continueBtn}">${s.game.continue}</button>
		</div>
	`;

	const continueBtn = container.querySelector<HTMLElement>(
		`.${styles.continueBtn}`,
	);
	continueBtn?.focus();
	continueBtn?.addEventListener("click", () => {
		onDecision({ type: "dismissEvent" });
	});
}

/** Major event: title, description, choices. */
function renderMajorEvent(
	screenInfo: NarrativeEventInfo,
	container: HTMLElement,
	onDecision: (decision: Decision) => void,
) {
	container.innerHTML = `
		<div class="${styles.event}">
			<h1 class="${styles.title}">${screenInfo.title}</h1>
			<p class="${styles.description}">${screenInfo.description}</p>
			<div class="${styles.choices}">
				${screenInfo.choices
					.map(
						(c) => `
					<button class="btn btn-primary ${styles.choiceBtn}" data-choice="${c.id}">
						<div class="${styles.choiceLabel}">${c.label}</div>
						<div class="${styles.choiceDesc}">${c.description}</div>
					</button>
				`,
					)
					.join("")}
			</div>
		</div>
	`;

	// Wire up choice buttons
	for (const choice of screenInfo.choices) {
		container
			.querySelector(`[data-choice="${choice.id}"]`)
			?.addEventListener("click", () => {
				onDecision({ type: "eventChoice", choiceId: choice.id });
			});
	}

	// Focus first choice for keyboard users
	const firstChoice = container.querySelector<HTMLElement>(
		`.${styles.choiceBtn}`,
	);
	firstChoice?.focus();
}
