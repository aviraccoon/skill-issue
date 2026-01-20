import type { GameState } from "../state";
import type { Store } from "../store";
import { getScrollTrapEnergyCost } from "../systems/energy";
import { getScrollTrapMomentumPenalty } from "../systems/momentum";

/**
 * Check phone action - the scroll trap.
 * Always succeeds. Costs no action slot. Kills momentum AND drains energy.
 */
export function checkPhone(store: Store<GameState>) {
	const state = store.getState();

	// Momentum penalty (15-20% base, shifted by seed, random within range)
	const momentumPenalty = getScrollTrapMomentumPenalty(state.runSeed);
	store.update("momentum", (m) => Math.max(m - momentumPenalty, 0));

	// Energy drain - the hidden cost of scrolling (varies by seed)
	const energyCost = getScrollTrapEnergyCost(state.runSeed);
	store.update("energy", (e) => Math.max(e - energyCost, 0));
}
