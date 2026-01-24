/**
 * Week story generator.
 * Composes a multi-paragraph narrative about the player's week
 * based on what actually happened during the run.
 */

import type { GameState, Task, TimeBlock } from "../state";
import type { Personality } from "../systems/personality";
import { type NonEmptyArray, pickVariant } from "../utils/random";

/** Tone categories for the week. */
type WeekTone = "good" | "rough" | "survived";

/** Derived stats for narrative generation. */
interface WeekContext {
	tone: WeekTone;
	personality: Personality;
	successRate: number;
	// Task category outcomes
	dog: { walked: number; failed: number; total: number };
	food: { cooked: number; delivery: number; total: number };
	creative: { attempted: number; succeeded: number };
	hygiene: { succeeded: number; attempted: number };
	// Run stats
	phoneChecks: number;
	allNighters: number;
	friendRescues: { triggered: number; accepted: number };
	variantsUsed: string[];
	// Time patterns
	bestTimeBlock: TimeBlock | null;
	worstTimeBlock: TimeBlock | null;
}

/**
 * Generates a multi-paragraph story about the week.
 */
export function generateWeekStory(state: GameState): string {
	const ctx = buildContext(state);
	const seed = state.runSeed;

	const paragraphs: string[] = [];

	// 1. Opening - sets the tone
	paragraphs.push(getOpening(ctx, seed));

	// 2. The rhythm - how days felt, time patterns
	paragraphs.push(getRhythm(ctx, seed));

	// 3. The basics - dog, food, survival
	paragraphs.push(getBasics(ctx, seed));

	// 4. The attempts - creative, aspirational (only if attempted)
	if (ctx.creative.attempted > 0) {
		paragraphs.push(getAttempts(ctx, seed));
	}

	// 5. The help - phone, friend, what you leaned on
	paragraphs.push(getHelp(ctx, seed));

	// 6. Closing - what it means
	paragraphs.push(getClosing(ctx, seed));

	return paragraphs.join("\n\n");
}

function buildContext(state: GameState): WeekContext {
	const { tasks, runStats, personality } = state;

	// Calculate overall success rate
	const successRate =
		runStats.tasks.attempted > 0
			? runStats.tasks.succeeded / runStats.tasks.attempted
			: 0;

	// Determine tone
	const tone: WeekTone =
		successRate >= 0.5 ? "good" : successRate >= 0.3 ? "survived" : "rough";

	// Compute task category stats
	const dog = computeCategoryStats(tasks, "dog", ["walk-dog"]);
	const food = {
		cooked: tasks.find((t) => t.id === "cook")?.succeededToday ? 1 : 0,
		delivery: tasks.find((t) => t.id === "delivery")?.succeededToday ? 1 : 0,
		total:
			(tasks.find((t) => t.id === "cook")?.failureCount ?? 0) +
			(tasks.find((t) => t.id === "cook")?.succeededToday ? 1 : 0) +
			(tasks.find((t) => t.id === "delivery")?.failureCount ?? 0) +
			(tasks.find((t) => t.id === "delivery")?.succeededToday ? 1 : 0),
	};
	const creative = computeCategoryStats(tasks, "creative", ["practice-music"]);
	const hygiene = computeCategoryStats(tasks, "hygiene", [
		"shower",
		"brush-teeth-morning",
		"brush-teeth-evening",
	]);

	// Find best/worst time blocks
	let bestTimeBlock: TimeBlock | null = null;
	let worstTimeBlock: TimeBlock | null = null;
	let bestRate = -1;
	let worstRate = 2;

	const timeBlocks: TimeBlock[] = ["morning", "afternoon", "evening", "night"];
	for (const block of timeBlocks) {
		const blockStats = runStats.byTimeBlock[block];
		if (blockStats.attempted > 0) {
			const rate = blockStats.succeeded / blockStats.attempted;
			if (rate > bestRate) {
				bestRate = rate;
				bestTimeBlock = block;
			}
			if (rate < worstRate) {
				worstRate = rate;
				worstTimeBlock = block;
			}
		}
	}

	return {
		tone,
		personality,
		successRate,
		dog,
		food,
		creative,
		hygiene,
		phoneChecks: runStats.phoneChecks,
		allNighters: runStats.allNighters,
		friendRescues: runStats.friendRescues,
		variantsUsed: runStats.variantsUsed,
		bestTimeBlock,
		worstTimeBlock,
	};
}

