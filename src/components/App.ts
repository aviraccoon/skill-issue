import type { AttemptCallbacks } from "../actions/tasks";
import { type Decision, executeDecision } from "../core/controller";
import {
	type GameScreenInfo,
	getScreenInfo,
	type ScreenInfo,
} from "../core/screenInfo";
import { strings } from "../i18n";
import { cssColorToHex } from "../rendering/color";
import { generateSingleRoomLayout } from "../rendering/layout";
import { buildTimePalette } from "../rendering/palettes";
import { getRenderer, pickArtStyle } from "../rendering/styles/index";
import type {
	ItemVariants,
	RoomLayout,
	RoomRenderer,
	SeedPalette,
	ThemeColors,
	TimePalette,
} from "../rendering/types";
import { getItemVariants, getSeedPalette } from "../rendering/variants";
import { type GameState, isWeekend } from "../state";
import type { Store } from "../store";
import {
	type AnimationController,
	createAnimationController,
	pickFailureTiming,
} from "../systems/animation";
import { getDogUrgency } from "../systems/dog";
import { hasHintBeenShown, markHintShown } from "../systems/persistence";
import { announce } from "../utils/announce";
import { mulberry32 } from "../utils/random";
import { initTooltips } from "../utils/tooltip";
import appStyles from "./App.module.css";
import { renderDaySummary } from "./DaySummary";
import { renderFriendRescue } from "./FriendRescue";
import { renderGameArea } from "./GameArea";
import {
	createAppStructure,
	renderFooter,
	renderHeader,
	renderPhoneButton,
	renderSlots,
	renderTaskList,
	renderTaskPanel,
	showNotification,
} from "./GameScreenParts";
import { renderIntro } from "./Intro";
import { renderMainMenu } from "./MainMenu";
import { renderNarrativeEvent } from "./NarrativeEvent";
import { renderNightChoice } from "./NightChoice";
import panelStyles from "./Panel.module.css";
import { renderPatterns } from "./Patterns";
import { renderSplash } from "./Splash";
import taskStyles from "./Task.module.css";
import { renderWeekComplete } from "./WeekComplete";

/** Re-export styles for use in actions that need animation class references. */
export { taskStyles, panelStyles };

/**
 * Browser-specific callbacks for task attempt animations.
 * Plays visual feedback when tasks fail.
 */
const browserAttemptCallbacks: AttemptCallbacks = {
	onFailure: (taskId: string) => {
		// Task button animation
		const taskButton = document.querySelector(`[data-id="${taskId}"]`);
		if (taskButton) {
			taskButton.classList.add(taskStyles.failing);
			taskButton.addEventListener(
				"animationend",
				() => {
					taskButton.classList.remove(taskStyles.failing);
				},
				{ once: true },
			);
		}

		// Attempt button animation
		const attemptButton = document.querySelector(`.${panelStyles.attemptBtn}`);
		if (attemptButton) {
			attemptButton.classList.add(panelStyles.attemptFailed);
			attemptButton.addEventListener(
				"animationend",
				() => {
					attemptButton.classList.remove(panelStyles.attemptFailed);
				},
				{ once: true },
			);
		}
	},
};

/** Tracks whether we've initialized the DOM structure for game screen. */
let gameInitialized = false;

/** Tracks whether we've set up global keyboard handlers. */
let keyboardHandlersSetup = false;

/** Tracks the last announced screen to avoid re-announcing. */
let lastAnnouncedScreen: string | null = null;

/** Animation controller for the game area. */
let animationController: AnimationController | null = null;

/** Whether an attempt animation is currently playing. */
let isAnimating = false;

/** Pre-attempt task display values (shown during animation before result is revealed). */
let preAttemptFailureCount: number | null = null;
let preAttemptEvolvedName: string | null = null;

/** Current store reference for animation rendering. */
let currentStore: Store<GameState> | null = null;

/** Previous selected task ID, for detecting first selection (hint trigger). */
let prevSelectedTaskId: string | null = null;

