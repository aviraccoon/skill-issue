import { strings } from "../i18n";
import { DAYS, type GameState } from "../state";
import { pickVariant } from "../utils/random";

type Tone = "good" | "rough" | "mixed";

/** Determines narrative tone based on task success ratio. */
export function determineTone(attempted: number, succeeded: number): Tone {
	if (attempted === 0) return "rough";
	const ratio = succeeded / attempted;
	if (ratio >= 0.6) return "good";
	if (ratio <= 0.3) return "rough";
	return "mixed";
}

/** Generates narrative text based on tone. Uses dayIndex for variety. */
export function generateNarrative(tone: Tone, dayIndex: number): string {
	return pickVariant(strings().narrative[tone], dayIndex);
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
	return s.game.allNighterNarrative(state.day, nextDay, state.runSeed);
}

/** Returns a note about the dog's state for the day. Uses seed + dayIndex for variety. */
export function getDogNote(state: GameState): string | null {
	const walkDog = state.tasks.find((t) => t.id === "walk-dog");
	if (!walkDog) return null;

	const s = strings();
	const seed = state.runSeed + state.dayIndex;

	if (walkDog.succeededToday) {
		return pickVariant(s.dog.walked, seed);
	}

	if (walkDog.attemptedToday) {
		return pickVariant(s.dog.failedAttempt, seed);
	}

	return pickVariant(s.dog.forcedMinimal, seed);
}
