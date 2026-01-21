/**
 * Scroll trap flavor text - shown after checking phone.
 * Dark comedy tone per GDD. Includes Azor reactions.
 */
export const SCROLL_TRAP_FLAVOR = [
	"Nothing new. You knew that.",
	"The algorithm thanks you.",
	"...anyway.",
	"30 minutes later...",
	"Azor glances at you. Looks away.",
	"The dog sighs. Or you imagine he does.",
	"You found nothing. As expected.",
	"Time passes. Nothing changes.",
] as const;

/** Gets scroll trap flavor text using a counter for deterministic variety. */
export function getScrollTrapFlavor(index: number): string {
	return SCROLL_TRAP_FLAVOR[index % SCROLL_TRAP_FLAVOR.length] as string;
}