/** Cached rendering state (generated once per run from seed). */
let cachedLayout: RoomLayout | null = null;
let cachedRenderer: RoomRenderer | null = null;
let cachedVariants: ItemVariants | null = null;
let cachedSeedPalette: SeedPalette | null = null;
let cachedRunSeed: number | null = null;

/** Gets or generates rendering state for the current run seed. */
function getRenderingState(runSeed: number): {
	layout: RoomLayout;
	renderer: RoomRenderer;
	variants: ItemVariants;
	seedPalette: SeedPalette;
} {
	if (
		cachedRunSeed === runSeed &&
		cachedLayout &&
		cachedRenderer &&
		cachedVariants &&
		cachedSeedPalette
	) {
		return {
			layout: cachedLayout,
			renderer: cachedRenderer,
			variants: cachedVariants,
			seedPalette: cachedSeedPalette,
		};
	}
	const rng = mulberry32(runSeed);
	const layout = generateSingleRoomLayout(rng);
	const variants = getItemVariants(rng);
	const seedPalette = getSeedPalette(rng);
	const artStyle = pickArtStyle(runSeed);
	const renderer = getRenderer(artStyle);

	cachedLayout = layout;
	cachedRenderer = renderer;
	cachedVariants = variants;
	cachedSeedPalette = seedPalette;
	cachedRunSeed = runSeed;

	return { layout, renderer, variants, seedPalette };
}

/** Cached theme colors from CSS variables. */
let cachedThemeColors: ThemeColors | null = null;
let cachedThemeName: string | null = null;

/** Reads theme colors from CSS custom properties, caching per theme. */
function getThemeColors(): ThemeColors {
	const currentTheme = document.documentElement.dataset.theme ?? null;
	if (cachedThemeColors && cachedThemeName === currentTheme) {
		return cachedThemeColors;
	}

	const style = getComputedStyle(document.documentElement);
	const floor = style.getPropertyValue("--game-area-floor").trim();
	const wall = style.getPropertyValue("--game-area-wall").trim();
	const highlight = style.getPropertyValue("--game-area-highlight").trim();
	const highlightBorder = style
		.getPropertyValue("--game-area-highlight-border")
		.trim();

	cachedThemeColors = {
		floor: cssColorToHex(floor, "#e8e4d9"),
		wall: cssColorToHex(wall, "#d4cfc4"),
		highlight: highlight || "rgba(94, 106, 210, 0.15)",
		highlightBorder: highlightBorder || "rgba(94, 106, 210, 0.4)",
	};
	cachedThemeName = currentTheme;
	return cachedThemeColors;
}

/** Builds the time palette for a time block using current theme colors. */
function getTimePalette(
	timeBlock: string,
	inExtendedNight: boolean,
): TimePalette {
	const theme = getThemeColors();
	return buildTimePalette(timeBlock, inExtendedNight, theme);
}

/** How long dog reacts to phone checks - must match GameArea.ts */
const PHONE_REACTION_DURATION = 2500;

/** Timeout for dog reaction reset after phone check. */
let phoneReactionTimeout: ReturnType<typeof setTimeout> | null = null;

/** Animation frame ID for dog animation loop. */
let dogAnimationFrameId: number | null = null;

/** How long dog reacts to task outcomes - must match GameArea.ts */
const TASK_REACTION_DURATION = 2000;

/**
 * Starts a continuous render loop for dog animations (restless pacing, reaction wags).
 * Runs when dog has urgency or is reacting to a task outcome.
 */
