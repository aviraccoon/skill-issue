import type { Task, TaskEvolution, TimeBlock } from "../state";

/** Task category for grouping and modifiers. */
export type TaskCategory =
	| "hygiene"
	| "food"
	| "chores"
	| "dog"
	| "work"
	| "creative"
	| "selfcare"
	| "social";

/**
 * Energy effect from completing a task.
 * If not specified, defaults to 0 on success, -0.02 on failure.
 */
interface TaskEnergyEffect {
	success?: number; // energy change on success (default: 0)
	failure?: number; // energy change on failure (default: -0.02)
}

/** Base task definition shape for type checking the const array. */
interface TaskDefinitionBase {
	id: string;
	name: string;
	category: TaskCategory;
	baseRate: number;
	minimalVariant?: { name: string; baseRate: number };
	availableBlocks: readonly TimeBlock[];
	weekendCost?: number;
	evolution?: TaskEvolution;
	energyEffect?: TaskEnergyEffect;
}

/** Task definitions as const to preserve literal ID types. */
const taskDefinitions = [
	{
		id: "shower",
		name: "Shower",
		category: "hygiene",
		baseRate: 0.35,
		minimalVariant: { name: "Splash face with water", baseRate: 0.7 },
		availableBlocks: ["morning", "evening"],
		evolution: {
			aware: [
				"Shower - It's been a while",
				"Shower - The water's right there",
				"Shower - Your body has opinions",
			],
			honest: [
				"The Shower Situation",
				"Attempt Personal Hygiene",
				"Water + You (Ambitious)",
			],
			resigned: [
				"Standing under water is technically possible",
				"The shower exists. You exist. Separately.",
				"Cleanliness is next to... what was it?",
			],
		},
	},
	{
		id: "brush-teeth-morning",
		name: "Brush Teeth",
		category: "hygiene",
		baseRate: 0.35,
		availableBlocks: ["morning"],
		evolution: {
			aware: [
				"Brush Teeth - Morning mouth",
				"Brush Teeth - Before coffee hits",
				"Brush Teeth - The mint awaits",
			],
			honest: [
				"The Morning Teeth Attempt",
				"Oral Hygiene (Morning Edition)",
				"Two Minutes of Brushing (Allegedly)",
			],
			resigned: [
				"Teeth. Morning. Theoretically compatible concepts.",
				"The toothbrush isn't going to use itself. Sadly.",
				"Dentists recommend. You... consider.",
			],
		},
	},
	{
		id: "brush-teeth-evening",
		name: "Brush Teeth",
		category: "hygiene",
		baseRate: 0.2,
		availableBlocks: ["evening", "night"],
		evolution: {
			aware: [
				"Brush Teeth - You know you should",
				"Brush Teeth - Before bed, ideally",
				"Brush Teeth - The guilt increases",
			],
			honest: [
				"The Evening Teeth Thing",
				"Night Brushing (The Hard One)",
				"Teeth Round Two",
			],
			resigned: [
				"Those teeth aren't brushing themselves. Well. They're not.",
				"The evening brush: where good intentions go to sleep.",
				"Bed soon. Teeth still unbrushed. Classic.",
			],
		},
	},
	{
		id: "cook",
		name: "Cook Meal",
		category: "food",
		baseRate: 0.1,
		minimalVariant: { name: "Microwave something", baseRate: 0.5 },
		availableBlocks: ["morning", "afternoon", "evening"],
		energyEffect: { success: -0.02 }, // cooking takes effort even when successful
		evolution: {
			aware: [
				"Cook Meal - Theoretically possible",
				"Cook Meal - The ingredients are there",
				"Cook Meal - Like on TV but worse",
			],
			honest: [
				"Attempt Cooking (lol)",
				"The Cooking Aspiration",
				"Kitchen Time (Optimistic)",
			],
			resigned: [
				"The Cooking Delusion",
				"You own a stove. It owns you.",
				"Recipes exist. Motivation doesn't.",
			],
		},
	},
	{
		id: "delivery",
		name: "Order Delivery",
		category: "food",
		baseRate: 0.75,
		availableBlocks: ["afternoon", "evening", "night"],
		evolution: {
			aware: [
				"Order Delivery - Again",
				"Order Delivery - The app knows your order",
				"Order Delivery - Self-care, technically",
			],
			honest: ["The Usual", "Feed Yourself (Outsourced)", "Nutrition Via App"],
			resigned: [
				"Feed yourself (the realistic version)",
				"The delivery guy knows your name now.",
				"Eating counts. Method optional.",
			],
		},
	},
	{
		id: "dishes",
		name: "Do Dishes",
		category: "chores",
		baseRate: 0.25,
		minimalVariant: { name: "Wash one dish", baseRate: 0.55 },
		availableBlocks: ["morning", "afternoon", "evening"],
		evolution: {
			aware: [
				"Do Dishes - They're still there",
				"Do Dishes - The pile grows",
				"Do Dishes - They're not going anywhere",
			],
			honest: ["The Dish Pile", "Sink Archaeology", "Confront The Dishes"],
			resigned: [
				"Dishes don't do themselves. Confirmed.",
				"The sink has layers now. Like sediment.",
				"You will run out of forks eventually.",
			],
		},
	},
	{
		id: "walk-dog",
		name: "Walk Dog",
		category: "dog",
		baseRate: 0.85,
		availableBlocks: ["morning", "afternoon", "evening", "night"],
		energyEffect: { success: 0.04 }, // movement + external accountability energizes
		evolution: {
			aware: [
				"Walk Dog - He's waiting",
				"Walk Dog - Those eyes",
				"Walk Dog - The leash is right there",
			],
			honest: [
				"Azor Needs Out",
				"The Dog Walk (Non-Negotiable)",
				"Dog Has Needs",
			],
			resigned: [
				"The dog has needs. You have... intentions.",
				"He's been patient. More patient than you deserve.",
				"Outside exists. The dog knows this.",
			],
		},
	},
	{
		id: "work",
		name: "Work Task",
		category: "work",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon"],
		evolution: {
			aware: [
				"Work Task - It's not going away",
				"Work Task - The deadline approaches",
				"Work Task - They're paying you for this",
			],
			honest: [
				"The Work Thing",
				"Professional Obligations",
				"Employment Activities",
			],
			resigned: [
				"Productivity. A concept.",
				"Work exists. You exist near it. Sometimes.",
				"Capitalism requires participation. Unfortunately.",
			],
		},
	},
	{
		id: "practice-music",
		name: "Practice Music",
		category: "creative",
		baseRate: 0.05,
		availableBlocks: ["afternoon", "evening", "night"],
		energyEffect: { success: 0.05 }, // beating the odds on creative work feels great
		evolution: {
			aware: [
				"Practice Music - Remember music?",
				"Practice Music - The instrument misses you",
				"Practice Music - You used to do this",
			],
			honest: [
				"The Music Fantasy",
				"Creative Aspirations (Musical)",
				"Touch An Instrument",
			],
			resigned: [
				"You own instruments. They exist. Somewhere.",
				"Music: a thing you theoretically do.",
				"The guitar collects dust. The dust is impressive.",
			],
		},
	},
	{
		id: "shopping",
		name: "Go Shopping",
		category: "chores",
		baseRate: 0.3,
		availableBlocks: ["morning", "afternoon", "evening"],
		weekendCost: 2,
		evolution: {
			aware: [
				"Go Shopping - The fridge is empty",
				"Go Shopping - You need things",
				"Go Shopping - The list grows",
			],
			honest: [
				"The Shopping Expedition",
				"Acquire Provisions",
				"Leave House, Obtain Items",
			],
			resigned: [
				"Stores have things. You need things. Math.",
				"The outside world has groceries. Allegedly.",
				"Commerce requires leaving. A flaw in the system.",
			],
		},
	},
	{
		id: "social-event",
		name: "Social Event",
		category: "social",
		baseRate: 0.35,
		availableBlocks: ["afternoon", "evening"],
		weekendCost: 3,
		evolution: {
			aware: [
				"Social Event - People expect you",
				"Social Event - You said you'd go",
				"Social Event - They'll ask if you're okay",
			],
			honest: [
				"The Social Obligation",
				"Human Interaction (Scheduled)",
				"Be Around People",
			],
			resigned: [
				"Other humans. In person. On purpose.",
				"Socializing: the thing you wanted until it arrived.",
				"You like your friends. You also like your couch.",
			],
		},
	},
	{
		id: "go-outside",
		name: "Go Outside",
		category: "selfcare",
		baseRate: 0.4,
		availableBlocks: ["morning", "afternoon", "evening"],
		evolution: {
			aware: [
				"Go Outside - Fresh air exists",
				"Go Outside - The sun is out there",
				"Go Outside - Your body needs it",
			],
			honest: [
				"Leave The Building",
				"Experience Outdoors",
				"Touch Grass (Literally)",
			],
			resigned: [
				"Outside exists. You could be there. Theoretically.",
				"The door is right there. It's not that far.",
				"Vitamin D won't synthesize itself.",
			],
		},
	},
] as const satisfies readonly TaskDefinitionBase[];

/** Type-safe task ID derived from task definitions. */
export type TaskId = (typeof taskDefinitions)[number]["id"];

/** Initial tasks with runtime state fields added. */
export const initialTasks: Task[] = taskDefinitions.map((def) => ({
	...def,
	availableBlocks: [...def.availableBlocks], // Convert readonly to mutable
	failureCount: 0,
	attemptedToday: false,
	succeededToday: false,
}));
