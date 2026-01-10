import "./styles/base.css";
import "./styles/themes.css";
import { renderApp } from "./components/App";
import { initDevTools } from "./components/DevTools";
import { initThemeSwitcher } from "./components/ThemeSwitcher";
import { type GameState, initialState } from "./state";
import { createStore } from "./store";

// Initialize store with starting state
const store = createStore<GameState>(initialState);

// Initialize theme switcher
initThemeSwitcher();

// Initialize dev tools if enabled
initDevToolsIfEnabled();

// Initial render
renderApp(store);

// Subscribe to state changes for re-renders
store.subscribe(() => renderApp(store));

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
