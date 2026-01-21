import { DAYS, type GameState } from "../state";
import { capitalize } from "../utils/string";

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
	switch (tone) {
		case "good":
			return "Things clicked today. Not everything, but enough.";
		case "rough":
			return "A hard day. The buttons didn't want to work. Tomorrow exists.";
		default:
			return "Some things happened. Some didn't. That's a day.";
	}
}

/** Gets title showing day bleed-over for all-nighter. */
export function getAllNighterTitle(state: GameState): string {
	const nextDay = DAYS[state.dayIndex + 1];
	if (!nextDay) {
		return `${capitalize(state.day)} (late)`;
	}
	return `${capitalize(state.day)} / ${capitalize(nextDay)}`;
}

/** Generates narrative for when player pushed through the night. */
export function generateAllNighterNarrative(state: GameState): string {
	const nextDay = DAYS[state.dayIndex + 1];
	const nextDayName = nextDay ? capitalize(nextDay) : "the next day";
	return `${capitalize(state.day)} bled into ${nextDayName}. You pushed through. At some point you stopped.`;
}

/** Returns a note about the dog's state for the day. */
export function getDogNote(state: GameState): string | null {
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
