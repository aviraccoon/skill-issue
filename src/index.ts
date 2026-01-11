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

/** Fetches config and initializes dev tools if enabled. */
async function initDevToolsIfEnabled() {
	try {
		const res = await fetch("/api/config");
		const config = await res.json();
		if (config.devTools) {
			initDevTools(store);
		}
	} catch {
		// In production or if config fails, skip dev tools
	}
}