function computeCategoryStats(
	tasks: Task[],
	_category: string,
	taskIds: string[],
): {
	walked: number;
	failed: number;
	total: number;
	attempted: number;
	succeeded: number;
} {
	let succeeded = 0;
	let failed = 0;

	for (const id of taskIds) {
		const task = tasks.find((t) => t.id === id);
		if (task) {
			if (task.succeededToday) succeeded++;
			failed += task.failureCount;
		}
	}

	return {
		walked: succeeded, // alias for dog
		failed,
		total: succeeded + failed,
		attempted: succeeded + failed,
		succeeded,
	};
}

// =============================================================================
// OPENING PARAGRAPHS
// =============================================================================

function getOpening(ctx: WeekContext, seed: number): string {
	const variants = openings[ctx.tone];
	return pickVariant(variants, seed);
}

const openings: Record<WeekTone, NonEmptyArray<string>> = {
	good: [
		"Monday started and you had a list. By Sunday, some of it was done. More than usual, actually. The week moved and you moved with it.",
		"The week began like they all do—with intentions. This time, some of them landed. Not all. But enough that you noticed.",
		"Seven days. A list. Some attempts. This week, the math worked out better than expected. Things happened when you clicked them. Not always, but often enough.",
		"You made it through. Not perfectly, not gracefully, but with something resembling momentum. The week had a shape to it.",
	],
	rough: [
		"Monday started. That's the most generous thing you can say about it. The list existed. The tasks existed. The connection between wanting and doing? That was harder to find.",
		"The week happened to you more than you happened to it. Days blurred. Tasks sat there, patient and untouched. You clicked buttons and watched nothing happen.",
		"Seven days of trying. Seven days of the gap between intention and action being wider than you remembered. The buttons didn't work. They rarely do, but this week they really didn't.",
		"It was a hard week. The kind where you look at a task, know you should do it, click it, and... nothing. Over and over. The mechanics of existence felt heavier than usual.",
	],
	survived: [
		"Monday started. Sunday came. In between: a week. Some things worked. Many things didn't. That's the math of it.",
		"The week had its moments. Brief windows where clicking a task actually did something. They didn't last, but they happened. That's not nothing.",
		"Seven days of mixed results. Some wins scattered among the losses. The ratio wasn't great, but you've seen worse. Probably.",
		"A week of attempts. The word 'attempt' doing a lot of heavy lifting there. Some succeeded. Most taught you what failure feels like again. As if you'd forgotten.",
	],
};

// =============================================================================
// RHYTHM PARAGRAPHS - time patterns, personality observations
// =============================================================================

function getRhythm(ctx: WeekContext, seed: number): string {
	const parts: string[] = [];

	// Time of day observation based on personality and actual performance
	if (ctx.personality.time === "nightOwl") {
		parts.push(pickVariant(rhythmNightOwl, seed));
	} else if (ctx.personality.time === "earlyBird") {
		parts.push(pickVariant(rhythmEarlyBird, seed + 1));
	} else {
		parts.push(pickVariant(rhythmNeutralTime, seed + 2));
	}

	// Best/worst time observation if notable
	if (
		ctx.bestTimeBlock &&
		ctx.worstTimeBlock &&
		ctx.bestTimeBlock !== ctx.worstTimeBlock
	) {
		const timeObs = pickVariant(timeBlockObservations, seed + 3);
		parts.push(
			timeObs
				.replace("{best}", formatTimeBlock(ctx.bestTimeBlock))
				.replace("{worst}", formatTimeBlock(ctx.worstTimeBlock)),
		);
	}

	// All-nighter observation if any
	if (ctx.allNighters > 0) {
		parts.push(
			pickVariant(
				ctx.allNighters === 1 ? allNighterSingle : allNighterMultiple,
				seed + 4,
			),
		);
	}

	return parts.join(" ");
}