function startDogAnimationLoop(
	canvas: HTMLCanvasElement,
	store: Store<GameState>,
): void {
	// Don't start if already running or if task animation is active
	if (dogAnimationFrameId !== null || isAnimating) return;

	function frame() {
		const s = store.getState();
		const urgency = getDogUrgency(s);
		const timeSinceTask = performance.now() - s.lastTaskTime;
		const isReactingToTask =
			s.lastTaskOutcome !== null && timeSinceTask < TASK_REACTION_DURATION;

		// Stop if task animation started, or no longer urgent and not reacting
		if (isAnimating || (urgency === "normal" && !isReactingToTask)) {
			dogAnimationFrameId = null;
			return;
		}

		rerenderGameArea(canvas, store);
		dogAnimationFrameId = requestAnimationFrame(frame);
	}

	dogAnimationFrameId = requestAnimationFrame(frame);
}

/** Stops the dog animation loop. */
function stopDogAnimationLoop(): void {
	if (dogAnimationFrameId !== null) {
		cancelAnimationFrame(dogAnimationFrameId);
		dogAnimationFrameId = null;
	}
}

/**
 * Re-renders the game area canvas with current state.
 * Encapsulates state gathering and prop passing.
 */
function rerenderGameArea(
	canvas: HTMLCanvasElement,
	store: Store<GameState>,
): void {
	const s = store.getState();
	const { layout, renderer, variants, seedPalette } = getRenderingState(
		s.runSeed,
	);
	const timePalette = getTimePalette(s.timeBlock, s.inExtendedNight);
	const themeColors = getThemeColors();
	renderGameArea(canvas, {
		animationState: animationController?.getState() ?? null,
		energy: s.energy,
		selectedTaskId: s.selectedTaskId,
		lastPhoneOutcome: s.lastPhoneOutcome,
		lastPhoneTime: s.lastPhoneTime,
		lastTaskOutcome: s.lastTaskOutcome,
		lastTaskTime: s.lastTaskTime,
		dogUrgency: getDogUrgency(s),
		layout,
		renderer,
		timePalette,
		seedPalette,
		variants,
		themeColors,
	});
}

/**
 * Returns the announcement text for a screen type, or null for game screen.
 * Game screen handles its own announcements (day/time block).
 */
function getScreenAnnouncement(screenInfo: ScreenInfo): string | null {
	const s = strings();
	switch (screenInfo.type) {
		case "nightChoice":
			// Include the night prompt and push-through description
			return `${s.a11y.screenNightChoice}. ${screenInfo.nightPrompt} ${screenInfo.description}`;
		case "friendRescue":
			// Include the friend's message and cost
			return `${s.a11y.screenFriendRescue}. ${screenInfo.message} ${s.game.rescueCost(screenInfo.costLabel)}`;
		case "daySummary": {
			// Include stats, narrative, and dog note
			const stats = s.game.taskStats(
				screenInfo.succeededCount,
				screenInfo.attemptedCount,
			);
			const dogNote = screenInfo.dogNote ? ` ${screenInfo.dogNote}` : "";
			return `${s.a11y.screenDaySummary}. ${stats}. ${screenInfo.narrative}${dogNote}`;
		}
		case "weekComplete":
			// Include the week narrative
			return `${s.a11y.screenWeekComplete}. ${screenInfo.narrative}`;
		case "narrativeEvent":
			if (screenInfo.eventType === "major") {
				return `${s.a11y.screenNarrativeEvent}. ${screenInfo.title}. ${screenInfo.description}`;
			}
			return `${s.a11y.screenNarrativeEvent}. ${screenInfo.text}`;
		default:
			return null; // Game screen announces day/time separately
	}
}

/**
 * Main render function. Routes between screens based on state.
 */
