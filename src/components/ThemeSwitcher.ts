import styles from "./ThemeSwitcher.module.css";

const THEME_STORAGE_KEY = "skill-issue-theme";

export const THEMES = [
	"hacker",
	"cozy",
	"vapor",
	"notion",
	"todoist",
	"things",
	"linear",
	"paper",
	"win95",
] as const;
export type Theme = (typeof THEMES)[number];

/** Maps theme names to their CSS module class. */
const themeClasses: Record<Theme, string> = {
	hacker: styles.hacker,
	cozy: styles.cozy,
	vapor: styles.vapor,
	notion: styles.notion,
	todoist: styles.todoist,
	things: styles.things,
	linear: styles.linear,
	paper: styles.paper,
	win95: styles.win95,
};

/**
 * Initializes the theme from localStorage.
 * Call this early in app startup to apply saved theme.
 */
export function initTheme() {
	const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
	applyTheme(savedTheme || "vapor");
}

/**
 * Returns the current theme.
 */
export function getTheme(): Theme {
	return (document.documentElement.dataset.theme as Theme) || "vapor";
}

/**
 * Sets the active theme and persists to localStorage.
 */
export function setTheme(theme: Theme) {
	applyTheme(theme);
	localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Applies a theme to the document without persisting.
 */
function applyTheme(theme: Theme) {
	document.documentElement.dataset.theme = theme;
}

/** Display names for themes. */
const themeNames: Record<Theme, string> = {
	hacker: "Hacker",
	cozy: "Cozy",
	vapor: "Vaporwave",
	notion: "Notion",
	todoist: "Todoist",
	things: "Things",
	linear: "Linear",
	paper: "Paper",
	win95: "Windows 95",
};

/**
 * Creates a theme button element for use in settings.
 */
export function createThemeButton(
	theme: Theme,
	isActive: boolean,
): HTMLButtonElement {
	const btn = document.createElement("button");
	btn.className = `${styles.btn} ${themeClasses[theme]}`;
	if (isActive) {
		btn.classList.add(styles.active);
	}
	const displayName = themeNames[theme];
	btn.dataset.theme = theme;
	btn.dataset.tooltip = displayName;
	btn.setAttribute("role", "radio");
	btn.setAttribute("aria-checked", String(isActive));
	btn.setAttribute("aria-label", `${displayName} theme`);
	return btn;
}

/**
 * Returns the CSS class for the theme buttons container.
 */
export function getThemeButtonsContainerClass(): string {
	return styles.themeButtons;
}

/**
 * Returns the CSS class for the active state.
 */
export function getThemeActiveClass(): string {
	return styles.active;
}
