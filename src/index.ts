import "./styles/base.css";
import "./styles/themes.css";
import { renderApp } from "./components/App";
import { initDevTools, simulateDay } from "./components/DevTools";
import { initThemeSwitcher } from "./components/ThemeSwitcher";
import { setLocale } from "./i18n";
import type { GameState } from "./state";
import { createStore } from "./store";
import { clearSave, loadGame, saveGame } from "./systems/persistence";

// Initialize locale from query param or browser preference
initLocale();

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

/** Initializes locale from query param (?lang=cs) or browser preference. */
function initLocale() {
	const urlParams = new URLSearchParams(window.location.search);
	const langParam = urlParams.get("lang");

	// Query param is authoritative
	if (langParam === "cs" || langParam === "en") {
		setLocale(langParam);
		return;
	}

	// Fall back to browser language
	const browserLang = navigator.language.split("-")[0];
	if (browserLang === "cs") {
		setLocale("cs");
	}
}

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
