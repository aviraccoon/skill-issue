/**
 * Screen information builders.
 * Computes all content needed to render each screen type.
 */

export * from "./screenInfo.types";

import { getLocalizedActivities } from "../actions/friend";
import {
	determineTone,
	generateAllNighterNarrative,
	generateNarrative,
	getAllNighterTitle,
	getDogNote,
} from "../data/daySummary";
import {
	type ChoiceContent,
	getEventContent,
	getEventDefinition,
	getEventVariantSeed,
	resolveChoiceContent,
} from "../data/events";
import { getRandomRescueMessage } from "../data/friendRescue";
import { generateWeekStory } from "../data/weekStory";
import { strings } from "../i18n";
import type { GameState, Task, TimeBlock } from "../state";
import { isWeekend, TIME_BLOCKS } from "../state";
import { getExtendedNightDescription } from "../systems/allnighter";
import { getDayBlocks } from "../systems/dailyJitter";
import { getDogUrgency, getUrgencyDisplay } from "../systems/dog";
import { getEvolvedDescription } from "../systems/evolution";
import { getRescueCost } from "../systems/friend";
import { getPatterns, getSavedGameSummaries } from "../systems/persistence";
import { pickVariant, seededShuffle } from "../utils/random";
import { type Decision, getAvailableDecisions } from "./controller";
import type {
	DaySummaryInfo,
	FriendRescueInfo,
	GameScreenInfo,
	MenuScreenInfo,
	NarrativeEventInfo,
	NightChoiceInfo,
	PatternsScreenInfo,
	PersonalityBreakdown,
	ScreenInfo,
	SplashInfo,
	TaskDisplay,
	WeekCompleteInfo,
} from "./screenInfo.types";

/**
 * Gets all information needed to render the current screen.
 */
export function getScreenInfo(state: GameState): ScreenInfo {
	switch (state.screen) {
		case "splash":
			return getSplashInfo(state);
		case "menu":
			return getMenuScreenInfo();
		case "intro":
			return { type: "intro" };
		case "nightChoice":
			return getNightChoiceInfo(state);
		case "friendRescue":
			return getFriendRescueInfo(state);
		case "daySummary":
			return getDaySummaryInfo(state);
		case "weekComplete":
			return getWeekCompleteInfo(state);
		case "patterns":
			return getPatternsScreenInfo();
		case "narrativeEvent":
			return getNarrativeEventInfo(state);
		default:
			return getGameScreenInfo(state);
	}
}

function getSplashInfo(_state: GameState): SplashInfo {
	const s = strings();
	const textIndex = Math.floor(Math.random() * s.splash.texts.length);
	const buttonIndex = Math.floor(Math.random() * s.splash.startButtons.length);
	return {
		type: "splash",
		splashText: s.splash.texts[textIndex] ?? s.splash.texts[0],
		startButton: s.splash.startButtons[buttonIndex] ?? s.splash.startButtons[0],
	};
}

function getMenuScreenInfo(): MenuScreenInfo {
	const s = strings();
	const summaries = getSavedGameSummaries();
	const patterns = getPatterns();

	return {
		type: "menu",
		mainRunSummary: summaries.main
			? {
					day: s.days[summaries.main.day],
					timeBlock: s.timeBlocks[summaries.main.timeBlock],
				}
			: null,
		seededRunSummary: summaries.seeded
			? {
					day: s.days[summaries.seeded.day],
					timeBlock: s.timeBlocks[summaries.seeded.timeBlock],
					seed: summaries.seeded.seed,
				}
			: null,
		patternsUnlocked: patterns.unlocked,
	};
}

