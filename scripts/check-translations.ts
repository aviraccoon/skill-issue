/**
 * Reports missing translations for non-English locales.
 * Compares key structure between English and other locales.
 * Exits 0 -- warnings only, doesn't fail the build.
 */

import { cs } from "../src/i18n/cs";
import { en } from "../src/i18n/en";

function findMissing(
	source: Record<string, unknown>,
	target: Record<string, unknown>,
	path: string[] = [],
): string[] {
	const missing: string[] = [];

	for (const key of Object.keys(source)) {
		const sourceVal = source[key];
		const targetVal = target[key];
		const fullPath = [...path, key];

		if (targetVal === undefined) {
			missing.push(fullPath.join("."));
		} else if (
			sourceVal !== null &&
			typeof sourceVal === "object" &&
			!Array.isArray(sourceVal) &&
			typeof sourceVal !== "function"
		) {
			missing.push(
				...findMissing(
					sourceVal as Record<string, unknown>,
					(targetVal ?? {}) as Record<string, unknown>,
					fullPath,
				),
			);
		}
	}

	return missing;
}

const missing = findMissing(
	en as unknown as Record<string, unknown>,
	cs as unknown as Record<string, unknown>,
);

if (missing.length > 0) {
	// Group by top-level key for readable output
	const grouped: Record<string, string[]> = {};
	for (const path of missing) {
		const top = path.split(".")[0] ?? path;
		if (!grouped[top]) grouped[top] = [];
		grouped[top].push(path);
	}

	console.warn(`[i18n] ${missing.length} missing Czech translation(s):`);
	for (const [group, paths] of Object.entries(grouped)) {
		if (paths.length > 5) {
			console.warn(`  ${group}: ${paths.length} keys`);
		} else {
			for (const p of paths) {
				console.warn(`  ${p}`);
			}
		}
	}
}