export function renderApp(store: Store<GameState>) {
	const state = store.getState();
	const app = document.getElementById("app");
	if (!app) return;

	// Get all screen info from shared controller
	const screenInfo = getScreenInfo(state);

	// Create decision handler that wraps executeDecision
	const handleDecision = async (decision: Decision) => {
		const s = strings();

		// For attempt decisions, coordinate with game area animation
		if (decision.type === "attempt" && animationController && !isAnimating) {
			isAnimating = true;
			const taskId = decision.taskId;

			// Cache pre-attempt display values (shown during animation)
			// Get fresh screen info - the closure's screenInfo may be stale
			const currentScreenInfo = getScreenInfo(store.getState());
			const preAttemptTask =
				currentScreenInfo.type === "game"
					? currentScreenInfo.selectedTask
					: null;
			preAttemptFailureCount = preAttemptTask?.failureCount ?? null;
			preAttemptEvolvedName = preAttemptTask?.evolvedName ?? null;

			// Start the animation (character walks toward task)
			const animPromise = animationController.playTaskAttempt(taskId);

			// Execute the decision with callbacks for animation coordination
			const result = executeDecision(store, decision, {
				onAttemptStart: () => {
					// Animation already started above
				},
				onFailure: (failedTaskId: string) => {
					// Set failure timing for animation
					const currentState = store.getState();
					const timing = pickFailureTiming(
						currentState.runSeed + currentState.rollCount,
					);
					animationController?.setResult(false, timing);
					// Also trigger CSS animations on task/button
					browserAttemptCallbacks.onFailure?.(failedTaskId);
				},
				onAttemptComplete: (_completedTaskId: string, succeeded: boolean) => {
					if (succeeded) {
						animationController?.setResult(true);
					}
					// Failure already handled in onFailure

					// Dog reacts after a random delay (300-800ms) during the animation
					// This gives a subtle hint without immediately spoiling the result
					const reactionDelay = 300 + Math.random() * 500;
					setTimeout(() => {
						store.set("lastTaskOutcome", succeeded ? "success" : "failure");
						store.set("lastTaskTime", performance.now());
					}, reactionDelay);
				},
			});

			// Wait for animation to complete
			await animPromise;
			isAnimating = false;

			// Clear cached pre-attempt values
			preAttemptFailureCount = null;
			preAttemptEvolvedName = null;

			// Re-render panel now that animation is done (shows "Done" instead of "Attempting...")
			const updatedScreenInfo = getScreenInfo(store.getState());
			if (updatedScreenInfo.type === "game") {
				renderTaskPanel(updatedScreenInfo, handleDecision, null);
			}

			// Now handle focus and announcements
			const newState = store.getState();
			const hasActionsLeft = isWeekend(newState)
				? newState.weekendPointsRemaining > 0
				: newState.slotsRemaining > 0;

			if (result.succeeded) {
				const task = state.tasks.find((t) => t.id === decision.taskId);
				if (task) {
					announce(s.a11y.taskSucceeded(task.name));
				}

				// Move focus to next uncompleted task if there are more actions available
				// Brief delay to show "Done" before deselecting
				if (hasActionsLeft) {
					const succeededTaskId = decision.taskId;
					setTimeout(() => {
						// Only deselect if user hasn't selected something else
						if (store.getState().selectedTaskId === succeededTaskId) {
							store.set("selectedTaskId", null);
							setTimeout(() => {
								const taskBtns = document.querySelectorAll<HTMLElement>(
									`.${taskStyles.task}:not(.${taskStyles.succeeded})`,
								);
								taskBtns[0]?.focus();
							}, 0);
						}
					}, 1000);
				}
			} else if (hasActionsLeft) {
				// Failed - keep focus on panel
				setTimeout(() => {
					const panel = document.querySelector<HTMLElement>(
						`.${panelStyles.panel}`,
					);
					panel?.focus();
				}, 0);
			}

			// Show phone buzz notification if present
			if (result.phoneBuzzText) {
				showNotification(result.phoneBuzzText);
			}

			return;
		}

		// Non-attempt decisions: no animation, execute immediately
		const result = executeDecision(store, decision, browserAttemptCallbacks);

		// Handle focus after skip/continue (advancing to next time block)
		if (decision.type === "skip") {
			const newState = store.getState();
			// Only announce/focus if we're still on game screen (not night choice, etc.)
			if (newState.screen === "game") {
				announce(s.a11y.timeBlockChanged(newState.timeBlock));
				setTimeout(() => {
					const taskBtns = document.querySelectorAll<HTMLElement>(
						`.${taskStyles.task}:not(.${taskStyles.succeeded})`,
					);
					taskBtns[0]?.focus();
				}, 0);
			}
		}

		// Show phone buzz notification if present
		if (result.phoneBuzzText) {
			showNotification(result.phoneBuzzText);
		}

		// Show inline event banner if a minor event fired during this action
		const postState = store.getState();
		if (postState.eventBanner) {
			showNotification(postState.eventBanner.text, postState.eventBanner.style);
		}

		// Show scroll trap flavor text if present
		if (result.scrollTrapText) {
			showNotification(result.scrollTrapText);

			// Cancel any pending dog reaction reset
			if (phoneReactionTimeout) {
				clearTimeout(phoneReactionTimeout);
			}

			// Schedule canvas re-render after dog reaction expires
			phoneReactionTimeout = setTimeout(() => {
				phoneReactionTimeout = null;
				const canvas = app.querySelector<HTMLCanvasElement>("canvas");
				if (canvas && store.getState().screen === "game") {
					rerenderGameArea(canvas, store);
				}
			}, PHONE_REACTION_DURATION + 100);
		}
	};

	// Announce screen transitions (except game screen which handles its own)
	if (screenInfo.type !== lastAnnouncedScreen) {
		const announcement = getScreenAnnouncement(screenInfo);
		if (announcement) {
			announce(announcement);
		}
		lastAnnouncedScreen = screenInfo.type;
	}

	// Stop dog animation loop when leaving game screen
	// (will be restarted by game screen if dog is still urgent)
	stopDogAnimationLoop();

	switch (screenInfo.type) {
		case "splash":
			gameInitialized = false;
			cachedRunSeed = null;
			delete app.dataset.time;
			renderSplash(screenInfo, app, store);
			break;
		case "menu":
			gameInitialized = false;
			delete app.dataset.time;
			renderMainMenu(screenInfo, app, store);
			break;
		case "intro":
			gameInitialized = false;
			delete app.dataset.time;
			renderIntro(app, store);
			break;
		case "nightChoice":
			gameInitialized = false;
			app.dataset.time = "night";
			renderNightChoice(screenInfo, app, handleDecision);
			break;
		case "friendRescue":
			gameInitialized = false;
			app.dataset.time = state.timeBlock;
			renderFriendRescue(screenInfo, app, handleDecision, store);
			break;
		case "daySummary":
			gameInitialized = false;
			delete app.dataset.time;
			renderDaySummary(screenInfo, app, store);
			break;
		case "weekComplete":
			gameInitialized = false;
			delete app.dataset.time;
			renderWeekComplete(screenInfo, app, store);
			break;
		case "patterns":
			gameInitialized = false;
			delete app.dataset.time;
			renderPatterns(screenInfo, app, store);
			break;
		case "narrativeEvent":
			gameInitialized = false;
			app.dataset.time = state.timeBlock;
			renderNarrativeEvent(screenInfo, app, handleDecision);
			break;
		default:
			renderGameScreen(store, screenInfo, app, handleDecision);
			break;
	}
}

