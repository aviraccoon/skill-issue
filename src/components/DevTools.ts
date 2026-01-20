import type { GameState, Task } from "../state";
import { createInitialState, isWeekend, TIME_BLOCKS } from "../state";
import type { Store } from "../store";
import {
	calculateExtendedNightSlots,
	getAllNighterPenalty,
} from "../systems/allnighter";
import {
	getEnergyDecayPerBlock,
	getScrollTrapEnergyCost,
} from "../systems/energy";
import { getFriendRescueChance } from "../systems/friend";
import {
	getMomentumDecayPerBlock,
	getMomentumFailurePenalty,
	getMomentumSuccessBonus,
	getScrollTrapMomentumRange,
} from "../systems/momentum";
import { clearSave } from "../systems/persistence";
import {
	calculateSuccessProbability,
	getEnergyModifier,
	getMomentumModifier,
	getTimeModifier,
	getWeekendWorkModifier,
} from "../systems/probability";
import { calculateSleepQuality } from "../systems/sleep";
import styles from "./DevTools.module.css";

const DEV_TOOLS_COLLAPSED_KEY = "skill-issue-devtools-collapsed";
const DEV_TOOLS_POS_KEY = "skill-issue-devtools-pos";

/**
 * Initializes the dev tools panel if DEV_TOOLS env var is set.
 * Shows hidden state (energy, momentum) and allows state manipulation.
 * Panel is draggable and remembers position.
 */
export function initDevTools(store: Store<GameState>) {
	const devTools = document.createElement("div");
	devTools.className = styles.container;
	devTools.id = "dev-tools";

	// Restore collapsed state
	const isCollapsed = localStorage.getItem(DEV_TOOLS_COLLAPSED_KEY) === "true";
	if (isCollapsed) {
		devTools.classList.add(styles.collapsed);
	}

	// Restore position
	const savedPos = localStorage.getItem(DEV_TOOLS_POS_KEY);
	if (savedPos) {
		const { x, y } = JSON.parse(savedPos);
		devTools.style.right = "auto";
		devTools.style.bottom = "auto";
		devTools.style.left = `${x}px`;
		devTools.style.top = `${y}px`;
	}

	devTools.innerHTML = `
		<div class="${styles.header}">
			<span class="${styles.title}">Dev</span>
			<div class="${styles.headerRight}">
				<button class="${styles.toggle}" data-action="toggle">${isCollapsed ? "+" : "-"}</button>
			</div>
		</div>
		<div class="${styles.content}">
			<div class="${styles.section}" id="dev-state"></div>
			<div class="${styles.controls}">
				<button class="${styles.btn}" data-action="reset">Reset</button>
				<button class="${styles.btn}" data-action="energy-up">E+</button>
				<button class="${styles.btn}" data-action="energy-down">E-</button>
				<button class="${styles.btn}" data-action="momentum-up">M+</button>
				<button class="${styles.btn}" data-action="momentum-down">M-</button>
				<button class="${styles.btn}" data-action="sim-day">Sim Day</button>
				<button class="${styles.btn} ${styles.btnDanger}" data-action="clear-save">Clear Save</button>
			</div>
		</div>
	`;

	document.body.appendChild(devTools);

	// Dragging
	const header = devTools.querySelector(`.${styles.header}`) as HTMLElement;
	let isDragging = false;
	let dragOffsetX = 0;
	let dragOffsetY = 0;

	header?.addEventListener("mousedown", (e) => {
		if ((e.target as HTMLElement).dataset.action) return; // Don't drag on buttons
		isDragging = true;
		dragOffsetX = e.clientX - devTools.offsetLeft;
		dragOffsetY = e.clientY - devTools.offsetTop;
		devTools.style.right = "auto";
		devTools.style.bottom = "auto";
	});

	document.addEventListener("mousemove", (e) => {
		if (!isDragging) return;
		const x = Math.max(
			0,
			Math.min(
				e.clientX - dragOffsetX,
				window.innerWidth - devTools.offsetWidth,
			),
		);
		const y = Math.max(
			0,
			Math.min(
				e.clientY - dragOffsetY,
				window.innerHeight - devTools.offsetHeight,
			),
		);
		devTools.style.left = `${x}px`;
		devTools.style.top = `${y}px`;
	});

	document.addEventListener("mouseup", () => {
		if (isDragging) {
			isDragging = false;
			localStorage.setItem(
				DEV_TOOLS_POS_KEY,
				JSON.stringify({ x: devTools.offsetLeft, y: devTools.offsetTop }),
			);
		}
	});

	// Control buttons
	devTools.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const action = target.dataset.action;
		if (!action) return;

		switch (action) {
			case "toggle": {
				devTools.classList.toggle(styles.collapsed);
				const collapsed = devTools.classList.contains(styles.collapsed);
				target.textContent = collapsed ? "+" : "-";
				localStorage.setItem(DEV_TOOLS_COLLAPSED_KEY, String(collapsed));
				break;
			}
			case "reset": {
				const fresh = createInitialState();
				for (const key of Object.keys(fresh)) {
					store.set(key as keyof GameState, fresh[key as keyof GameState]);
				}
				break;
			}
			case "energy-up":
				store.update("energy", (e) => Math.min(e + 0.1, 1));
				break;
			case "energy-down":
				store.update("energy", (e) => Math.max(e - 0.1, 0));
				break;
			case "momentum-up":
				store.update("momentum", (m) => Math.min(m + 0.1, 1));
				break;
			case "momentum-down":
				store.update("momentum", (m) => Math.max(m - 0.1, 0));
				break;
			case "sim-day":
				simulateDay(store);
				break;
			case "clear-save":
				clearSave();
				window.location.reload();
				break;
		}
	});

	// Initial render and subscribe to updates
	renderDevState(store.getState());
	store.subscribe((state) => renderDevState(state));
}