const rhythmNightOwl: NonEmptyArray<string> = [
	"The late hours carried you, as they always do. When the world gets quiet, something in you wakes up.",
	"Night was where the work happened. The mornings were for recovering from being awake at the wrong times.",
	"You're a creature of the dark hours. This week proved it again. The 2am productivity spike is real and it's yours.",
	"Daytime was for surviving. Night was for actually getting things done. Your body knows its schedule even when the world disagrees.",
];

const rhythmEarlyBird: NonEmptyArray<string> = [
	"Mornings were your window. That brief stretch where things felt possible before the day wore you down.",
	"The early hours worked for you. By afternoon, the momentum had faded, but at least you had the morning.",
	"You got things done before noon or you didn't get them done at all. That's just how your wiring works.",
	"Something about morning light makes the tasks feel achievable. By evening, that feeling is a distant memory.",
];

const rhythmNeutralTime: NonEmptyArray<string> = [
	"The days had their rhythms. Some hours worked better than others, but nothing dramatic. Just the usual ebb and flow.",
	"Time moved. Tasks happened or didn't happen. No particular hour felt magical or cursed.",
	"The clock kept turning. Some moments were better for getting things done. Most moments were just moments.",
];

const timeBlockObservations: NonEmptyArray<string> = [
	"{best} was where things clicked. {worst} was where they didn't. At least there's a pattern.",
	"If you look at when things actually worked, {best} stands out. {worst}? Better not to look too closely.",
	"The data says {best} was your time. {worst} says you should probably just... not, during those hours.",
];

const allNighterSingle: NonEmptyArray<string> = [
	"One night you pushed through. Rode the wave past when you should have stopped. Worth it? Hard to say. The next day was a blur.",
	"There was an all-nighter in there. The kind where sleep feels optional until suddenly it very much isn't.",
	"You stayed up. All the way through. The 2am energy carried you until it didn't, and then morning was already happening.",
];

const allNighterMultiple: NonEmptyArray<string> = [
	"Multiple all-nighters. Your sleep schedule is more of a suggestion at this point. The nights blurred together.",
	"You pushed through more than once. The late hours were productive. The following days were... less so.",
	"All-nighters, plural. You rode the nocturnal productivity waves and paid for it in daylight confusion.",
];

function formatTimeBlock(block: TimeBlock): string {
	const names: Record<TimeBlock, string> = {
		morning: "morning",
		afternoon: "afternoon",
		evening: "evening",
		night: "night",
	};
	return names[block];
}

// =============================================================================
// BASICS PARAGRAPHS - dog, food, survival
// =============================================================================

function getBasics(ctx: WeekContext, seed: number): string {
	const parts: string[] = [];

	// Dog observation - failed is cumulative over week
	if (ctx.dog.total > 0) {
		if (ctx.dog.failed === 0) {
			parts.push(pickVariant(dogGood, seed));
		} else if (ctx.dog.failed <= 2) {
			parts.push(pickVariant(dogMixed, seed + 1));
		} else {
			parts.push(pickVariant(dogStruggled, seed + 2));
		}
	}

	// Food observation
	if (ctx.food.cooked > 0) {
		parts.push(pickVariant(foodCooked, seed + 3));
	} else if (ctx.food.delivery > 0) {
		parts.push(pickVariant(foodDelivery, seed + 4));
	} else if (ctx.food.total > 0) {
		parts.push(pickVariant(foodStruggled, seed + 5));
	}

	// Variants used observation
	if (ctx.variantsUsed.length > 0) {
		parts.push(pickVariant(variantsUsedObs, seed + 6));
	}

	// General survival wrap
	parts.push(pickVariant(survivalWrap[ctx.tone], seed + 7));

	return parts.join(" ");
}

const dogGood: NonEmptyArray<string> = [
	"Azor got walked. Every time you tried, it worked. External accountability remains undefeated.",
	"The dog got his walks. That's one thing you can count on—the guilt of a waiting dog is a powerful motivator.",
	"Azor didn't miss a walk. When another creature is depending on you, somehow the buttons work better.",
	"Dog walks: success. Turns out having someone stare at you expectantly is excellent for task completion.",
];

