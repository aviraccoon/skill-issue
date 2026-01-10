import { attemptTask, selectTask } from "../actions/tasks";
import { skipTimeBlock } from "../actions/time";
import type { GameState } from "../state";
import { TIME_BLOCKS } from "../state";
import type { Store } from "../store";
import appStyles from "./App.module.css";
import panelStyles from "./Panel.module.css";
import taskStyles from "./Task.module.css";

/** Re-export styles for use in actions that need animation class references. */
export { taskStyles, panelStyles };

/** Tracks whether we've initialized the DOM structure. */
let initialized = false;

/**
 * Main render function. Creates DOM structure on first call,
 * then updates based on current state.
 */
export function renderApp(store: Store<GameState>) {
	const state = store.getState();
	const app = document.getElementById("app");
	if (!app) return;

	// Create structure on first render
	if (!initialized) {
		app.innerHTML = createAppStructure();
		initialized = true;
	}

	// Set time-based theme
	app.dataset.time = state.timeBlock;

	// Update content
	renderHeader(state);
	renderSlots(state);
	renderTaskList(state, store);
	renderTaskPanel(state, store);
	renderFooter(state, store);
}

/** Creates the initial HTML structure for the app. */
function createAppStructure(): string {
	return `
		<header class="${appStyles.header}">
			<h1 class="${appStyles.title}"></h1>
			<div class="${appStyles.timeBlock}"></div>
		</header>

		<main class="${appStyles.main}">
			<section class="${appStyles.taskListContainer}">
				<div class="${appStyles.slots}">
					<span class="${appStyles.slot}"></span>
					<span class="${appStyles.slot}"></span>
					<span class="${appStyles.slot}"></span>
				</div>
				<ul class="${appStyles.taskList}"></ul>
			</section>

			<aside class="${panelStyles.panel}">
				<p class="${panelStyles.empty}">Select a task</p>
			</aside>
		</main>

		<footer class="${appStyles.footer}">
			<button class="${appStyles.skipBtn}">Skip to Afternoon</button>
		</footer>
	`;
}

/** Updates the header with current day and time block. */
function renderHeader(state: GameState) {
	const title = document.querySelector(`.${appStyles.title}`);
	const timeBlock = document.querySelector(`.${appStyles.timeBlock}`);

	if (title) title.textContent = state.day;
	if (timeBlock) timeBlock.textContent = state.timeBlock;
}

/** Updates the action slot indicators. */
function renderSlots(state: GameState) {
	const slots = document.querySelectorAll(`.${appStyles.slot}`);
	const used = 3 - state.slotsRemaining;

	slots.forEach((slot, i) => {
		slot.classList.toggle(appStyles.slotUsed, i < used);
	});
}

/** Renders the list of available tasks for current time block. */
function renderTaskList(state: GameState, store: Store<GameState>) {
	const list = document.querySelector(`.${appStyles.taskList}`);
	if (!list) return;

	// Filter tasks available in current time block
	const availableTasks = state.tasks.filter((task) =>
		task.availableBlocks.includes(state.timeBlock),
	);

	list.innerHTML = "";

	for (const task of availableTasks) {
		const button = document.createElement("button");
		button.className = taskStyles.task;
		button.textContent = task.name;
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

	const selectedTask = state.tasks.find((t) => t.id === state.selectedTaskId);

	if (!selectedTask) {
		panel.innerHTML = `<p class="${panelStyles.empty}">Select a task</p>`;
		return;
	}

	const canAttempt = state.slotsRemaining > 0 && !selectedTask.succeededToday;

	panel.innerHTML = `
		<p class="${panelStyles.taskName}">${selectedTask.name}</p>
		<p class="${panelStyles.stats}">
			Failed ${selectedTask.failureCount} time${selectedTask.failureCount === 1 ? "" : "s"} this week
		</p>
		<button class="${panelStyles.attemptBtn}" ${canAttempt ? "" : "disabled"}>
			${selectedTask.succeededToday ? "Done" : "Attempt"}
		</button>
	`;

	const attemptBtn = panel.querySelector(`.${panelStyles.attemptBtn}`);
	if (attemptBtn && canAttempt) {
		attemptBtn.addEventListener("click", () => {
			attemptTask(store, selectedTask.id);
		});
	}
}

/** Renders the footer with skip button. */
function renderFooter(state: GameState, store: Store<GameState>) {
	const skipBtn = document.querySelector(`.${appStyles.skipBtn}`);
	if (!skipBtn) return;

	const currentIndex = TIME_BLOCKS.indexOf(state.timeBlock);
	const nextBlock = TIME_BLOCKS[currentIndex + 1];

	if (nextBlock) {
		skipBtn.textContent = `Skip to ${nextBlock}`;
		(skipBtn as HTMLButtonElement).disabled = false;

		// Remove old listeners by cloning
		const newBtn = skipBtn.cloneNode(true) as HTMLButtonElement;
		skipBtn.parentNode?.replaceChild(newBtn, skipBtn);

		newBtn.addEventListener("click", () => {
			skipTimeBlock(store);
		});
	} else {
		skipBtn.textContent = "End day";
		// TODO: implement day transition
	}
}
