import { getScrollTrapFlavor } from "../data/scrollTrap";
import type { GameState } from "../state";
import type { Store } from "../store";
import { getScrollTrapEnergyCost } from "../systems/energy";
import { getScrollTrapMomentumPenalty } from "../systems/momentum";

/**
 * Check phone action - the scroll trap.
 * Always succeeds. Costs no action slot. Kills momentum AND drains energy.
 * Returns flavor text to display.
 */
export function checkPhone(store: Store<GameState>): string {
	const state = store.getState();

	// Momentum penalty (15-20% base, shifted by seed, deterministic within range)
	const momentumPenalty = getScrollTrapMomentumPenalty(store);
	store.update("momentum", (m) => Math.max(m - momentumPenalty, 0));

	// Energy drain - the hidden cost of scrolling (varies by seed)
	const energyCost = getScrollTrapEnergyCost(state.runSeed);
	store.update("energy", (e) => Math.max(e - energyCost, 0));

	// Track phone check in run stats
	store.update("runStats", (stats) => ({
		...stats,
		phoneChecks: stats.phoneChecks + 1,
	}));

	// Get flavor text using rollCount for deterministic variety, then increment
	const flavorText = getScrollTrapFlavor(state.rollCount);
	store.update("rollCount", (c) => c + 1);

	return flavorText;
}
