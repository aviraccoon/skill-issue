/**
 * Scroll trap flavor text - shown after checking phone.
 * Dark comedy tone per GDD. Includes Azor reactions.
 */

import { strings } from "../i18n";

/** Gets scroll trap flavor text using a counter for deterministic variety. */
export function getScrollTrapFlavor(index: number): string {
	const s = strings();
	return s.scrollTrap[index % s.scrollTrap.length] as string;
}
