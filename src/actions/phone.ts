import type { GameState } from "../state";
import type { Store } from "../store";

/** Minimum momentum penalty from scroll trap. */
const SCROLL_PENALTY_MIN = 0.15;

/** Maximum momentum penalty from scroll trap. */
const SCROLL_PENALTY_MAX = 0.2;

/**
 * Check phone action - the scroll trap.
 * Always succeeds. Costs no action slot. Kills momentum.
 */
export function checkPhone(store: Store<GameState>) {
	// Random penalty between 15-20%
	const penalty =
		SCROLL_PENALTY_MIN +
		Math.random() * (SCROLL_PENALTY_MAX - SCROLL_PENALTY_MIN);
	store.update("momentum", (m) => Math.max(m - penalty, 0));
}
