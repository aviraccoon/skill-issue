/**
 * Screen information types for rendering.
 * Provides all content needed to render each screen type.
 */

import type { Activity } from "../actions/friend";
import type { EventType } from "../data/events";
import type { TaskId } from "../data/tasks";
import type { Day, EventBanner, EventId, Screen, TimeBlock } from "../state";
import type { DogUrgency } from "../systems/dog";
import type { Decision } from "./controller";
/** Task display info for rendering. */
export interface TaskDisplay {
	id: TaskId;
	name: string;
	evolvedName: string;
	failureCount: number;
	succeededToday: boolean;
	attemptedToday: boolean;
	weekendCost: number;
	availableBlocks: TimeBlock[];
	canAttempt: boolean;
	urgency?: { level: DogUrgency; text: string };
	/** Minimal variant info, if available and unlocked. */
	variant?: { name: string };
}

/** Game screen info. */
export interface GameScreenInfo {
	type: "game";
	/** Day key for template functions. */
	day: Day;
	/** Translated day name for display. */
	dayDisplay: string;
	timeBlock: TimeBlock;
	/** Translated time block name for display. */
	timeBlockDisplay: string;
	isWeekend: boolean;
	slotsRemaining: number;
	weekendPointsRemaining: number;
	inExtendedNight: boolean;
	tasks: TaskDisplay[];
	selectedTask: TaskDisplay | null;
	decisions: Decision[];
	/** Next time block key, or null if end of day. */
	nextTimeBlock: TimeBlock | null;
	/** Phone notification count (0 = no dot, 1+ = dot with escalating animation). */
	phoneNotificationCount: number;
	/** Inline event banner from a minor event that just fired, or null. */
	eventBanner: EventBanner | null;
}

/** Night choice screen info. */
export interface NightChoiceInfo {
	type: "nightChoice";
	/** Day key for template functions. */
	day: Day;
	/** Translated day name for display. */
	dayDisplay: string;
	/** The "it's late" prompt text. */
	nightPrompt: string;
	description: string;
	canPushThrough: boolean;
	decisions: Decision[];
}

/** Friend rescue screen info. */
export interface FriendRescueInfo {
	type: "friendRescue";
	message: string;
	cost: number;
	costLabel: string;
	activities: Activity[];
	/** The decline button label. */
	declineLabel: string;
	decisions: Decision[];
}

/** Day summary screen info. */
export interface DaySummaryInfo {
	type: "daySummary";
	title: string;
	attemptedCount: number;
	succeededCount: number;
	narrative: string;
	dogNote: string | null;
	pulledAllNighter: boolean;
}

/** Patterns data for week complete screen. */
export interface PatternsDisplay {
	personality: string;
	seed: number;
	successRate: number;
	bestTimeBlock: TimeBlock | null;
	worstTimeBlock: TimeBlock | null;
	phoneChecks: number;
	allNighters: number;
	friendRescues: { triggered: number; accepted: number };
	variantsUsed: string[];
}

/** Week complete screen info. */
export interface WeekCompleteInfo {
	type: "weekComplete";
	totalSuccesses: number;
	totalFailures: number;
	narrative: string;
	patterns: PatternsDisplay;
}

/** Intro screen info. */
export interface IntroInfo {
	type: "intro";
}

/** Splash screen info. */
export interface SplashInfo {
	type: "splash";
	/** Snarky rotating text. */
	splashText: string;
	/** Button label variant. */
	startButton: string;
}

/** Menu screen info. */
export interface MenuScreenInfo {
	type: "menu";
	/** Summary of main run if exists, null if no save. */
	mainRunSummary: { day: string; timeBlock: string } | null;
	/** Summary of seeded run if exists, null if no save. */
	seededRunSummary: { day: string; timeBlock: string; seed: number } | null;
	/** Whether patterns have been unlocked (at least one completion). */
	patternsUnlocked: boolean;
}

/** Personality type counts for breakdown display. */
export interface PersonalityBreakdown {
	/** Count of runs per time preference. */
	time: { nightOwl: number; earlyBird: number; neutral: number };
	/** Count of runs per social preference. */
	social: { socialBattery: number; hermit: number; neutral: number };
}

/** Lifetime stats aggregated from all completed runs. */
export interface LifetimeStats {
	runsCompleted: number;
	totalAttempted: number;
	totalSucceeded: number;
	overallSuccessRate: number;
	bestTimeBlock: TimeBlock | null;
	worstTimeBlock: TimeBlock | null;
	totalPhoneChecks: number;
	totalAllNighters: number;
	totalFriendRescues: { triggered: number; accepted: number };
	/** All variant categories ever used across runs. */
	variantsUsed: string[];
	/** Personality breakdown across runs. */
	personalities: PersonalityBreakdown;
}

/** Patterns screen info. */
export interface PatternsScreenInfo {
	type: "patterns";
	lifetime: LifetimeStats;
}

/** Narrative event screen info (minor interstitial or major choice). */
export interface NarrativeEventInfo {
	type: "narrativeEvent";
	eventType: EventType;
	eventId: EventId;
	/** Notification text (minor events). */
	text: string;
	/** Screen title (major events). */
	title: string;
	/** Description text (major events). */
	description: string;
	/** Available choices (major events). */
	choices: { id: string; label: string; description: string }[];
	decisions: Decision[];
}

/** Union of all screen info types. */
export type ScreenInfo =
	| SplashInfo
	| MenuScreenInfo
	| IntroInfo
	| GameScreenInfo
	| NightChoiceInfo
	| FriendRescueInfo
	| DaySummaryInfo
	| WeekCompleteInfo
	| PatternsScreenInfo
	| NarrativeEventInfo;

/** Screens that are menu/navigation, not gameplay. Should not be restored on "Continue". */
export const MENU_SCREENS: ReadonlySet<Screen> = new Set<Screen>([
	"splash",
	"menu",
	"intro",
	"patterns",
]);
