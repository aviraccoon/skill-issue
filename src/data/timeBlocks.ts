/** Ordered time blocks within a weekday. */
export const TIME_BLOCKS = [
	"morning",
	"afternoon",
	"evening",
	"night",
] as const;

export type TimeBlock = (typeof TIME_BLOCKS)[number];
