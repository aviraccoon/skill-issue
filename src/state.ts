export type TimeBlock = "morning" | "afternoon" | "evening" | "night";
export type Day =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";

export interface Task {
	id: string;
	name: string;
	category:
		| "hygiene"
		| "food"
		| "chores"
		| "dog"
		| "work"
		| "creative"
		| "selfcare"
		| "social";
	baseRate: number; // 0-1, base success probability
	minimalVariant?: {
		name: string;
		baseRate: number;
	};
	availableBlocks: TimeBlock[]; // when this task can appear
	weekendCost?: number; // action points on weekend (default 1)
	failureCount: number; // how many times failed this week
	attemptedToday: boolean;
	succeededToday: boolean;
}

export type Screen = "game" | "daySummary" | "weekComplete";

export interface GameState {
	day: Day;
	dayIndex: number; // 0-6
	timeBlock: TimeBlock;
	slotsRemaining: number; // weekday action slots per time block
	weekendPointsRemaining: number; // weekend action points (8 total)
	tasks: Task[];
	selectedTaskId: string | null;
	screen: Screen;

	// Hidden from player
	energy: number; // 0-1
	momentum: number; // 0-1, starts at 0.5
}

/** Returns true if the current day is Saturday or Sunday. */
export function isWeekend(state: GameState): boolean {
	return state.dayIndex >= 5;
}

export const initialTasks: Task[] = [
	{
		id: "shower",
		name: "Shower",
		category: "hygiene",
		baseRate: 0.35,
		minimalVariant: { name: "Splash face with water", baseRate: 0.7 },
		availableBlocks: ["morning", "evening"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "brush-teeth-morning",
		name: "Brush Teeth",
		category: "hygiene",
		baseRate: 0.35,
		availableBlocks: ["morning"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "brush-teeth-evening",
		name: "Brush Teeth",
		category: "hygiene",
		baseRate: 0.2,
		availableBlocks: ["evening", "night"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "cook",
		name: "Cook Meal",
		category: "food",
		baseRate: 0.1,
		minimalVariant: { name: "Microwave something", baseRate: 0.5 },
		availableBlocks: ["morning", "afternoon", "evening"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "delivery",
		name: "Order Delivery",
		category: "food",
		baseRate: 0.75,
		availableBlocks: ["afternoon", "evening", "night"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "dishes",
		name: "Do Dishes",
		category: "chores",
		baseRate: 0.25,
		minimalVariant: { name: "Wash one dish", baseRate: 0.55 },
		availableBlocks: ["morning", "afternoon", "evening"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "walk-dog",
		name: "Walk Dog",
		category: "dog",
		baseRate: 0.85,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "work",
		name: "Work Task",
		category: "work",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "practice-music",
		name: "Practice Music",
		category: "creative",
		baseRate: 0.05,
		availableBlocks: ["afternoon", "evening", "night"],
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "shopping",
		name: "Go Shopping",
		category: "chores",
		baseRate: 0.3,
		availableBlocks: ["morning", "afternoon", "evening"],
		weekendCost: 2,
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
	{
		id: "social-event",
		name: "Social Event",
		category: "social",
		baseRate: 0.35,
		availableBlocks: ["afternoon", "evening"],
		weekendCost: 3,
		failureCount: 0,
		attemptedToday: false,
		succeededToday: false,
	},
];

export const initialState: GameState = {
	day: "monday",
	dayIndex: 0,
	timeBlock: "morning",
	slotsRemaining: 3,
	weekendPointsRemaining: 8,
	tasks: initialTasks,
	selectedTaskId: null,
	screen: "game",
	energy: 0.6,
	momentum: 0.5,
};

export const DAYS: Day[] = [
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
	"sunday",
];

export const TIME_BLOCKS: TimeBlock[] = [
	"morning",
	"afternoon",
	"evening",
	"night",
];
