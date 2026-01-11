import { continueToNextDay } from "../actions/time";
import type { GameState } from "../state";
import type { Store } from "../store";
import { capitalize } from "../utils/string";
import styles from "./DaySummary.module.css";

/**
 * Renders the end-of-day summary screen.
 */
export function renderDaySummary(
	store: Store<GameState>,
	state: GameState,
	container: HTMLElement,
) {
	const tasks = state.tasks;
	const attempted = tasks.filter((t) => t.attemptedToday);
	const succeeded = tasks.filter((t) => t.succeededToday);

	const tone = determineTone(attempted.length, succeeded.length);
	const narrative = generateNarrative(tone);
	const dogNote = getDogNote(state);

	container.innerHTML = `
		<div class="${styles.summary}">
			<h2 class="${styles.day}">${capitalize(state.day)}</h2>
			<p class="${styles.stats}">
				${succeeded.length} of ${attempted.length} attempts worked
			</p>
			<p class="${styles.narrative}">${narrative}</p>
			${dogNote ? `<p class="${styles.dogNote}">${dogNote}</p>` : ""}
			<button class="${styles.continueBtn}">Continue</button>
		</div>
	`;

	container
		.querySelector(`.${styles.continueBtn}`)
		?.addEventListener("click", () => {
			continueToNextDay(store);
		});
}

type Tone = "good" | "rough" | "mixed";

function determineTone(attempted: number, succeeded: number): Tone {
	if (attempted === 0) return "rough";
	const ratio = succeeded / attempted;
	if (ratio >= 0.6) return "good";
	if (ratio <= 0.3) return "rough";
	return "mixed";
}

function generateNarrative(tone: Tone): string {
	switch (tone) {
		case "good":
			return "Things clicked today. Not everything, but enough.";
		case "rough":
			return "A hard day. The buttons didn't want to work. Tomorrow exists.";
		default:
			return "Some things happened. Some didn't. That's a day.";
	}
}

/** Returns a note about the dog's state for the day. */
function getDogNote(state: GameState): string | null {
	const walkDog = state.tasks.find((t) => t.id === "walk-dog");
	if (!walkDog) return null;

	if (walkDog.succeededToday) {
		return "Azor got his walk. He's happy.";
	}

	if (walkDog.attemptedToday) {
		// Attempted but failed
		return "You tried to walk Azor. Stood outside briefly. He's disappointed but understands.";
	}

	// Didn't even attempt - forced minimal
	return "You stood outside with Azor for a minute. It's not a walk, but it's something. He looks at you.";
}
