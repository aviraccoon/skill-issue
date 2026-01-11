import type { GameState } from "../state";

export interface PatternHint {
	condition: (state: GameState) => boolean;
	message: string;
}

/**
 * Pattern hints the friend can give based on player's state and history.
 * Checked in order - first matching hint is used.
 */
export const PATTERN_HINTS: PatternHint[] = [
	{
		condition: (state) => {
			// Night is their best time
			return state.timeBlock === "night" && state.momentum > 0.6;
		},
		message: "You always seem more alive at night. That's not nothing.",
	},
	{
		condition: (state) => {
			// Creative tasks failing a lot
			const creative = state.tasks.find((t) => t.category === "creative");
			return creative !== undefined && creative.failureCount >= 4;
		},
		message:
			"That creative stuff... maybe it doesn't have to be the full thing every time?",
	},
	{
		condition: (state) => {
			// Low energy
			return state.energy < 0.3;
		},
		message: "You seem really wiped. Be gentle with yourself.",
	},
	{
		condition: (state) => {
			// Food tasks failing
			const cook = state.tasks.find((t) => t.id === "cook");
			return cook !== undefined && cook.failureCount >= 3;
		},
		message:
			"Ordering food still counts as feeding yourself. You know that, right?",
	},
	{
		condition: (state) => {
			// High momentum
			return state.momentum > 0.7;
		},
		message: "You're on a bit of a roll. Ride it.",
	},
	{
		condition: (state) => {
			// Dog is a reliable anchor
			const walk = state.tasks.find((t) => t.id === "walk-dog");
			return walk?.succeededToday === true;
		},
		message: "The dog walk helps, doesn't it? Gets you moving.",
	},
];

/** Fallback hint when no conditions match. */
export const FALLBACK_HINT = "That was nice. You seem a bit better.";

/**
 * Gets a pattern hint based on current game state.
 * Returns the first matching hint or a fallback.
 */
export function getPatternHint(state: GameState): string {
	for (const hint of PATTERN_HINTS) {
		if (hint.condition(state)) {
			return hint.message;
		}
	}
	return FALLBACK_HINT;
}