const dogMixed: NonEmptyArray<string> = [
	"Azor got walked most of the time. Some days it was barely a walk—more like standing outside briefly. But he got out.",
	"The dog walks were... mostly successful. A few were more 'quick trip outside' than 'actual walk.' He didn't complain.",
	"Azor got what he needed, more or less. Some proper walks, some minimal versions. He's patient like that.",
];

const dogStruggled: NonEmptyArray<string> = [
	"Azor deserved better this week. The walks happened, but barely. A lot of standing outside pretending that counts.",
	"The dog walks were rough. More failures than successes. He still loves you, but there was definitely some canine disappointment.",
	"Azor got short-changed this week. You tried. The trying didn't always translate to walking. He forgives you. Probably.",
];

const foodCooked: NonEmptyArray<string> = [
	"You cooked. Actually cooked. That's notable. The kitchen saw action beyond the microwave.",
	"Food was made. By you. With ingredients. This happens rarely enough to be worth mentioning.",
	"Cooking happened this week. Real cooking, not just heating. Mark the calendar.",
];

const foodDelivery: NonEmptyArray<string> = [
	"You ate, mostly via delivery. The apps know your order by now. It's still eating. It counts.",
	"Food happened through delivery. Someone else did the cooking and brought it to your door. That's a valid system.",
	"Delivery sustained you. The cooking ambition exists in theory. In practice, there are apps for this.",
];

const foodStruggled: NonEmptyArray<string> = [
	"Food was a challenge. The cooking didn't happen. The ordering didn't happen. You ate... probably.",
	"The eating situation wasn't great. Tasks involving food didn't cooperate. You survived on whatever was already there.",
];

const variantsUsedObs: NonEmptyArray<string> = [
	"Sometimes you lowered the bar. Took the smaller version of the task. That's not giving up—that's adapting.",
	"The minimal versions helped. When the full task wouldn't click, the smaller one sometimes did. Good enough is good enough.",
	"You used the easier options when they were available. That's what they're there for.",
];

const survivalWrap: Record<WeekTone, NonEmptyArray<string>> = {
	good: [
		"The basics got covered. That's the foundation everything else sits on.",
		"Survival needs: met. That's more than some weeks manage.",
		"You kept yourself alive and functional. The baseline was maintained.",
	],
	rough: [
		"The basics were a struggle, but they happened. Mostly. Enough.",
		"Survival mode was engaged. It wasn't pretty, but you're still here.",
		"The fundamentals barely held together. But they held.",
	],
	survived: [
		"The basics were mixed. Some handled, some scraped by. A typical week, really.",
		"Survival requirements: technically met. The bar was low but you cleared it.",
		"The essentials got done, in their own imperfect way.",
	],
};

// =============================================================================
// ATTEMPTS PARAGRAPHS - creative, aspirational
// =============================================================================

function getAttempts(ctx: WeekContext, seed: number): string {
	if (ctx.creative.succeeded > 0) {
		return pickVariant(creativeSucceeded, seed);
	}
	if (ctx.creative.attempted > 0) {
		return pickVariant(creativeFailed, seed);
	}
	return "";
}

const creativeSucceeded: NonEmptyArray<string> = [
	"The creative work happened. Actually happened. You clicked the task and it worked. That's rare enough to feel like magic. The odds were against you and you beat them.",
	"You practiced. Made something. The aspirational task that usually sits there mocking you—this week, it cooperated. Write that down somewhere.",
	"Against all probability, the creative stuff clicked. The task that fails ninety-something percent of the time actually worked. You made something. Hold onto that.",
	"The music happened. Or the project. Whatever the creative thing was—it worked this week. Those tasks have terrible odds and you beat them. That matters.",
];