/** Formats a multiplier for display (e.g., "×1.1" or "×0.85"). */
function formatModifier(multiplier: number): string {
	return `×${multiplier.toFixed(2)}`;
}

/** Renders the current state in the dev panel. */
function renderDevState(state: GameState) {
	const container = document.getElementById("dev-state");
	if (!container) return;

	// Calculate modifiers for display
	const timeMod = getTimeModifier(state);
	const momentumMod = getMomentumModifier(state.momentum);
	const energyMod = getEnergyModifier(state.energy);

	// Get selected task probability breakdown
	const selectedTask = state.tasks.find((t) => t.id === state.selectedTaskId);
	let probabilitySection = "";
	if (selectedTask) {
		const finalProb = calculateSuccessProbability(selectedTask, state);
		const weekendWorkMod = getWeekendWorkModifier(selectedTask, state);
		const weekendWorkRow =
			weekendWorkMod < 1
				? `
			<div class="${styles.row}">
				<span class="${styles.key}">Weekend Work</span>
				<span class="${styles.valueModifier}" data-positive="false">${formatModifier(weekendWorkMod)}</span>
			</div>`
				: "";
		probabilitySection = `
			<h4>Probability Breakdown</h4>
			<div class="${styles.row}">
				<span class="${styles.key}">Base Rate</span>
				<span class="${styles.valueNumber}">${(selectedTask.baseRate * 100).toFixed(0)}%</span>
			</div>
			<div class="${styles.row}">
				<span class="${styles.key}">Time (${state.timeBlock})</span>
				<span class="${styles.valueModifier}" data-positive="${timeMod >= 1}">${formatModifier(timeMod)}</span>
			</div>
			<div class="${styles.row}">
				<span class="${styles.key}">Momentum</span>
				<span class="${styles.valueModifier}" data-positive="${momentumMod >= 1}">${formatModifier(momentumMod)}</span>
			</div>
			<div class="${styles.row}">
				<span class="${styles.key}">Energy</span>
				<span class="${styles.valueModifier}" data-positive="${energyMod >= 1}">${formatModifier(energyMod)}</span>
			</div>
			${weekendWorkRow}
			<div class="${styles.row} ${styles.rowTotal}">
				<span class="${styles.key}">Final</span>
				<span class="${styles.valueNumber} ${styles.valueLarge}">${(finalProb * 100).toFixed(0)}%</span>
			</div>
		`;
	} else {
		probabilitySection = `
			<h4>Probability Breakdown</h4>
			<div class="${styles.row}">
				<span class="${styles.valueNote}">(select a task)</span>
			</div>
			<div class="${styles.row}">
				<span class="${styles.key}">Time (${state.timeBlock})</span>
				<span class="${styles.valueModifier}" data-positive="${timeMod >= 1}">${formatModifier(timeMod)}</span>
			</div>
			<div class="${styles.row}">
				<span class="${styles.key}">Momentum</span>
				<span class="${styles.valueModifier}" data-positive="${momentumMod >= 1}">${formatModifier(momentumMod)}</span>
			</div>
			<div class="${styles.row}">
				<span class="${styles.key}">Energy</span>
				<span class="${styles.valueModifier}" data-positive="${energyMod >= 1}">${formatModifier(energyMod)}</span>
			</div>
		`;
	}

	// Calculate sleep quality preview
	const sleepMod = calculateSleepQuality(state);
	const successCount = state.tasks.filter((t) => t.succeededToday).length;
	const attemptCount = state.tasks.filter((t) => t.attemptedToday).length;

	container.innerHTML = `
		<h4>Game State</h4>
		<div class="${styles.row}">
			<span class="${styles.key}">Day</span>
			<span class="${styles.value}">${state.day} (${state.dayIndex + 1}/7)</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Time Block</span>
			<span class="${styles.value}">${state.timeBlock}</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Slots</span>
			<span class="${styles.valueNumber}">${state.slotsRemaining}/${state.inExtendedNight ? calculateExtendedNightSlots(state.energy) : 3}${state.inExtendedNight ? " (late)" : ""}</span>
		</div>

		<h4>Hidden State</h4>
		<div class="${styles.row}">
			<span class="${styles.key}">Energy</span>
			<span class="${styles.valueHidden}">${(state.energy * 100).toFixed(0)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Momentum</span>
			<span class="${styles.valueHidden}">${(state.momentum * 100).toFixed(0)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Seed</span>
			<span class="${styles.value}">${state.runSeed}</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Personality</span>
			<span class="${styles.valueHidden}">${state.personality.time} + ${state.personality.social}</span>
		</div>
		<h4>Seeded Values</h4>
		<div class="${styles.row}">
			<span class="${styles.key}">E Decay/Block</span>
			<span class="${styles.valueHidden}">-${(getEnergyDecayPerBlock(state.runSeed) * 100).toFixed(1)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">M Decay/Block</span>
			<span class="${styles.valueHidden}">-${(getMomentumDecayPerBlock(state.runSeed) * 100).toFixed(1)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Success Bonus</span>
			<span class="${styles.valueHidden}">+${(getMomentumSuccessBonus(state.runSeed) * 100).toFixed(1)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Fail Penalty</span>
			<span class="${styles.valueHidden}">-${(getMomentumFailurePenalty(state.runSeed) * 100).toFixed(1)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Scroll M</span>
			<span class="${styles.valueHidden}">-${(getScrollTrapMomentumRange(state.runSeed)[0] * 100).toFixed(0)}-${(getScrollTrapMomentumRange(state.runSeed)[1] * 100).toFixed(0)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Scroll E</span>
			<span class="${styles.valueHidden}">-${(getScrollTrapEnergyCost(state.runSeed) * 100).toFixed(1)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">All-Nighter</span>
			<span class="${styles.valueHidden}">-${(getAllNighterPenalty(state.runSeed) * 100).toFixed(0)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Rescue %</span>
			<span class="${styles.valueHidden}">${(getFriendRescueChance(state.runSeed) * 100).toFixed(0)}%</span>
		</div>

		${probabilitySection}

		<h4>Sleep Preview</h4>
		<div class="${styles.row}">
			<span class="${styles.key}">Tasks</span>
			<span class="${styles.valueNumber}">${successCount}/${attemptCount} succeeded</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Energy</span>
			<span class="${styles.valueModifier}" data-positive="${sleepMod.energy >= 0}">${sleepMod.energy >= 0 ? "+" : ""}${(sleepMod.energy * 100).toFixed(0)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Momentum</span>
			<span class="${styles.valueModifier}" data-positive="${sleepMod.momentum >= 0}">${sleepMod.momentum >= 0 ? "+" : ""}${(sleepMod.momentum * 100).toFixed(0)}%</span>
		</div>
	`;
}

