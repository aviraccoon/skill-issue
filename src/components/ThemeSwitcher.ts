import styles from "./ThemeSwitcher.module.css";

const THEME_STORAGE_KEY = "skill-issue-theme";
const THEMES = ["light", "dark", "hacker", "cozy", "vapor"] as const;
type Theme = (typeof THEMES)[number];

/** Maps theme names to their CSS module class. */
const themeClasses: Record<Theme, string> = {
	light: styles.light,
	dark: styles.dark,
	hacker: styles.hacker,
	cozy: styles.cozy,
	vapor: styles.vapor,
};

/**
 * Initializes the theme switcher and loads saved theme preference.
 */
export function initThemeSwitcher() {
	const switcher = document.createElement("div");
	switcher.className = styles.switcher;
	switcher.setAttribute("role", "radiogroup");
	switcher.setAttribute("aria-label", "Theme selector");

	for (const theme of THEMES) {
		const btn = document.createElement("button");
		btn.className = `${styles.btn} ${themeClasses[theme]}`;
		btn.dataset.theme = theme;
		btn.setAttribute("role", "radio");
		btn.setAttribute("aria-label", `${theme} theme`);
		btn.title = theme.charAt(0).toUpperCase() + theme.slice(1);
		switcher.appendChild(btn);
	}

	document.body.appendChild(switcher);

	// Load saved theme or default to vapor
	const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
	setTheme(savedTheme || "vapor");

	// Handle theme changes
	switcher.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const theme = target.dataset.theme as Theme | undefined;
		if (theme && THEMES.includes(theme)) {
			setTheme(theme);
		}
	});
}

/** Sets the active theme and persists to localStorage. */
function setTheme(theme: Theme) {
	// Update document
	document.documentElement.dataset.theme = theme;

	// Update active button
	document.querySelectorAll(`.${styles.btn}`).forEach((btn) => {
		const isActive = (btn as HTMLElement).dataset.theme === theme;
		btn.classList.toggle(styles.active, isActive);
		btn.setAttribute("aria-checked", String(isActive));
	});

	// Persist
	localStorage.setItem(THEME_STORAGE_KEY, theme);
}
