import { type AttemptCallbacks, selectTask } from "../actions/tasks";
import { type Decision, executeDecision } from "../core/controller";
import {
	type GameScreenInfo,
	getScreenInfo,
	type ScreenInfo,
	type TaskDisplay,
} from "../core/screenInfo";
import { strings } from "../i18n";
import { type GameState, isWeekend } from "../state";
import type { Store } from "../store";
import { clearSave } from "../systems/persistence";
import { announce } from "../utils/announce";
import { initTooltips } from "../utils/tooltip";
import {
	createAccessibilityDialog,
	openAccessibilityDialog,
} from "./AccessibilityDialog";
import appStyles from "./App.module.css";
import { renderDaySummary } from "./DaySummary";
import { renderFriendRescue } from "./FriendRescue";
import { renderNightChoice } from "./NightChoice";
import panelStyles from "./Panel.module.css";
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

/** Tracks whether we've created the accessibility dialog. */
let a11yDialogCreated = false;

/** Tracks whether we've set up global keyboard handlers. */
let keyboardHandlersSetup = false;

/** Tracks the last announced screen to avoid re-announcing. */
let lastAnnouncedScreen: string | null = null;

/**
 * Focuses the main action in the panel: Attempt button, Continue button, or panel itself.
 * Uses rAF + delay to ensure DOM is painted and screen readers catch up.
 */
