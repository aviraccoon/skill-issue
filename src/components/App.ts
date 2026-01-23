import { type AttemptCallbacks, selectTask } from "../actions/tasks";
import { type Decision, executeDecision } from "../core/controller";
import {
	type GameScreenInfo,
	getScreenInfo,
	type TaskDisplay,
} from "../core/screenInfo";
import type { GameState } from "../state";
import type { Store } from "../store";
import { capitalize } from "../utils/string";
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
		const result = executeDecision(store, decision, browserAttemptCallbacks);

		// Show phone buzz notification if present
		if (result.phoneBuzzText) {
			showNotification(result.phoneBuzzText);
		}
	};

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
	// Create structure on first render of game screen
	if (!gameInitialized) {
		app.innerHTML = createAppStructure(screenInfo);
		gameInitialized = true;
	}

	// Set time-based theme (use evening for weekend default)
	app.dataset.time = screenInfo.isWeekend ? "evening" : screenInfo.timeBlock;

	// Update content
	renderHeader(screenInfo);
	renderSlots(screenInfo);
	renderTaskList(screenInfo, store);
	renderTaskPanel(screenInfo, onDecision);
	renderFooter(screenInfo, onDecision);
}

/** Creates the initial HTML structure for the app. */
function createAppStructure(screenInfo: GameScreenInfo): string {
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
				<div class="${appStyles.notification}" aria-live="polite"></div>
			</section>

			<aside class="${panelStyles.panel}">
				<p class="${panelStyles.empty}">Select a task</p>
			</aside>
		</main>

		<footer class="${appStyles.footer}">
			<button class="${appStyles.phoneBtn}">Check Phone</button>
			<button class="${appStyles.skipBtn}">Skip to Afternoon</button>
		</footer>
	`;
}

/** Shows a brief notification message (e.g., phone buzz text). */
function showNotification(text: string) {
	const notification = document.querySelector(`.${appStyles.notification}`);
	if (!notification) return;

	notification.textContent = text;
	notification.classList.add(appStyles.notificationVisible);

	// Clear after a few seconds
	setTimeout(() => {
		notification.classList.remove(appStyles.notificationVisible);
	}, 3000);
}

/** Updates the header with current day and time block. */
function renderHeader(screenInfo: GameScreenInfo) {
	const title = document.querySelector(`.${appStyles.title}`);
	const timeBlockEl = document.querySelector(`.${appStyles.timeBlock}`);

	if (title) title.textContent = screenInfo.day;
	if (timeBlockEl) {
		// Hide time block on weekends
		timeBlockEl.textContent = screenInfo.isWeekend ? "" : screenInfo.timeBlock;
	}
}

/** Updates the action slot or point indicators. */
function renderSlots(screenInfo: GameScreenInfo) {
	const slotsContainer = document.querySelector(`.${appStyles.slots}`);

	if (screenInfo.isWeekend) {
		// Weekend: show remaining points
		const pointsEl = document.querySelector(`.${appStyles.points}`);
		if (pointsEl) {
			pointsEl.textContent = `${screenInfo.weekendPointsRemaining} points`;
		}
	} else if (screenInfo.inExtendedNight) {
		// Extended night: hide slot count, just show text
		if (slotsContainer) {
			slotsContainer.innerHTML = `<span class="${appStyles.lateNight}">Late Night</span>`;
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
	const list = document.querySelector(`.${appStyles.taskList}`);
	if (!list) return;

	list.innerHTML = "";

	for (const task of screenInfo.tasks) {
		const button = document.createElement("button");
		button.className = taskStyles.task;
		button.textContent = getTaskDisplayName(task, screenInfo.isWeekend);
		button.dataset.id = task.id;

		if (screenInfo.selectedTask?.id === task.id) {
			button.classList.add(taskStyles.selected);
		}
		if (task.succeededToday) {
			button.classList.add(taskStyles.succeeded);
		}

		button.addEventListener("click", () => {
			selectTask(store, task.id);
		});

		list.appendChild(button);
	}
}

/** Renders the side panel showing selected task details. */
function renderTaskPanel(
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
) {
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
			? "End day"
			: screenInfo.nextTimeBlock
				? `Continue to ${screenInfo.nextTimeBlock}`
				: "End day";
		continueButtonHtml = `<button class="${panelStyles.continueBtn}">${buttonText}</button>`;
	}

	if (!selectedTask) {
		panel.innerHTML = `
			<p class="${panelStyles.empty}">Select a task</p>
			${continueButtonHtml}
		`;
		attachContinueHandler(panel, screenInfo, onDecision);
		return;
	}

	// Show cost on weekends if > 1
	const costDisplay =
		screenInfo.isWeekend && selectedTask.weekendCost > 1
			? `<p class="${panelStyles.cost}">${selectedTask.weekendCost} points</p>`
			: "";

	// Show urgency for Walk Dog
	let urgencyDisplay = "";
	if (selectedTask.urgency) {
		urgencyDisplay = `<p class="${panelStyles.urgency}" data-urgency="${selectedTask.urgency.level}">${selectedTask.urgency.text}</p>`;
	}

	// Show variant option if unlocked
	let variantDisplay = "";
	if (
		selectedTask.variant &&
		selectedTask.canAttempt &&
		!selectedTask.succeededToday
	) {
		variantDisplay = `<button class="${panelStyles.variantBtn}">${selectedTask.variant.name}</button>`;
	}

	panel.innerHTML = `
		<p class="${panelStyles.taskName}">${selectedTask.evolvedName}</p>
		<p class="${panelStyles.stats}">
			Failed ${selectedTask.failureCount} time${selectedTask.failureCount === 1 ? "" : "s"} this week
		</p>
		${urgencyDisplay}
		${costDisplay}
		<button class="${panelStyles.attemptBtn}" ${selectedTask.canAttempt ? "" : "disabled"}>
			${selectedTask.succeededToday ? "Done" : "Attempt"}
		</button>
		${variantDisplay}
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
	const skipBtn = document.querySelector(`.${appStyles.skipBtn}`);
	const phoneBtn = document.querySelector(`.${appStyles.phoneBtn}`);

	// Set up phone button (scroll trap)
	if (phoneBtn) {
		const newPhoneBtn = phoneBtn.cloneNode(true) as HTMLButtonElement;
		phoneBtn.parentNode?.replaceChild(newPhoneBtn, phoneBtn);
		newPhoneBtn.addEventListener("click", () => {
			onDecision({ type: "checkPhone" });
		});
	}

	if (!skipBtn) return;

	// Remove old listeners by cloning
	const newBtn = skipBtn.cloneNode(true) as HTMLButtonElement;
	skipBtn.parentNode?.replaceChild(newBtn, skipBtn);

	if (screenInfo.isWeekend) {
		// Weekend: single "End day" button
		newBtn.textContent = "End day";
		newBtn.disabled = false;
		newBtn.addEventListener("click", () => {
			onDecision({ type: "endDay" });
		});
	} else {
		// Weekday: skip to next block or end day
		if (screenInfo.nextTimeBlock) {
			newBtn.textContent = `Skip to ${screenInfo.nextTimeBlock}`;
			newBtn.disabled = false;
			newBtn.addEventListener("click", () => {
				onDecision({ type: "skip" });
			});
		} else {
			newBtn.textContent = "End day";
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
				name = `${name} (${capitalize(block)})`;
			}
		}

		// Add point cost for expensive tasks
		if (task.weekendCost > 1) {
			name = `${name} [${task.weekendCost}pt]`;
		}
	}

	return name;
}
