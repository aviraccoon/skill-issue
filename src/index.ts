import "./styles/base.css";
import "./styles/themes.css";
import { renderApp } from "./components/App";
import { initDevTools, simulateDay } from "./components/DevTools";
import { initTheme } from "./components/ThemeSwitcher";
import { createInitialState, type GameState } from "./state";
import { createStore } from "./store";
import { clearSave, saveGame } from "./systems/persistence";

// Locale initialized by i18n module (from localStorage, then browser preference)

// Start at splash screen - menu handles loading saved games
const initialState = createInitialState();
initialState.screen = "splash";
const store = createStore<GameState>(initialState);

// Initialize theme from localStorage
initTheme();

// Initialize dev tools if enabled
initDevToolsIfEnabled();

// Initial render
renderApp(store);

// Subscribe to state changes for re-renders and auto-save
store.subscribe((state) => {
	renderApp(store);
	// Only save when in an actual game (not splash/menu)
	if (state.screen !== "splash" && state.screen !== "menu") {
		saveGame(state, state.gameMode);
	}
});

// Global dev shortcuts (work on any screen)
document.addEventListener("keydown", (e) => {
	// Ctrl+Alt+S: Simulate day
	if (e.ctrlKey && e.altKey && e.code === "KeyS") {
		e.preventDefault();
		simulateDay(store);
	}
	// Ctrl+Alt+C: Clear save (with confirmation)
	if (e.ctrlKey && e.altKey && e.code === "KeyC") {
		e.preventDefault();
		if (confirm("Clear save and reload? This cannot be undone.")) {
			clearSave();
			window.location.reload();
		}
	}
});

/** Initializes dev tools if enabled via env var or query param. */
async function initDevToolsIfEnabled() {
	const urlParams = new URLSearchParams(window.location.search);
	const devParam = urlParams.get("dev");

	// Query param is authoritative when present
	if (devParam === "1") {
		initDevTools(store);
		return;
	}
	if (devParam === "0") {
		return;
	}

	// Fall back to env var via dev server config
	try {
		const res = await fetch("/api/config");
		const config = await res.json();
		if (config.devTools) {
			initDevTools(store);
		}
	} catch {
		// In production without query param, skip dev tools
	}
}
