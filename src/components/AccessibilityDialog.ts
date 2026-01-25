import { strings } from "../i18n";
import styles from "./AccessibilityDialog.module.css";

/**
 * Creates and returns the accessibility dialog element.
 * Uses native <dialog> element for proper modal behavior.
 */
export function createAccessibilityDialog(): HTMLDialogElement {
	const dialog = document.createElement("dialog");
	dialog.id = "a11y-dialog";
	dialog.className = styles.dialog;

	// Close on backdrop click
	dialog.addEventListener("click", (e) => {
		if (e.target === dialog) {
			dialog.close();
		}
	});

	return dialog;
}

/**
 * Renders the accessibility dialog content.
 * Called each time the dialog opens to ensure correct language.
 */
function renderAccessibilityContent(dialog: HTMLDialogElement) {
	const s = strings();

	dialog.innerHTML = `
		<div class="${styles.header}">
			<h2 class="${styles.title}">${s.a11yStatement.title}</h2>
			<button class="btn btn-ghost ${styles.closeBtn}" aria-label="${s.a11yStatement.close}">&times;</button>
		</div>
		<div class="${styles.content}">
			<div class="${styles.section}">
				<div class="${styles.sectionTitle}">${s.a11yStatement.supportTitle}</div>
				<div class="${styles.row}">
					<span class="${styles.label}">${s.a11yStatement.screenReaders}</span>
					<span class="${styles.value} ${styles.supported}">${s.a11yStatement.screenReadersValue}</span>
				</div>
				<div class="${styles.row}">
					<span class="${styles.label}">${s.a11yStatement.keyboard}</span>
					<span class="${styles.value} ${styles.supported}">${s.a11yStatement.keyboardValue}</span>
				</div>
				<div class="${styles.row}">
					<span class="${styles.label}">${s.a11yStatement.reducedMotion}</span>
					<span class="${styles.value} ${styles.supported}">${s.a11yStatement.reducedMotionValue}</span>
				</div>
			</div>

			<div class="${styles.section}">
				<div class="${styles.sectionTitle}">${s.a11yStatement.controlsTitle}</div>
				<div class="${styles.keys}">
					<span class="${styles.key}"><kbd>Tab</kbd> ${s.a11yStatement.controlTab}</span>
					<span class="${styles.key}"><kbd>&uarr;</kbd> <kbd>&darr;</kbd> ${s.a11yStatement.controlUpDown}</span>
					<span class="${styles.key}"><kbd>&rarr;</kbd> / <kbd>Enter</kbd> ${s.a11yStatement.controlRightEnter}</span>
					<span class="${styles.key}"><kbd>&larr;</kbd> / <kbd>Esc</kbd> ${s.a11yStatement.controlLeftEsc}</span>
					<span class="${styles.key}"><kbd>Enter</kbd> / <kbd>Space</kbd> ${s.a11yStatement.controlActivate}</span>
					<span class="${styles.key}"><kbd>Esc</kbd> ${s.a11yStatement.controlEscape}</span>
				</div>
			</div>

			<div class="${styles.section}">
				<div class="${styles.sectionTitle}">${s.a11yStatement.aboutTitle}</div>
				<div class="${styles.row}">
					<span class="${styles.label}">${s.a11yStatement.unreliableClicks}</span>
					<span class="${styles.value}">${s.a11yStatement.unreliableClicksValue}</span>
				</div>
				<div class="${styles.row}">
					<span class="${styles.label}">${s.a11yStatement.silentFailures}</span>
					<span class="${styles.value}">${s.a11yStatement.silentFailuresValue}</span>
				</div>
				<div class="${styles.row}">
					<span class="${styles.label}">${s.a11yStatement.hiddenState}</span>
					<span class="${styles.value}">${s.a11yStatement.hiddenStateValue}</span>
				</div>
			</div>

			<p class="${styles.note}">${s.a11yStatement.contact}</p>
		</div>
	`;

	// Close button handler
	dialog.querySelector(`.${styles.closeBtn}`)?.addEventListener("click", () => {
		dialog.close();
	});
}

/**
 * Opens the accessibility dialog.
 * Re-renders content each time to reflect current language.
 */
export function openAccessibilityDialog() {
	const dialog = document.getElementById("a11y-dialog") as HTMLDialogElement;
	if (dialog) {
		renderAccessibilityContent(dialog);
		dialog.showModal();
	}
}
