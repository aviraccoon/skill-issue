import { checkPhone } from "../actions/phone";
import { attemptTask, selectTask } from "../actions/tasks";
import { endWeekendDay, skipTimeBlock } from "../actions/time";
import { type GameState, isWeekend, type Task, TIME_BLOCKS } from "../state";
import type { Store } from "../store";
import { getDogUrgency, URGENCY_DISPLAY } from "../systems/dog";
import { getEvolvedDescription } from "../systems/evolution";
import { seededShuffle } from "../utils/random";
import appStyles from "./App.module.css";
import { renderDaySummary } from "./DaySummary";
import { renderNightChoice } from "./NightChoice";
import panelStyles from "./Panel.module.css";
import taskStyles from "./Task.module.css";
import { renderWeekComplete } from "./WeekComplete";

/** Re-export styles for use in actions that need animation class references. */
export { taskStyles, panelStyles };

/** Tracks whether we've initialized the DOM structure for game screen. */
let gameInitialized = false;

/**
 * Main render function. Routes between screens based on state.
 */
export function renderApp(store: Store<GameState>) {
	const state = store.getState();
	const app = document.getElementById("app");
	if (!app) return;

	switch (state.screen) {
		case "nightChoice":
			gameInitialized = false;
			renderNightChoice(store, state, app);
			break;
		case "daySummary":
			gameInitialized = false;
			renderDaySummary(store, state, app);
			break;
		case "weekComplete":
			gameInitialized = false;
			renderWeekComplete(store, state, app);
			break;
		default:
			renderGameScreen(store, state, app);
			break;
	}
}

/** Renders the main game screen. */
function renderGameScreen(
	store: Store<GameState>,
	state: GameState,
	app: HTMLElement,
) {
	// Create structure on first render of game screen
	if (!gameInitialized) {
		app.innerHTML = createAppStructure(state);
		gameInitialized = true;
	}

	const weekend = isWeekend(state);

	// Set time-based theme (use evening for weekend default)
	app.dataset.time = weekend ? "evening" : state.timeBlock;

	// Update content
	renderHeader(state);
	renderSlots(state);
	renderTaskList(state, store);
	renderTaskPanel(state, store);
	renderFooter(state, store);
}

