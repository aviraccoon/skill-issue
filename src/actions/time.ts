import type { GameState } from "../state";
import { DAYS, TIME_BLOCKS } from "../state";
import type { Store } from "../store";

/**
 * Advances to the next time block. Resets action slots.
 * If at night, advances to next day.
 */
export function skipTimeBlock(store: Store<GameState>) {
	const state = store.getState();
	const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
	const nextBlock = TIME_BLOCKS[currentIndex + 1];

	if (nextBlock) {
		// Move to next time block
		store.set("timeBlock", nextBlock);
		store.set("slotsRemaining", 3);
	} else {
		// End of day - advance to next day
		advanceDay(store);
	}
}

/**
 * Advances to the next day. Resets time block to morning,
 * resets action slots, and clears daily task flags.
 */
function advanceDay(store: Store<GameState>) {
	const state = store.getState();
	const nextDayIndex = state.dayIndex + 1;

	const nextDay = DAYS[nextDayIndex];
	if (!nextDay) {
		// Week complete - TODO: show summary
		console.log("Week complete!");
		return;
	}

	store.set("day", nextDay);
	store.set("dayIndex", nextDayIndex);
	store.set("timeBlock", "morning");
	store.set("slotsRemaining", 3);

	// Reset daily flags on tasks
	store.update("tasks", (tasks) =>
		tasks.map((t) => ({
			...t,
			attemptedToday: false,
			succeededToday: false,
		})),
	);
}