/** Shows a one-time hint dialog, optionally highlighting a target element. */
function showHintDialog(text: string, highlightEl?: Element | null): void {
	const s = strings();
	const dialog = document.createElement("dialog");
	dialog.className = appStyles.hintDialog;

	const p = document.createElement("p");
	p.textContent = text;
	dialog.appendChild(p);

	const btn = document.createElement("button");
	btn.className = `btn btn-secondary ${appStyles.hintDismiss}`;
	btn.textContent = s.onboarding.dismiss;
	dialog.appendChild(btn);

	// Glow the target element while dialog is open
	highlightEl?.classList.add(appStyles.hintHighlight);

	btn.addEventListener("click", () => dialog.close());
	dialog.addEventListener("close", () => {
		highlightEl?.classList.remove(appStyles.hintHighlight);
		dialog.remove();
	});

	document.body.appendChild(dialog);
	dialog.showModal();
}

/** Shows a one-time contextual hint if conditions are met. */
function showContextualHint(
	screenInfo: GameScreenInfo,
	isFirstRender: boolean,
): void {
	const s = strings();

	// First game screen: nudge toward clicking a task
	if (isFirstRender && !screenInfo.isWeekend) {
		if (!hasHintBeenShown("firstTask")) {
			markHintShown("firstTask");
			setTimeout(() => {
				const taskList = document.querySelector(`.${appStyles.taskList}`);
				showHintDialog(s.onboarding.firstTask, taskList);
			}, 800);
			return;
		}
	}

	// First task selection: point at the Attempt button
	if (
		screenInfo.selectedTask &&
		prevSelectedTaskId === null &&
		screenInfo.selectedTask.canAttempt
	) {
		if (!hasHintBeenShown("firstAttempt")) {
			markHintShown("firstAttempt");
			setTimeout(() => {
				const attemptBtn = document.querySelector(`.${panelStyles.attemptBtn}`);
				showHintDialog(s.onboarding.firstAttempt, attemptBtn);
			}, 300);
			return;
		}
	}

	// First weekend: explain the structural shift (no element to highlight)
	if (isFirstRender && screenInfo.isWeekend) {
		if (!hasHintBeenShown("firstWeekend")) {
			markHintShown("firstWeekend");
			setTimeout(() => showHintDialog(s.onboarding.firstWeekend), 800);
			return;
		}
	}
}