function getPatternsScreenInfo(): PatternsScreenInfo {
	const patterns = getPatterns();
	const history = patterns.history;

	// Aggregate stats from all completed runs
	let totalAttempted = 0;
	let totalSucceeded = 0;
	let totalPhoneChecks = 0;
	let totalAllNighters = 0;
	let totalFriendRescuesTriggered = 0;
	let totalFriendRescuesAccepted = 0;

	const byTimeBlock: Record<
		TimeBlock,
		{ attempted: number; succeeded: number }
	> = {
		morning: { attempted: 0, succeeded: 0 },
		afternoon: { attempted: 0, succeeded: 0 },
		evening: { attempted: 0, succeeded: 0 },
		night: { attempted: 0, succeeded: 0 },
	};

	// Track unique variants and personality counts
	const variantsSet = new Set<string>();
	const personalities: PersonalityBreakdown = {
		time: { nightOwl: 0, earlyBird: 0, neutral: 0 },
		social: { socialBattery: 0, hermit: 0, neutral: 0 },
	};

	for (const run of history) {
		totalAttempted += run.stats.tasks.attempted;
		totalSucceeded += run.stats.tasks.succeeded;
		totalPhoneChecks += run.stats.phoneChecks;
		totalAllNighters += run.stats.allNighters;
		totalFriendRescuesTriggered += run.stats.friendRescues.triggered;
		totalFriendRescuesAccepted += run.stats.friendRescues.accepted;

		for (const block of TIME_BLOCKS) {
			byTimeBlock[block].attempted += run.stats.byTimeBlock[block].attempted;
			byTimeBlock[block].succeeded += run.stats.byTimeBlock[block].succeeded;
		}

		// Collect variants used
		for (const variant of run.stats.variantsUsed) {
			variantsSet.add(variant);
		}

		// Count personality types
		personalities.time[run.personality.time]++;
		personalities.social[run.personality.social]++;
	}

	// Calculate overall success rate
	const overallSuccessRate =
		totalAttempted > 0 ? totalSucceeded / totalAttempted : 0;

	// Find best and worst time blocks
	let bestTimeBlock: TimeBlock | null = null;
	let worstTimeBlock: TimeBlock | null = null;
	let bestRate = -1;
	let worstRate = 2;

	for (const block of TIME_BLOCKS) {
		const stats = byTimeBlock[block];
		if (stats.attempted > 0) {
			const rate = stats.succeeded / stats.attempted;
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

	// Format variants for display (capitalize first letter)
	const variantsUsed = Array.from(variantsSet).map(
		(v) => v.charAt(0).toUpperCase() + v.slice(1),
	);

	return {
		type: "patterns",
		lifetime: {
			runsCompleted: history.length,
			totalAttempted,
			totalSucceeded,
			overallSuccessRate,
			bestTimeBlock,
			worstTimeBlock,
			totalPhoneChecks,
			totalAllNighters,
			totalFriendRescues: {
				triggered: totalFriendRescuesTriggered,
				accepted: totalFriendRescuesAccepted,
			},
			variantsUsed,
			personalities,
		},
	};
}

function getGameScreenInfo(state: GameState): GameScreenInfo {
	const s = strings();
	const weekend = isWeekend(state);
	const decisions = getAvailableDecisions(state);

	// Get visible tasks (all on weekends, jittered time-block filtered on weekdays)
	const dayBlocks = getDayBlocks(state.tasks, state.dayIndex, state.runSeed);
	let visibleTasks = weekend
		? state.tasks
		: state.tasks.filter((t) => dayBlocks.get(t.id)?.includes(state.timeBlock));

	// Shuffle for display variety
	visibleTasks = seededShuffle(visibleTasks, state.runSeed + state.dayIndex);

	// Build task displays
	const taskDisplays = visibleTasks.map((task) =>
		buildTaskDisplay(task, state, decisions),
	);

	// Find selected task
	const selectedTask = state.selectedTaskId
		? (taskDisplays.find((t) => t.id === state.selectedTaskId) ?? null)
		: null;

	// Calculate next time block
	const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
	const nextTimeBlock = TIME_BLOCKS[currentIndex + 1] ?? null;

	return {
		type: "game",
		day: state.day,
		dayDisplay: s.days[state.day],
		timeBlock: state.timeBlock,
		timeBlockDisplay: s.timeBlocks[state.timeBlock],
		isWeekend: weekend,
		slotsRemaining: state.slotsRemaining,
		weekendPointsRemaining: state.weekendPointsRemaining,
		inExtendedNight: state.inExtendedNight,
		tasks: taskDisplays,
		selectedTask,
		decisions,
		nextTimeBlock,
		phoneNotificationCount: state.phoneNotificationCount,
		eventBanner: state.eventBanner,
	};
}

function buildTaskDisplay(
	task: Task,
	state: GameState,
	decisions: Decision[],
): TaskDisplay {
	const cost = task.weekendCost ?? 1;

	// Check if this task can be attempted
	const canAttempt = decisions.some(
		(d) => d.type === "attempt" && d.taskId === task.id,
	);

	// Build urgency info for dog
	let urgency: TaskDisplay["urgency"];
	if (task.id === "walk-dog" && !task.succeededToday) {
		const level = getDogUrgency(state);
		urgency = { level, text: getUrgencyDisplay(level, state.runSeed) };
	}

	// Build variant info if available and unlocked
	let variant: TaskDisplay["variant"];
	if (task.minimalVariant && state.variantsUnlocked.includes(task.category)) {
		variant = { name: task.minimalVariant.name };
	}

	return {
		id: task.id,
		name: task.name,
		evolvedName: getEvolvedDescription(task, state.runSeed),
		failureCount: task.failureCount,
		succeededToday: task.succeededToday,
		attemptedToday: task.attemptedToday,
		weekendCost: cost,
		availableBlocks: task.availableBlocks,
		canAttempt,
		urgency,
		variant,
	};
}

function getNightChoiceInfo(state: GameState): NightChoiceInfo {
	const s = strings();
	const decisions = getAvailableDecisions(state);
	const canPush = decisions.some((d) => d.type === "pushThrough");

	const nightPrompt = pickVariant(
		s.game.nightPrompt,
		state.runSeed + state.dayIndex,
	);

	return {
		type: "nightChoice",
		day: state.day,
		dayDisplay: s.days[state.day],
		nightPrompt,
		description: getExtendedNightDescription(state.energy, state.rollCount),
		canPushThrough: canPush,
		decisions,
	};
}

function getFriendRescueInfo(state: GameState): FriendRescueInfo {
	const s = strings();
	const decisions = getAvailableDecisions(state);
	const cost = getRescueCost(state);
	const weekend = isWeekend(state);

	const declineLabel = pickVariant(
		s.game.rescueDecline,
		state.runSeed + state.dayIndex,
	);

	return {
		type: "friendRescue",
		message: getRandomRescueMessage(state),
		cost,
		costLabel: weekend ? s.friend.costPoints(cost) : s.friend.costSlot(cost),
		activities: getLocalizedActivities(state.runSeed, state.dayIndex),
		declineLabel,
		decisions,
	};
}

function getDaySummaryInfo(state: GameState): DaySummaryInfo {
	const s = strings();
	const attempted = state.tasks.filter((t) => t.attemptedToday);
	const succeeded = state.tasks.filter((t) => t.succeededToday);
	const pulledAllNighter = state.inExtendedNight;

	const tone = determineTone(attempted.length, succeeded.length);
	const narrative = pulledAllNighter
		? generateAllNighterNarrative(state)
		: generateNarrative(tone, state.runSeed + state.dayIndex);

	const title = pulledAllNighter
		? getAllNighterTitle(state)
		: s.days[state.day];

	return {
		type: "daySummary",
		title,
		attemptedCount: attempted.length,
		succeededCount: succeeded.length,
		narrative,
		dogNote: getDogNote(state),
		pulledAllNighter,
	};
}

function getWeekCompleteInfo(state: GameState): WeekCompleteInfo {
	const s = strings();
	const totalSuccesses = state.tasks.reduce(
		(sum, t) => sum + (t.succeededToday ? 1 : 0),
		0,
	);
	const totalFailures = state.tasks.reduce((sum, t) => sum + t.failureCount, 0);

	const narrative = generateWeekStory(state);

	// Compute patterns
	const { runStats, personality } = state;

	// Format personality string
	const timePersonality =
		personality.time === "nightOwl"
			? s.patterns.personalities.nightOwl
			: personality.time === "earlyBird"
				? s.patterns.personalities.earlyBird
				: s.patterns.personalities.neutralTime;
	const socialPersonality =
		personality.social === "socialBattery"
			? s.patterns.personalities.socialBattery
			: personality.social === "hermit"
				? s.patterns.personalities.hermit
				: s.patterns.personalities.neutralSocial;
	const personalityString = `${timePersonality} + ${socialPersonality}`;

	// Calculate success rate
	const successRate =
		runStats.tasks.attempted > 0
			? runStats.tasks.succeeded / runStats.tasks.attempted
			: 0;

	// Find best and worst time blocks
	let bestTimeBlock: TimeBlock | null = null;
	let worstTimeBlock: TimeBlock | null = null;
	let bestRate = -1;
	let worstRate = 2;

	for (const block of TIME_BLOCKS) {
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

	// Get localized variant category names
	const variantsUsed = runStats.variantsUsed.map((category) => {
		// Categories are like "hygiene", "food", "chores" - capitalize for display
		return category.charAt(0).toUpperCase() + category.slice(1);
	});

	return {
		type: "weekComplete",
		totalSuccesses,
		totalFailures,
		narrative,
		patterns: {
			personality: personalityString,
			seed: state.runSeed,
			successRate,
			bestTimeBlock,
			worstTimeBlock,
			phoneChecks: runStats.phoneChecks,
			allNighters: runStats.allNighters,
			friendRescues: runStats.friendRescues,
			variantsUsed,
		},
	};
}

function getNarrativeEventInfo(state: GameState): NarrativeEventInfo {
	const eventId = state.activeEventId;
	const decisions = getAvailableDecisions(state);

	// Fallback for missing event (shouldn't happen in normal play)
	if (!eventId) {
		return {
			type: "narrativeEvent",
			eventType: "minor",
			eventId: "rain",
			text: "",
			title: "",
			description: "",
			choices: [],
			decisions,
		};
	}

	const definition = getEventDefinition(eventId);
	const content = getEventContent(eventId);

	if (definition?.type === "major" && "choices" in content) {
		// Filter choices by flag requirements
		const choiceEntries = (definition.choices ?? []).filter(
			(c) => !c.requiresFlag || state.eventFlags.includes(c.requiresFlag),
		);
		const variantSeed = getEventVariantSeed(state.runSeed, eventId);
		return {
			type: "narrativeEvent",
			eventType: "major",
			eventId,
			text: "",
			title: content.title,
			description: content.description,
			choices: choiceEntries.map((c) => {
				const choices = content.choices as Record<
					string,
					ChoiceContent | ChoiceContent[] | undefined
				>;
				const resolved = resolveChoiceContent(choices[c.id], variantSeed);
				return {
					id: c.id,
					label: resolved.label || c.id,
					description: resolved.description,
				};
			}),
			decisions,
		};
	}

	// Minor event
	let text = "";
	if ("notification" in content && Array.isArray(content.notification)) {
		const variants = [...content.notification] as [string, ...string[]];
		text = pickVariant(variants, state.runSeed + state.dayIndex);
	}
	return {
		type: "narrativeEvent",
		eventType: "minor",
		eventId,
		text,
		title: "",
		description: "",
		choices: [],
		decisions,
	};
}
