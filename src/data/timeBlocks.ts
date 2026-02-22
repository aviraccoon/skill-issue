/** Ordered time blocks within a weekday. */
export const TIME_BLOCKS = [
	"morning",
	"afternoon",
	"evening",
	"night",
] as const;

export type TimeBlock = (typeof TIME_BLOCKS)[number];

/** Action slots available per weekday time block. */
export const SLOTS_PER_BLOCK = 3;

/** Action points available per weekend day. */
export const WEEKEND_TOTAL_POINTS = 8;