/**
 * Simulates playing through the current day with random actions.
 * Uses real probability system, then triggers day summary.
 */
function simulateDay(store: Store<GameState>) {
	const state = store.getState();
	const weekend = isWeekend(state);

	if (weekend) {
		simulateWeekend(store);
	} else {
		simulateWeekday(store);
	}

	// Show day summary
	store.set("screen", "daySummary");
}

/** Simulates a weekday: 4 time blocks x 3 slots. */
function simulateWeekday(store: Store<GameState>) {
	for (const block of TIME_BLOCKS) {
		store.set("timeBlock", block);

		for (let slot = 0; slot < 3; slot++) {
			simulateAction(store, block);
		}

		// Momentum decay per block
		store.update("momentum", (m) => Math.max(m - 0.02, 0));
	}
}

/** Simulates a weekend: 8 action points. */
function simulateWeekend(store: Store<GameState>) {
	let points = store.getState().weekendPointsRemaining;

	while (points > 0) {
		const state = store.getState();
		const availableTasks = state.tasks.filter(
			(t) => !t.succeededToday && (t.weekendCost ?? 1) <= points,
		);

		// Random action: 20% phone, 60% task, 20% skip
		const roll = Math.random();
		if (roll < 0.2) {
			// Check phone - momentum killer
			store.update("momentum", (m) => Math.max(m - 0.15, 0));
		} else if (roll < 0.8 && availableTasks.length > 0) {
			// Attempt random task
			const task =
				availableTasks[Math.floor(Math.random() * availableTasks.length)];
			if (task) {
				simulateTaskAttempt(store, task);
				points -= task.weekendCost ?? 1;
			}
		}
		// else: do nothing (skip)

		points--;
		store.set("weekendPointsRemaining", Math.max(points, 0));
	}
}