const creativeFailed: NonEmptyArray<string> = [
	"The creative tasks didn't happen. You clicked them. You tried. The connection between wanting to create and actually creating remains unreliable. It's not a new pattern.",
	"Practice didn't happen. The creative work sat on the list, got clicked a few times, went nowhere. The aspirational tasks are like that. They promise everything and deliver rarely.",
	"You tried the creative stuff. It didn't work. It usually doesn't. The gap between 'I want to make something' and actually making it is wide, and this week you couldn't cross it.",
	"The creative tasks failed. Every attempt. That's how it goes with the aspirational stuff—the base rates are brutal and this week the odds won.",
];

// =============================================================================
// HELP PARAGRAPHS - phone, friend, coping
// =============================================================================

function getHelp(ctx: WeekContext, seed: number): string {
	const parts: string[] = [];

	// Phone observation
	if (ctx.phoneChecks > 15) {
		parts.push(pickVariant(phoneHeavy, seed));
	} else if (ctx.phoneChecks > 5) {
		parts.push(pickVariant(phoneModerate, seed + 1));
	} else if (ctx.phoneChecks > 0) {
		parts.push(pickVariant(phoneLight, seed + 2));
	}

	// Friend observation
	if (ctx.friendRescues.triggered > 0) {
		if (ctx.friendRescues.accepted === ctx.friendRescues.triggered) {
			parts.push(pickVariant(friendAcceptedAll, seed + 3));
		} else if (ctx.friendRescues.accepted > 0) {
			parts.push(pickVariant(friendAcceptedSome, seed + 4));
		} else {
			parts.push(pickVariant(friendDeclinedAll, seed + 5));
		}
	}

	// Social personality observation
	if (ctx.personality.social === "hermit" && ctx.friendRescues.accepted > 0) {
		parts.push(pickVariant(hermitSocialCost, seed + 6));
	} else if (
		ctx.personality.social === "socialBattery" &&
		ctx.friendRescues.accepted > 0
	) {
		parts.push(pickVariant(socialBatteryBoost, seed + 7));
	}

	// If nothing notable, add a neutral observation
	if (parts.length === 0) {
		parts.push(pickVariant(helpNeutral, seed + 8));
	}

	return parts.join(" ");
}

const phoneHeavy: NonEmptyArray<string> = [
	"Your phone saw a lot of this week. The scroll trap pulled you under again and again. It's always there, always ready to eat your momentum.",
	"You checked your phone more than you'd like to count. The algorithm kept you company when the tasks wouldn't cooperate. It wasn't helpful, but it was easy.",
	"The phone got a lot of attention. Scrolling through nothing, looking for something that wasn't there. The trap works because it's always available.",
	"Heavy phone usage this week. The scroll hole was deep and you fell in repeatedly. It's the default behavior when nothing else is working.",
];

const phoneModerate: NonEmptyArray<string> = [
	"The phone pulled you in sometimes. Not constantly, but enough to notice. The scroll trap is patient—it'll take whatever time you give it.",
	"Some phone checking happened. Moderate. The usual dance of picking it up, losing time, putting it down, wondering where the minutes went.",
	"You scrolled when things got hard. Not excessively, but it happened. The phone is always there with its promise of easy distraction.",
];

const phoneLight: NonEmptyArray<string> = [
	"The phone stayed mostly in your pocket. When you did check it, you didn't lose too much time. That's something.",
	"Light phone usage. The scroll trap didn't get you much this week. Either things were working or you were too busy failing at tasks to scroll.",
	"You kept the phone checking to a minimum. The trap didn't spring as often as usual. A small victory.",
];

const friendAcceptedAll: NonEmptyArray<string> = [
	"Your friend reached out and you said yes. Every time. Sometimes the rescue is the whole day. External momentum matters.",
	"The friend showed up when things were rough. You let them. That's harder than it sounds, saying yes when you feel like hiding.",
	"Friend rescue: accepted. All of them. Sometimes you need someone to pull you out of your own head. They did that.",
];

const friendAcceptedSome: NonEmptyArray<string> = [
	"Your friend tried to help. Sometimes you let them. The rescues that worked mattered more than the ones you declined.",
	"The friend reached out. You said yes sometimes, no other times. Both are valid. At least some connection happened.",
	"Some friend rescues accepted, some turned down. It's a balance. You needed help and you took it when you could.",
];

