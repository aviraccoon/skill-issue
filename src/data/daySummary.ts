import { strings } from "../i18n";
import { DAYS, type GameState } from "../state";

type Tone = "good" | "rough" | "mixed";

/** Determines narrative tone based on task success ratio. */
export function determineTone(attempted: number, succeeded: number): Tone {
	if (attempted === 0) return "rough";
	const ratio = succeeded / attempted;
	if (ratio >= 0.6) return "good";
	if (ratio <= 0.3) return "rough";
	return "mixed";
}

/** Generates narrative text based on tone. */
export function generateNarrative(tone: Tone): string {
	const s = strings();
	return s.narrative[tone];
}

/** Gets title showing day bleed-over for all-nighter. */
export function getAllNighterTitle(state: GameState): string {
	const s = strings();
	const nextDay = DAYS[state.dayIndex + 1] ?? null;
	return s.game.allNighterTitle(state.day, nextDay);
}

/** Generates narrative for when player pushed through the night. */
export function generateAllNighterNarrative(state: GameState): string {
	const s = strings();
	const nextDay = DAYS[state.dayIndex + 1] ?? null;
	return s.game.allNighterNarrative(state.day, nextDay);
}

/** Returns a note about the dog's state for the day. */
export function getDogNote(state: GameState): string | null {
	const walkDog = state.tasks.find((t) => t.id === "walk-dog");
	if (!walkDog) return null;

	const s = strings();

	if (walkDog.succeededToday) {
		return s.dog.walked;
	}

	if (walkDog.attemptedToday) {
		// Attempted but failed
		return s.dog.failedAttempt;
	}

	// Didn't even attempt - forced minimal
	return s.dog.forcedMinimal;
}