/** Simulates a single action slot. */
function simulateAction(store: Store<GameState>, block: string) {
	const state = store.getState();
	const availableTasks = state.tasks.filter(
		(t) =>
			!t.succeededToday &&
			t.availableBlocks.includes(block as GameState["timeBlock"]),
	);

	// Random action: 20% phone, 60% task, 20% skip
	const roll = Math.random();
	if (roll < 0.2) {
		// Check phone
		store.update("momentum", (m) => Math.max(m - 0.15, 0));
	} else if (roll < 0.8 && availableTasks.length > 0) {
		// Attempt random task
		const task =
			availableTasks[Math.floor(Math.random() * availableTasks.length)];
		if (task) {
			simulateTaskAttempt(store, task);
		}
	}
	// else: do nothing
}

/** Simulates attempting a task with real probability. */
function simulateTaskAttempt(store: Store<GameState>, task: Task) {
	const state = store.getState();
	const probability = calculateSuccessProbability(task, state);
	const succeeded = Math.random() < probability;

	// Update task state
	store.update("tasks", (tasks) =>
		tasks.map((t) => {
			if (t.id !== task.id) return t;
			return {
				...t,
				attemptedToday: true,
				succeededToday: succeeded,
				failureCount: succeeded ? t.failureCount : t.failureCount + 1,
			};
		}),
	);

	// Update momentum
	if (succeeded) {
		store.update("momentum", (m) => Math.min(m + 0.05, 1));

		// Saturday work penalty
		if (
			isWeekend(state) &&
			task.category === "work" &&
			state.day === "saturday"
		) {
			store.update("energy", (e) => Math.max(e - 0.1, 0));
		}
	} else {
		store.update("momentum", (m) => Math.max(m - 0.03, 0));
	}
}