/** Creates the initial HTML structure for the app. */
function createAppStructure(state: GameState): string {
	const weekend = isWeekend(state);

	return `
		<header class="${appStyles.header}">
			<h1 class="${appStyles.title}"></h1>
			<div class="${appStyles.timeBlock}"></div>
		</header>

		<main class="${appStyles.main}">
			<section class="${appStyles.taskListContainer}">
				<div class="${appStyles.slots}" ${weekend ? 'data-weekend="true"' : ""}>
					${
						weekend
							? `<span class="${appStyles.points}"></span>`
							: `
					<span class="${appStyles.slot}"></span>
					<span class="${appStyles.slot}"></span>
					<span class="${appStyles.slot}"></span>
					`
					}
				</div>
				<ul class="${appStyles.taskList}"></ul>
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

/** Updates the header with current day and time block. */
function renderHeader(state: GameState) {
	const title = document.querySelector(`.${appStyles.title}`);
	const timeBlockEl = document.querySelector(`.${appStyles.timeBlock}`);
	const weekend = isWeekend(state);

	if (title) title.textContent = state.day;
	if (timeBlockEl) {
		// Hide time block on weekends
		timeBlockEl.textContent = weekend ? "" : state.timeBlock;
	}
}

/** Updates the action slot or point indicators. */
function renderSlots(state: GameState) {
	const weekend = isWeekend(state);
	const slotsContainer = document.querySelector(`.${appStyles.slots}`);

	if (weekend) {
		// Weekend: show remaining points
		const pointsEl = document.querySelector(`.${appStyles.points}`);
		if (pointsEl) {
			pointsEl.textContent = `${state.weekendPointsRemaining} points`;
		}
	} else if (state.inExtendedNight) {
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
		const used = 3 - state.slotsRemaining;

		currentSlots.forEach((slot, i) => {
			slot.classList.toggle(appStyles.slotUsed, i < used);
		});
	}
}

/** Renders the list of available tasks. */
function renderTaskList(state: GameState, store: Store<GameState>) {
	const list = document.querySelector(`.${appStyles.taskList}`);
	if (!list) return;

	const weekend = isWeekend(state);

	// Weekend: show all tasks. Weekday: filter by time block.
	let availableTasks = weekend
		? state.tasks
		: state.tasks.filter((task) =>
				task.availableBlocks.includes(state.timeBlock),
			);

	// Shuffle based on seed + day for variety (order changes each day)
	availableTasks = seededShuffle(
		availableTasks,
		state.runSeed + state.dayIndex,
	);

	list.innerHTML = "";

	for (const task of availableTasks) {
		const button = document.createElement("button");
		button.className = taskStyles.task;
		button.textContent = getTaskDisplayName(task, weekend);
		button.dataset.id = task.id;

		if (task.id === state.selectedTaskId) {
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
function renderTaskPanel(state: GameState, store: Store<GameState>) {
	const panel = document.querySelector(`.${panelStyles.panel}`);
	if (!panel) return;

	const weekend = isWeekend(state);
	const selectedTask = state.tasks.find((t) => t.id === state.selectedTaskId);

	// Check if period is exhausted (no more actions possible)
	const periodExhausted = weekend
		? state.weekendPointsRemaining <= 0
		: state.slotsRemaining <= 0;

	// Build continue button HTML if period is exhausted
	let continueButtonHtml = "";
	if (periodExhausted) {
		const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
		const nextBlock = TIME_BLOCKS[currentIndex + 1];
		const buttonText = weekend
			? "End day"
			: nextBlock
				? `Continue to ${nextBlock}`
				: "End day";
		continueButtonHtml = `<button class="${panelStyles.continueBtn}">${buttonText}</button>`;
	}

	if (!selectedTask) {
		panel.innerHTML = `
			<p class="${panelStyles.empty}">Select a task</p>
			${continueButtonHtml}
		`;
		attachContinueHandler(panel, store, weekend);
		return;
	}

	const cost = selectedTask.weekendCost ?? 1;

	// Check if can attempt based on day type
	let canAttempt: boolean;
	if (weekend) {
		canAttempt =
			state.weekendPointsRemaining >= cost && !selectedTask.succeededToday;
	} else {
		canAttempt = state.slotsRemaining > 0 && !selectedTask.succeededToday;
	}

	// Show cost on weekends if > 1
	const costDisplay =
		weekend && cost > 1
			? `<p class="${panelStyles.cost}">${cost} points</p>`
			: "";

	// Show urgency for Walk Dog
	let urgencyDisplay = "";
	if (selectedTask.id === "walk-dog" && !selectedTask.succeededToday) {
		const urgency = getDogUrgency(state);
		if (urgency !== "normal") {
			urgencyDisplay = `<p class="${panelStyles.urgency}" data-urgency="${urgency}">${URGENCY_DISPLAY[urgency]}</p>`;
		}
	}

	const displayName = getEvolvedDescription(selectedTask, state.runSeed);

	panel.innerHTML = `
		<p class="${panelStyles.taskName}">${displayName}</p>
		<p class="${panelStyles.stats}">
			Failed ${selectedTask.failureCount} time${selectedTask.failureCount === 1 ? "" : "s"} this week
		</p>
		${urgencyDisplay}
		${costDisplay}
		<button class="${panelStyles.attemptBtn}" ${canAttempt ? "" : "disabled"}>
			${selectedTask.succeededToday ? "Done" : "Attempt"}
		</button>
		${continueButtonHtml}
	`;

	const attemptBtn = panel.querySelector(`.${panelStyles.attemptBtn}`);
	if (attemptBtn && canAttempt) {
		attemptBtn.addEventListener("click", () => {
			attemptTask(store, selectedTask.id);
		});
	}

	attachContinueHandler(panel, store, weekend);
}

/** Attaches click handler to continue button if present. */
function attachContinueHandler(
	panel: Element,
	store: Store<GameState>,
	weekend: boolean,
) {
	panel
		.querySelector(`.${panelStyles.continueBtn}`)
		?.addEventListener("click", () => {
			if (weekend) {
				endWeekendDay(store);
			} else {
				skipTimeBlock(store);
			}
		});
}

/** Renders the footer with skip/end day and phone buttons. */
function renderFooter(state: GameState, store: Store<GameState>) {
	const skipBtn = document.querySelector(`.${appStyles.skipBtn}`);
	const phoneBtn = document.querySelector(`.${appStyles.phoneBtn}`);

	// Set up phone button (scroll trap)
	if (phoneBtn) {
		const newPhoneBtn = phoneBtn.cloneNode(true) as HTMLButtonElement;
		phoneBtn.parentNode?.replaceChild(newPhoneBtn, phoneBtn);
		newPhoneBtn.addEventListener("click", () => {
			checkPhone(store);
		});
	}

	if (!skipBtn) return;

	const weekend = isWeekend(state);

	// Remove old listeners by cloning
	const newBtn = skipBtn.cloneNode(true) as HTMLButtonElement;
	skipBtn.parentNode?.replaceChild(newBtn, skipBtn);

	if (weekend) {
		// Weekend: single "End day" button
		newBtn.textContent = "End day";
		newBtn.disabled = false;
		newBtn.addEventListener("click", () => {
			endWeekendDay(store);
		});
	} else {
		// Weekday: skip to next block or end day
		const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
		const nextBlock = TIME_BLOCKS[currentIndex + 1];

		if (nextBlock) {
			newBtn.textContent = `Skip to ${nextBlock}`;
			newBtn.disabled = false;
			newBtn.addEventListener("click", () => {
				skipTimeBlock(store);
			});
		} else {
			newBtn.textContent = "End day";
			newBtn.disabled = false;
			newBtn.addEventListener("click", () => {
				skipTimeBlock(store);
			});
		}
	}
}

/**
 * Gets the display name for a task, adding context on weekends.
 * Adds time qualifier for time-specific tasks and point cost for expensive tasks.
 */
function getTaskDisplayName(task: Task, weekend: boolean): string {
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
				const qualifier = block.charAt(0).toUpperCase() + block.slice(1);
				name = `${name} (${qualifier})`;
			}
		}

		// Add point cost for expensive tasks
		const cost = task.weekendCost ?? 1;
		if (cost > 1) {
			name = `${name} [${cost}pt]`;
		}
	}

	return name;
}