function focusPanelAction() {
	requestAnimationFrame(() => {
		setTimeout(() => {
			// Try Attempt button first (if enabled)
			const attemptBtn = document.querySelector<HTMLElement>(
				`.${panelStyles.attemptBtn}:not([disabled])`,
			);
			if (attemptBtn) {
				attemptBtn.focus();
				return;
			}

			// Try Continue button
			const continueBtn = document.querySelector<HTMLElement>(
				`.${panelStyles.continueBtn}`,
			);
			if (continueBtn) {
				continueBtn.focus();
				return;
			}

			// Fall back to panel
			const panel = document.querySelector<HTMLElement>(
				`.${panelStyles.panel}`,
			);
			panel?.focus();
		}, 100);
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
	const handleDecision = (decision: Decision) => {
		const s = strings();
		const result = executeDecision(store, decision, browserAttemptCallbacks);

		// Handle focus after task attempt
		if (decision.type === "attempt") {
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
				if (hasActionsLeft) {
					// Deselect first, then focus after re-render
					store.set("selectedTaskId", null);
					setTimeout(() => {
						const taskBtns = document.querySelectorAll<HTMLElement>(
							`.${taskStyles.task}:not(.${taskStyles.succeeded})`,
						);
						taskBtns[0]?.focus();
					}, 0);
				}
			} else if (hasActionsLeft) {
				// Failed - keep focus on Attempt button if actions remain
				setTimeout(() => {
					const attemptBtn = document.querySelector<HTMLElement>(
						`.${panelStyles.attemptBtn}`,
					);
					attemptBtn?.focus();
				}, 0);
			}

			// No actions left - focus Continue button
			if (!hasActionsLeft) {
				setTimeout(() => {
					const continueBtn = document.querySelector<HTMLElement>(
						`.${panelStyles.continueBtn}`,
					);
					continueBtn?.focus();
				}, 0);
			}
		}

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

		// Show scroll trap flavor text if present
		if (result.scrollTrapText) {
			showNotification(result.scrollTrapText);
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

	switch (screenInfo.type) {
		case "nightChoice":
			gameInitialized = false;
			renderNightChoice(screenInfo, app, handleDecision);
			break;
		case "friendRescue":
			gameInitialized = false;
			renderFriendRescue(screenInfo, app, handleDecision, store);
			break;
		case "daySummary":
			gameInitialized = false;
			renderDaySummary(screenInfo, app, store);
			break;
		case "weekComplete":
			gameInitialized = false;
			renderWeekComplete(screenInfo, app, store);
			break;
		default:
			renderGameScreen(store, screenInfo, app, handleDecision);
			break;
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
		app.innerHTML = createAppStructure(screenInfo);
		gameInitialized = true;

		// Create accessibility dialog once and append to body
		if (!a11yDialogCreated) {
			document.body.appendChild(createAccessibilityDialog());
			a11yDialogCreated = true;
		}

		// Wire up accessibility button
		app
			.querySelector(`.${appStyles.a11yBtn}`)
			?.addEventListener("click", () => {
				openAccessibilityDialog();
			});

		// Wire up new game button
		app
			.querySelector(`.${appStyles.newGameBtn}`)
			?.addEventListener("click", () => {
				if (confirm(strings().game.newGameConfirm)) {
					clearSave();
					location.reload();
				}
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
	}

	// Set time-based theme (use evening for weekend default)
	app.dataset.time = screenInfo.isWeekend ? "evening" : screenInfo.timeBlock;

	// Update content
	renderHeader(screenInfo);
	renderSlots(screenInfo);
	renderTaskList(screenInfo, store);
	renderTaskPanel(screenInfo, onDecision);
	renderFooter(screenInfo, onDecision);
	initTooltips();

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
}

/** Creates the initial HTML structure for the app. */
function createAppStructure(screenInfo: GameScreenInfo): string {
	const s = strings();

	return `
		<header class="${appStyles.header}">
			<h1 class="${appStyles.title}"></h1>
			<div class="${appStyles.timeBlock}"></div>
		</header>

		<main class="${appStyles.main}">
			<section class="${appStyles.taskListContainer}">
				<div class="${appStyles.slots}" ${screenInfo.isWeekend ? 'data-weekend="true"' : ""}>
					${
						screenInfo.isWeekend
							? `<span class="${appStyles.points}"></span>`
							: `
					<span class="${appStyles.slot}"></span>
					<span class="${appStyles.slot}"></span>
					<span class="${appStyles.slot}"></span>
					`
					}
				</div>
				<ul class="${appStyles.taskList}"></ul>
				<div class="${appStyles.notification}" aria-live="polite" aria-atomic="true"></div>
			</section>

			<aside id="task-panel" class="${panelStyles.panel}" tabindex="-1" aria-label="${s.a11y.taskPanel}">
				<p class="${panelStyles.empty}">${s.game.selectTask}</p>
			</aside>
		</main>

		<footer class="${appStyles.footer}">
			<button class="${appStyles.phoneBtn}">${s.game.checkPhone}</button>
			<button class="${appStyles.skipBtn}"></button>
			<button class="${appStyles.a11yBtn}" data-tooltip="${s.a11y.openA11yDialog}" aria-label="${s.a11y.openA11yDialog}">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<circle cx="12" cy="4" r="2"/>
					<path d="M12 6v14M8 10h8M7 20h10"/>
				</svg>
			</button>
			<button class="${appStyles.newGameBtn}">${s.game.newGame}</button>
		</footer>
	`;
}

/** Timeout ID for hiding notification - tracked to reset on new notifications. */
let notificationHideTimeout: ReturnType<typeof setTimeout> | null = null;

/** Shows a brief notification message (e.g., phone buzz text). */
function showNotification(text: string) {
	const notification = document.querySelector(`.${appStyles.notification}`);
	if (!notification) return;

	// Cancel any pending hide timeout
	if (notificationHideTimeout) {
		clearTimeout(notificationHideTimeout);
		notificationHideTimeout = null;
	}

	// Clear first to ensure re-announcement, then set after paint
	notification.textContent = "";
	requestAnimationFrame(() => {
		setTimeout(() => {
			notification.textContent = text;
			notification.classList.add(appStyles.notificationVisible);
		}, 100);
	});

	// Clear after a few seconds
	notificationHideTimeout = setTimeout(() => {
		notification.classList.remove(appStyles.notificationVisible);
		notificationHideTimeout = null;
	}, 3200);
}

/** Updates the header with current day and time block. */
function renderHeader(screenInfo: GameScreenInfo) {
	const title = document.querySelector(`.${appStyles.title}`);
	const timeBlockEl = document.querySelector(`.${appStyles.timeBlock}`);

	if (title) title.textContent = screenInfo.dayDisplay;
	if (timeBlockEl) {
		// Hide time block on weekends
		timeBlockEl.textContent = screenInfo.isWeekend
			? ""
			: screenInfo.timeBlockDisplay;
	}
}

/** Updates the action slot or point indicators. */
function renderSlots(screenInfo: GameScreenInfo) {
	const s = strings();
	const slotsContainer = document.querySelector(`.${appStyles.slots}`);

	if (screenInfo.isWeekend) {
		// Weekend: show remaining points
		const pointsEl = document.querySelector(`.${appStyles.points}`);
		if (pointsEl) {
			pointsEl.textContent = s.game.points(screenInfo.weekendPointsRemaining);
		}
	} else if (screenInfo.inExtendedNight) {
		// Extended night: hide slot count, just show text
		if (slotsContainer) {
			slotsContainer.innerHTML = `<span class="${appStyles.lateNight}">${s.game.lateNight}</span>`;
		}
	} else {
		// Normal weekday: show slot indicators
		// Rebuild slots if coming back from extended night
		const slots = document.querySelectorAll(`.${appStyles.slot}`);
		if (slots.length !== 3 && slotsContainer) {
			slotsContainer.innerHTML = `
				<span class="${appStyles.slot}"></span>
				<span class="${appStyles.slot}"></span>
				<span class="${appStyles.slot}"></span>
			`;
		}
		const currentSlots = document.querySelectorAll(`.${appStyles.slot}`);
		const used = 3 - screenInfo.slotsRemaining;

		currentSlots.forEach((slot, i) => {
			slot.classList.toggle(appStyles.slotUsed, i < used);
		});
	}
}

/** Renders the list of available tasks. */
function renderTaskList(screenInfo: GameScreenInfo, store: Store<GameState>) {
	const s = strings();
	const list = document.querySelector(`.${appStyles.taskList}`);
	if (!list) return;

	// Preserve focus across re-render - track which task had focus
	const focusedTaskId = (document.activeElement as HTMLElement)?.dataset?.id;
	const focusWasInList = list.contains(document.activeElement);

	list.innerHTML = "";

	for (const task of screenInfo.tasks) {
		const button = document.createElement("button");
		button.className = taskStyles.task;
		button.dataset.id = task.id;

		const displayName = getTaskDisplayName(task, screenInfo.isWeekend);
		const isSelected = screenInfo.selectedTask?.id === task.id;

		// Set accessible name with state info
		if (task.succeededToday) {
			button.setAttribute(
				"aria-label",
				`${displayName}, ${s.a11y.completedToday}`,
			);
		}
		button.textContent = displayName;

		// Indicate relationship to panel
		button.setAttribute("aria-controls", "task-panel");

		// Indicate selection state
		button.setAttribute("aria-pressed", String(isSelected));
		if (isSelected) {
			button.classList.add(taskStyles.selected);
		}
		if (task.succeededToday) {
			button.classList.add(taskStyles.succeeded);
		}

		button.addEventListener("click", (e) => {
			selectTask(store, task.id);
			// Move focus to panel action if activated via keyboard (Enter/Space)
			// Keyboard clicks have no pointer coordinates
			if (e.detail === 0) {
				focusPanelAction();
			}
		});

		// Arrow key navigation between tasks
		button.addEventListener("keydown", (e) => {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const tasks = list.querySelectorAll<HTMLElement>(`.${taskStyles.task}`);
				const currentIndex = Array.from(tasks).indexOf(button);
				const nextIndex =
					e.key === "ArrowDown"
						? Math.min(currentIndex + 1, tasks.length - 1)
						: Math.max(currentIndex - 1, 0);
				tasks[nextIndex]?.focus();
			}
			// Arrow Right to select/open details and focus action
			if (e.key === "ArrowRight") {
				e.preventDefault();
				selectTask(store, task.id);
				focusPanelAction();
			}
			// Arrow Left handled at document level (works from panel too)
		});

		list.appendChild(button);
	}

	// Restore focus if it was in the list before re-render
	if (focusWasInList && focusedTaskId) {
		const buttonToFocus = list.querySelector<HTMLElement>(
			`[data-id="${focusedTaskId}"]`,
		);
		buttonToFocus?.focus();
	}
}

/** Renders the side panel showing selected task details. */
function renderTaskPanel(
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
) {
	const s = strings();
	const panel = document.querySelector(`.${panelStyles.panel}`);
	if (!panel) return;

	const selectedTask = screenInfo.selectedTask;

	// Check if period is exhausted (no more actions possible)
	const periodExhausted = screenInfo.isWeekend
		? screenInfo.weekendPointsRemaining <= 0
		: screenInfo.slotsRemaining <= 0;

	// Build continue button HTML if period is exhausted
	let continueButtonHtml = "";
	if (periodExhausted) {
		const buttonText = screenInfo.isWeekend
			? s.game.endDay
			: screenInfo.nextTimeBlock
				? s.game.continueTo(screenInfo.nextTimeBlock)
				: s.game.endDay;
		continueButtonHtml = `<button class="${panelStyles.continueBtn}">${buttonText}</button>`;
	}

	if (!selectedTask) {
		panel.innerHTML = `
			<p class="${panelStyles.empty}">${s.game.selectTask}</p>
			${continueButtonHtml}
		`;
		attachContinueHandler(panel, screenInfo, onDecision);
		return;
	}

	// Show cost on weekends if > 1
	const costDisplay =
		screenInfo.isWeekend && selectedTask.weekendCost > 1
			? `<p class="${panelStyles.cost}">${s.game.costPoints(selectedTask.weekendCost)}</p>`
			: "";

	// Build hidden description for screen readers (proper sentences)
	const descParts = [
		`${selectedTask.evolvedName}.`,
		`${s.game.failedCount(selectedTask.failureCount)}.`,
	];
	if (selectedTask.urgency) descParts.push(`${selectedTask.urgency.text}.`);
	if (
		selectedTask.variant &&
		selectedTask.canAttempt &&
		!selectedTask.succeededToday
	) {
		descParts.push(`${s.a11y.variantAvailable(selectedTask.variant.name)}`);
	}
	const buttonDesc = descParts.join(" ");

	panel.innerHTML = `
		<span id="panel-desc" class="sr-only">${buttonDesc}</span>
		<p class="${panelStyles.taskName}">${selectedTask.evolvedName}</p>
		<p class="${panelStyles.stats}">
			${s.game.failedCount(selectedTask.failureCount)}
		</p>
		${selectedTask.urgency ? `<p class="${panelStyles.urgency}" data-urgency="${selectedTask.urgency.level}">${selectedTask.urgency.text}</p>` : ""}
		${costDisplay}
		<button class="${panelStyles.attemptBtn}" aria-describedby="panel-desc" ${selectedTask.canAttempt ? "" : "disabled"}>
			${selectedTask.succeededToday ? s.game.done : s.game.attempt}
		</button>
		${selectedTask.variant && selectedTask.canAttempt && !selectedTask.succeededToday ? `<button class="${panelStyles.variantBtn}" aria-describedby="panel-desc">${selectedTask.variant.name}</button>` : ""}
		${continueButtonHtml}
	`;

	const attemptBtn = panel.querySelector(`.${panelStyles.attemptBtn}`);
	if (attemptBtn && selectedTask.canAttempt) {
		attemptBtn.addEventListener("click", () => {
			onDecision({ type: "attempt", taskId: selectedTask.id });
		});
	}

	// Wire up variant button
	const variantBtn = panel.querySelector(`.${panelStyles.variantBtn}`);
	if (variantBtn && selectedTask.canAttempt) {
		variantBtn.addEventListener("click", () => {
			onDecision({
				type: "attempt",
				taskId: selectedTask.id,
				useVariant: true,
			});
		});
	}

	attachContinueHandler(panel, screenInfo, onDecision);
}

/** Attaches click handler to continue button if present. */
function attachContinueHandler(
	panel: Element,
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
) {
	panel
		.querySelector(`.${panelStyles.continueBtn}`)
		?.addEventListener("click", () => {
			if (screenInfo.isWeekend) {
				onDecision({ type: "endDay" });
			} else {
				onDecision({ type: "skip" });
			}
		});
}

/** Renders the footer with skip/end day and phone buttons. */
function renderFooter(
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
) {
	const s = strings();
	const skipBtn = document.querySelector(`.${appStyles.skipBtn}`);
	const phoneBtn = document.querySelector(`.${appStyles.phoneBtn}`);

	// Set up phone button (scroll trap)
	if (phoneBtn) {
		const newPhoneBtn = phoneBtn.cloneNode(true) as HTMLButtonElement;
		phoneBtn.parentNode?.replaceChild(newPhoneBtn, phoneBtn);
		newPhoneBtn.addEventListener("click", () => {
			onDecision({ type: "checkPhone" });
		});
		// Random tooltip on hover (set initial so initTooltips picks it up)
		const phoneTips = s.tooltips.checkPhone;
		newPhoneBtn.dataset.tooltip =
			phoneTips[Math.floor(Math.random() * phoneTips.length)];
		newPhoneBtn.addEventListener("mouseenter", () => {
			newPhoneBtn.dataset.tooltip =
				phoneTips[Math.floor(Math.random() * phoneTips.length)];
		});
	}

	if (!skipBtn) return;

	// Remove old listeners by cloning
	const newBtn = skipBtn.cloneNode(true) as HTMLButtonElement;
	skipBtn.parentNode?.replaceChild(newBtn, skipBtn);

	if (screenInfo.isWeekend) {
		// Weekend: single "End day" button
		newBtn.textContent = s.game.endDay;
		newBtn.disabled = false;
		newBtn.addEventListener("click", () => {
			onDecision({ type: "endDay" });
		});
	} else {
		// Weekday: skip to next block or end day
		if (screenInfo.nextTimeBlock) {
			newBtn.textContent = s.game.skipTo(screenInfo.nextTimeBlock);
			newBtn.disabled = false;
			newBtn.addEventListener("click", () => {
				onDecision({ type: "skip" });
			});
			// Random tooltip on hover (set initial so initTooltips picks it up)
			const skipTips = s.tooltips.skip;
			newBtn.dataset.tooltip =
				skipTips[Math.floor(Math.random() * skipTips.length)];
			newBtn.addEventListener("mouseenter", () => {
				newBtn.dataset.tooltip =
					skipTips[Math.floor(Math.random() * skipTips.length)];
			});
		} else {
			newBtn.textContent = s.game.endDay;
			newBtn.disabled = false;
			newBtn.addEventListener("click", () => {
				onDecision({ type: "skip" });
			});
		}
	}
}

/**
 * Gets the display name for a task, adding context on weekends.
 * Adds time qualifier for time-specific tasks and point cost for expensive tasks.
 */
function getTaskDisplayName(task: TaskDisplay, weekend: boolean): string {
	const s = strings();
	let name = task.name;

	if (weekend) {
		// Add time qualifier for tasks limited to specific time blocks
		if (
			task.availableBlocks.length === 1 ||
			(task.availableBlocks.length === 2 &&
				!task.availableBlocks.includes("afternoon"))
		) {
			// Single block or morning+evening (like shower) - show primary block
			const block = task.availableBlocks[0];
			if (block) {
				name = s.game.taskWithTime(name, block);
			}
		}

		// Add point cost for expensive tasks
		if (task.weekendCost > 1) {
			name = s.game.taskWithCost(name, task.weekendCost);
		}
	}

	return name;
}