/** Renders the main game screen. */
function renderGameScreen(
	store: Store<GameState>,
	screenInfo: GameScreenInfo,
	app: HTMLElement,
	onDecision: (decision: Decision) => void,
) {
	// Track if this is first render (for focus management)
	const isFirstRender = !gameInitialized;

	// Create structure on first render of game screen
	if (!gameInitialized) {
		const { layout: initLayout } = getRenderingState(store.getState().runSeed);
		app.innerHTML = createAppStructure(screenInfo, initLayout);
		gameInitialized = true;

		// Wire up menu button
		app
			.querySelector(`.${appStyles.menuBtn}`)
			?.addEventListener("click", () => {
				store.set("screen", "menu");
			});

		// Wire up Enter on panel to trigger Attempt (quick action from panel focus)
		const panelEl = app.querySelector<HTMLElement>(`.${panelStyles.panel}`);
		panelEl?.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const state = store.getState();
				// Only trigger if panel itself is focused (not a button inside)
				// and there's a selected task that can be attempted
				if (
					document.activeElement === panelEl &&
					state.selectedTaskId &&
					state.screen === "game"
				) {
					const task = state.tasks.find((t) => t.id === state.selectedTaskId);
					const hasActions = isWeekend(state)
						? state.weekendPointsRemaining > 0
						: state.slotsRemaining > 0;
					if (task && !task.succeededToday && hasActions) {
						e.preventDefault();
						onDecision({ type: "attempt", taskId: task.id });
					}
				}
			}
		});

		// Announce panel contents when it receives focus
		panelEl?.addEventListener("focus", () => {
			const state = store.getState();
			const currentScreenInfo = getScreenInfo(state);
			if (currentScreenInfo.type === "game" && currentScreenInfo.selectedTask) {
				const task = currentScreenInfo.selectedTask;
				const s = strings();
				announce(
					s.a11y.panelAnnounce(
						task.evolvedName,
						task.canAttempt && !task.succeededToday,
						task.failureCount,
						task.urgency?.text,
						task.variant?.name,
					),
				);
			}
		});

		// Set up keyboard handlers for task deselection
		if (!keyboardHandlersSetup) {
			document.addEventListener("keydown", (e) => {
				const state = store.getState();
				// Only handle if on game screen with a selected task and no dialog open
				if (
					state.screen !== "game" ||
					!state.selectedTaskId ||
					document.querySelector("dialog[open]")
				) {
					return;
				}

				// Escape works globally
				// Arrow Left only works when focus is in task list or panel
				const inTaskArea =
					document.activeElement?.closest(
						`.${appStyles.taskList}, .${panelStyles.panel}`,
					) !== null;

				if (e.key === "Escape" || (e.key === "ArrowLeft" && inTaskArea)) {
					e.preventDefault();
					const taskId = state.selectedTaskId;
					store.set("selectedTaskId", null);
					// Return focus to the task that was selected
					setTimeout(() => {
						const taskBtn = document.querySelector<HTMLElement>(
							`[data-id="${taskId}"]`,
						);
						taskBtn?.focus();
					}, 0);
				}
			});
			keyboardHandlersSetup = true;
		}

		// Set up animation controller and game area
		currentStore = store;
		const { layout } = getRenderingState(store.getState().runSeed);
		animationController = createAnimationController(() => {
			// Render callback - update canvas each frame
			const canvas = app.querySelector<HTMLCanvasElement>("canvas");
			if (canvas && currentStore) {
				rerenderGameArea(canvas, currentStore);
			}
		}, layout);

		// Initial render of game area
		const canvas = app.querySelector<HTMLCanvasElement>("canvas");
		if (canvas) {
			rerenderGameArea(canvas, store);
		}
	}

	// Set time-based theme (use evening for weekend default)
	app.dataset.time = screenInfo.isWeekend ? "evening" : screenInfo.timeBlock;

	// Update content
	renderHeader(screenInfo);
	renderSlots(screenInfo);
	renderTaskList(screenInfo, store);
	// Pass animating task ID so panel can show "Attempting..." state
	const animatingTaskId = isAnimating
		? (animationController?.getState().taskId ?? null)
		: null;
	renderTaskPanel(screenInfo, onDecision, animatingTaskId, {
		failureCount: preAttemptFailureCount,
		evolvedName: preAttemptEvolvedName,
	});
	renderPhoneButton(screenInfo, onDecision);
	renderFooter(screenInfo, onDecision);
	initTooltips();

	// Re-render game area for selection highlight (when not animating)
	if (!isAnimating) {
		const canvas = app.querySelector<HTMLCanvasElement>("canvas");
		if (canvas) {
			rerenderGameArea(canvas, store);

			// Start continuous render loop if dog needs animation (restless or reacting)
			const s = store.getState();
			const urgency = getDogUrgency(s);
			const timeSinceTask = performance.now() - s.lastTaskTime;
			const isReactingToTask =
				s.lastTaskOutcome !== null && timeSinceTask < TASK_REACTION_DURATION;
			if (urgency !== "normal" || isReactingToTask) {
				startDogAnimationLoop(canvas, store);
			}
		}
	}

	// Focus and announce on initial render
	if (isFirstRender) {
		const s = strings();
		// Announce full game context for screen readers
		// Use longer delay on page load to ensure VoiceOver is ready
		const slotsOrPoints = screenInfo.isWeekend
			? screenInfo.weekendPointsRemaining
			: screenInfo.slotsRemaining;
		setTimeout(() => {
			announce(
				s.a11y.gameLoaded(
					screenInfo.day,
					screenInfo.timeBlock,
					screenInfo.isWeekend,
					slotsOrPoints,
					screenInfo.selectedTask?.name,
				),
			);
		}, 300);

		if (screenInfo.selectedTask) {
			// Focus the selected task
			const taskToFocus = app.querySelector<HTMLElement>(
				`[data-id="${screenInfo.selectedTask.id}"]`,
			);
			taskToFocus?.focus();
		} else {
			// No selection - focus first uncompleted task
			const taskBtns = document.querySelectorAll<HTMLElement>(
				`.${taskStyles.task}:not(.${taskStyles.succeeded})`,
			);
			taskBtns[0]?.focus();
		}
	}

	// Contextual hints (one-time, shown via notification area)
	showContextualHint(screenInfo, isFirstRender);
	prevSelectedTaskId = screenInfo.selectedTask?.id ?? null;
}
