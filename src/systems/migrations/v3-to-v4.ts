/**
 * Migration from save version 3 to version 4.
 * Changes: currentRun → runs.main/seeded structure for multi-mode saves.
 */

import type { SaveDataV4 } from "../persistence";
import type { SaveDataV3 } from "./types";

/**
 * Migrates v3 save data to v4 format.
 * - Moves currentRun to runs.main
 * - Adds empty runs.seeded slot
 * - Adds gameMode field to saved state
 * - Preserves patterns data
 */
export function migrateV3toV4(data: SaveDataV3): SaveDataV4 {
	return {
		version: 4,
		runs: {
			// Add gameMode to migrated save (default to "main")
			main: data.currentRun ? { ...data.currentRun, gameMode: "main" } : null,
			seeded: null,
		},
		patterns: data.patterns,
		savedAt: Date.now(),
	};
}
