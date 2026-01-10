import type { GameState } from "../state";
import { initialState } from "../state";
import type { Store } from "../store";
import styles from "./DevTools.module.css";

const DEV_TOOLS_STORAGE_KEY = "skill-issue-devtools-open";

/**
 * Initializes the dev tools panel if DEV_TOOLS env var is set.
 * Shows hidden state (energy, momentum) and allows state manipulation.
 */
export function initDevTools(store: Store<GameState>) {
	const devTools = document.createElement("div");
	devTools.className = styles.container;
	devTools.id = "dev-tools";

	// Restore collapsed state from localStorage
	const isCollapsed =
		localStorage.getItem(DEV_TOOLS_STORAGE_KEY) === "collapsed";
	if (isCollapsed) {
		devTools.classList.add(styles.collapsed);
	}

	devTools.innerHTML = `
		<div class="${styles.header}">
			<span class="${styles.title}">Dev Tools</span>
			<span class="${styles.toggle}">${isCollapsed ? "+" : "-"}</span>
		</div>
		<div class="${styles.content}">
			<div class="${styles.section}" id="dev-state"></div>
			<div class="${styles.controls}">
				<button class="${styles.btn}" data-action="reset">Reset State</button>
				<button class="${styles.btn}" data-action="energy-up">Energy +</button>
				<button class="${styles.btn}" data-action="energy-down">Energy -</button>
				<button class="${styles.btn}" data-action="momentum-up">Momentum +</button>
				<button class="${styles.btn}" data-action="momentum-down">Momentum -</button>
				<button class="${styles.btn}" data-action="skip-day">Skip Day</button>
			</div>
		</div>
	`;

	document.body.appendChild(devTools);

	// Toggle collapse
	const header = devTools.querySelector(`.${styles.header}`);
	header?.addEventListener("click", () => {
		devTools.classList.toggle(styles.collapsed);
		const toggle = devTools.querySelector(`.${styles.toggle}`);
		const collapsed = devTools.classList.contains(styles.collapsed);
		if (toggle) toggle.textContent = collapsed ? "+" : "-";
		localStorage.setItem(
			DEV_TOOLS_STORAGE_KEY,
			collapsed ? "collapsed" : "open",
		);
	});

	// Control buttons
	devTools.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const action = target.dataset.action;
		if (!action) return;

		switch (action) {
			case "reset":
				for (const key of Object.keys(initialState)) {
					store.set(
						key as keyof GameState,
						initialState[key as keyof GameState],
					);
				}
				break;
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
			case "skip-day":
				store.update("dayIndex", (d) => Math.min(d + 1, 6));
				break;
		}
	});

	// Initial render and subscribe to updates
	renderDevState(store.getState());
	store.subscribe((state) => renderDevState(state));
}

/** Renders the current state in the dev panel. */
function renderDevState(state: GameState) {
	const container = document.getElementById("dev-state");
	if (!container) return;

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
			<span class="${styles.value} ${styles.valueNumber}">${state.slotsRemaining}/3</span>
		</div>

		<h4>Hidden State</h4>
		<div class="${styles.row}">
			<span class="${styles.key}">Energy</span>
			<span class="${styles.value} ${styles.valueHidden}">${(state.energy * 100).toFixed(0)}%</span>
		</div>
		<div class="${styles.row}">
			<span class="${styles.key}">Momentum</span>
			<span class="${styles.value} ${styles.valueHidden}">${(state.momentum * 100).toFixed(0)}%</span>
		</div>

		<h4>Selected Task</h4>
		<div class="${styles.row}">
			<span class="${styles.key}">Task</span>
			<span class="${styles.value}">${state.selectedTaskId || "(none)"}</span>
		</div>
	`;
}
