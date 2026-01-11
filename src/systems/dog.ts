import type { GameState, TimeBlock } from "../state";

/** Urgency levels for dog walk, escalating through the day. */
export type DogUrgency = "normal" | "waiting" | "urgent" | "critical";

/** Maps urgency level to display text for the task panel. */
export const URGENCY_DISPLAY: Record<DogUrgency, string> = {
	normal: "Normal",
	waiting: "Azor's been waiting",
	urgent: "He really needs to go",
	critical: "Critical - he's desperate",
};

/** Base urgency by time block (0-3). */
const TIME_BLOCK_URGENCY: Record<TimeBlock, number> = {
	morning: 0,
	afternoon: 1,
	evening: 2,
	night: 3,
};

/**
 * Calculates current dog walk urgency based on time of day and previous day failure.
 * Urgency affects guilt/consequence, not success rate.
 */
export function getDogUrgency(state: GameState): DogUrgency {
	// If dog was already walked today, no urgency
	const walkDog = state.tasks.find((t) => t.id === "walk-dog");
	if (walkDog?.succeededToday) {
		return "normal";
	}

	// Base urgency from time block (weekends don't have time blocks, use afternoon as default)
	const baseUrgency =
		state.dayIndex >= 5 ? 1 : TIME_BLOCK_URGENCY[state.timeBlock];

	// If dog wasn't walked yesterday, floor urgency at 1
	const urgencyFloor = state.dogFailedYesterday ? 1 : 0;

	const urgencyLevel = Math.max(baseUrgency, urgencyFloor);

	const urgencyMap: DogUrgency[] = ["normal", "waiting", "urgent", "critical"];
	return urgencyMap[urgencyLevel] ?? "critical";
}

/**
 * Checks if the dog was walked today (succeeded, not just attempted).
 */
export function wasDogWalkedToday(state: GameState): boolean {
	const walkDog = state.tasks.find((t) => t.id === "walk-dog");
	return walkDog?.succeededToday ?? false;
}

/**
 * Checks if the dog walk was attempted but failed today.
 */
export function wasDogWalkAttemptedButFailed(state: GameState): boolean {
	const walkDog = state.tasks.find((t) => t.id === "walk-dog");
	return (walkDog?.attemptedToday && !walkDog?.succeededToday) ?? false;
}
