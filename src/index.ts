import "./styles/base.css";
import "./styles/themes.css";
import { renderApp } from "./components/App";
import { initDevTools } from "./components/DevTools";
import { initThemeSwitcher } from "./components/ThemeSwitcher";
import type { GameState } from "./state";
import { createStore } from "./store";
import { loadGame, saveGame } from "./systems/persistence";

// Initialize store with saved state (or initial if no save)
const store = createStore<GameState>(loadGame());

// Initialize theme switcher
initThemeSwitcher();

// Initialize dev tools if enabled
initDevToolsIfEnabled();

// Initial render
renderApp(store);

// Subscribe to state changes for re-renders and auto-save
store.subscribe((state) => {
	renderApp(store);
	saveGame(state);
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
