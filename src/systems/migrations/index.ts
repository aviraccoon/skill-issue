/**
 * Save data migration system.
 * Applies sequential migrations to bring old saves up to current version.
 */

import type { SaveDataV4 } from "../persistence";
import type { SaveDataV3 } from "./types";
import { migrateV3toV4 } from "./v3-to-v4";

/** Current save version. */
export const CURRENT_SAVE_VERSION = 4;

/** Union of all known save data versions. */
type AnySaveData = SaveDataV3 | SaveDataV4;

/** Migration function type. */
type MigrationFn = (data: AnySaveData) => AnySaveData;

/**
 * Migration functions keyed by source version.
 * Each function migrates from version N to version N+1.
 */
const migrations: { [version: number]: MigrationFn } = {
	3: (data) => migrateV3toV4(data as SaveDataV3),
};

/**
 * Runs all necessary migrations to bring save data to current version.
 * Returns null if migration is not possible (unknown version, no migration path).
 */
export function runMigrations(data: { version: number }): SaveDataV4 | null {
	let current: AnySaveData = data as AnySaveData;

	// Already current version
	if (current.version === CURRENT_SAVE_VERSION) {
		return current as SaveDataV4;
	}

	// Unknown future version - can't migrate
	if (current.version > CURRENT_SAVE_VERSION) {
		return null;
	}

	// Apply migrations sequentially
	while (current.version < CURRENT_SAVE_VERSION) {
		const migrator: MigrationFn | undefined = migrations[current.version];
		if (!migrator) {
			// No migration path from this version
			return null;
		}
		current = migrator(current);
	}

	return current as SaveDataV4;
}