const friendDeclinedAll: NonEmptyArray<string> = [
	"Your friend tried to reach you. You said no. Every time. Sometimes you just can't, even when you know it would help.",
	"The friend offered rescue. You declined. Not because you didn't need it—because accepting felt like too much. That happens.",
	"Friend reached out, you stayed in. It's not that you didn't want to see them. The gap between wanting and doing is wide.",
];

const hermitSocialCost: NonEmptyArray<string> = [
	"The social stuff helped, but it also cost. You're wired to need alone time. The friend visits meant energy spent.",
	"Seeing people takes something out of you, even when it's good. The connection helped the momentum; your batteries needed recharging after.",
	"Social interaction is expensive for you. The friend time was worth it, but you felt the cost.",
];

const socialBatteryBoost: NonEmptyArray<string> = [
	"Being around your friend charged you up. That's how you're wired—people give you energy. The visits helped more than just the moment.",
	"The social connection energized you. You're the type who gets fuel from other people. The friend time was medicine.",
	"Friend time gave you more than it took. You run on social energy. The rescues were boosts, not just breaks.",
];

const helpNeutral: NonEmptyArray<string> = [
	"You got through the week with the usual coping mechanisms. Nothing dramatic. Just the quiet work of managing yourself.",
	"No major rescues needed. No major collapses either. Just a week of getting by.",
	"You managed. Quietly. Without fanfare. The week happened and you handled it in your own way.",
];

// =============================================================================
// CLOSING PARAGRAPHS
// =============================================================================

function getClosing(ctx: WeekContext, seed: number): string {
	return pickVariant(closings[ctx.tone], seed);
}

const closings: Record<WeekTone, NonEmptyArray<string>> = {
	good: [
		"You made it. The week ended and you're on the other side, intact. More got done than didn't. The dog is walked, the body is fed, the tasks have fewer checkmarks than you'd like but more than zero. That's a good week. That's enough.",
		"Sunday came and you survived it. Better than survived—you actually accomplished things. The list got shorter. The systems worked, more or less. Next week will be its own thing, but this one? This one was okay.",
		"The week is over. You did things. Real things, not just existing. The buttons worked more often than they didn't. That's not nothing. That's actually kind of a lot. Take the win.",
		"Seven days, done. More successes than failures. The basics covered, some extras achieved. The dog still loves you. The friend still checks in. You're still here, and you did okay. That matters.",
	],
	rough: [
		"You survived. That's the word for it. Not thrived, not succeeded—survived. The week threw everything at you and you're still here at the end of it. The dog still loves you. The tasks will still be there tomorrow. You made it through. That's enough. It has to be.",
		"It's over. The week, finally, is over. You got through it. Barely, sometimes, but you did. The gap between wanting and doing was wide and you stood on the wrong side of it most days. But you're here. You're still here.",
		"Seven days of rough. The buttons didn't work. The tasks sat there. You clicked and nothing happened, over and over. But it's done now. The week is behind you. Tomorrow is a new seed, a new set of odds. Maybe it'll be different. Maybe it won't. Either way, you'll try again.",
		"The week is over and you're still standing. Not a high bar, but you cleared it. The systems failed you, or you failed them—hard to tell the difference sometimes. What matters is it's done. You rest now. You try again later.",
	],
	survived: [
		"The week ended. Somewhere in the middle between good and bad. Some things worked. Many things didn't. That's the typical math. The dog is walked enough, the food was eaten somehow, the creative stuff probably didn't happen but what else is new. You made it to Sunday. That's a complete week.",
		"You made it through. Not gracefully, not terribly. Just... through. The buttons worked sometimes. The tasks got done sometimes. The pattern is familiar by now. Next week will be more of the same, probably. But that's next week. This one is done.",
		"Seven days of mixed results. The ratio wasn't great but it wasn't disaster. The basics got covered, mostly. The aspirational stuff remains aspirational. The week happened and you happened with it. That's the deal.",
		"The week is over. You survived it, which is the baseline. Some wins, some losses, mostly the muddy middle. The dog still loves you. The friend still texts. The tasks will still be there tomorrow, patient as ever. Another week in the books. Onto the next one.",
	],
};
