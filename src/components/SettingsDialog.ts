import { getLocale, setLocale, strings } from "../i18n";
import { initTooltips } from "../utils/tooltip";
import { openAccessibilityDialog } from "./AccessibilityDialog";
import styles from "./SettingsDialog.module.css";
import {
	createThemeButton,
	getTheme,
	getThemeActiveClass,
	getThemeButtonsContainerClass,
	setTheme,
	THEMES,
} from "./ThemeSwitcher";

/** Callback to re-render app after locale change. */
let onLocaleChange: (() => void) | null = null;

/**
 * Creates and returns the settings dialog element.
 * Uses native <dialog> element for proper modal behavior.
 */
export function createSettingsDialog(
	onRerender?: () => void,
): HTMLDialogElement {
	onLocaleChange = onRerender ?? null;
	const dialog = document.createElement("dialog");
	dialog.id = "settings-dialog";
	dialog.className = styles.dialog;

	renderSettingsContent(dialog);

	// Close on backdrop click
	dialog.addEventListener("click", (e) => {
		if (e.target === dialog) {
			dialog.close();
		}
	});

	return dialog;
}

/**
 * Renders the settings dialog content.
 * Separate function so we can re-render when language changes.
 */
function renderSettingsContent(dialog: HTMLDialogElement) {
	const s = strings();
	const currentLocale = getLocale();
	const currentTheme = getTheme();

	dialog.innerHTML = `
		<div class="${styles.header}">
			<h2 class="${styles.title}">${s.settings.title}</h2>
			<button class="btn btn-ghost ${styles.closeBtn}" aria-label="${s.settings.close}">&times;</button>
		</div>
		<div class="${styles.content}">
			<div class="${styles.row}">
				<span class="${styles.label}">${s.settings.theme}</span>
				<div class="${getThemeButtonsContainerClass()}" role="radiogroup" aria-label="${s.settings.theme}"></div>
			</div>
			<div class="${styles.row}">
				<span class="${styles.label}">${s.settings.language}</span>
				<div class="${styles.langButtons}">
					<button
						class="btn btn-secondary ${styles.langBtn} ${currentLocale === "en" ? styles.langBtnActive : ""}"
						data-lang="en"
					>English</button>
					<button
						class="btn btn-secondary ${styles.langBtn} ${currentLocale === "cs" ? styles.langBtnActive : ""}"
						data-lang="cs"
					>Čeština</button>
				</div>
			</div>
			<div class="${styles.row}">
				<button class="btn btn-secondary ${styles.a11yBtn}">${s.settings.accessibility}</button>
			</div>
		</div>
	`;

	// Add theme buttons
	const themeContainer = dialog.querySelector(
		`.${getThemeButtonsContainerClass()}`,
	);
	if (themeContainer) {
		for (const theme of THEMES) {
			const btn = createThemeButton(theme, theme === currentTheme);
			btn.addEventListener("click", () => {
				setTheme(theme);
				// Update active states
				themeContainer.querySelectorAll("button").forEach((b) => {
					const isActive = (b as HTMLElement).dataset.theme === theme;
					b.classList.toggle(getThemeActiveClass(), isActive);
					b.setAttribute("aria-checked", String(isActive));
				});
			});
			themeContainer.appendChild(btn);
		}
		initTooltips(themeContainer);
	}

	// Close button handler
	dialog.querySelector(`.${styles.closeBtn}`)?.addEventListener("click", () => {
		dialog.close();
	});

	// Language button handlers
	dialog.querySelectorAll(`.${styles.langBtn}`).forEach((btn) => {
		btn.addEventListener("click", () => {
			const lang = (btn as HTMLElement).dataset.lang;
			if (lang === "en" || lang === "cs") {
				setLocale(lang);
				// Re-render dialog content with new language
				renderSettingsContent(dialog);
				// Re-render the app behind the dialog
				onLocaleChange?.();
			}
		});
	});

	// Accessibility button handler
	dialog.querySelector(`.${styles.a11yBtn}`)?.addEventListener("click", () => {
		dialog.close();
		openAccessibilityDialog();
	});
}

/**
 * Opens the settings dialog.
 */
export function openSettingsDialog() {
	const dialog = document.getElementById(
		"settings-dialog",
	) as HTMLDialogElement;
	dialog?.showModal();
}
