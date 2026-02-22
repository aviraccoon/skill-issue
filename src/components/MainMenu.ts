import type { MenuScreenInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import {
	createNewGame,
	getPatterns,
	loadGame,
	resetRun,
} from "../systems/persistence";
import { createAccessibilityDialog } from "./AccessibilityDialog";
import styles from "./MainMenu.module.css";
import { createSettingsDialog, openSettingsDialog } from "./SettingsDialog";

/** Tracks whether we've created the dialogs. */
let dialogsCreated = false;

/**
 * Renders the main menu screen.
 * Shows Continue (if save exists), New Game, and seed input.
 */
export function renderMainMenu(
	screenInfo: MenuScreenInfo,
	container: HTMLElement,
	store: Store<GameState>,
) {
	const s = strings();
	const patterns = getPatterns();

	// Create dialogs once
	if (!dialogsCreated) {
		// Pass callback to re-render app when locale changes
		document.body.appendChild(
			createSettingsDialog(() => store.setState(store.getState())),
		);
		document.body.appendChild(createAccessibilityDialog());
		dialogsCreated = true;
	}

	// Build main run buttons based on state
	// All string content comes from i18n (trusted source), not user input
	const mainRun = screenInfo.mainRunSummary;
	let mainRunHtml = "";
	if (mainRun?.completed) {
		// Completed week: "Start New Week" (primary) + "View Summary" (secondary)
		mainRunHtml = `
			<button class="btn btn-primary ${styles.startNewWeekBtn}">${s.menu.startNewWeek}</button>
			<button class="btn btn-secondary ${styles.viewSummaryBtn}">${s.menu.viewSummary}</button>
		`;
	} else if (mainRun) {
		// In-progress: "Continue" (primary) + "New Game" (secondary)
		const subtext = s.menu.continueSubtext(mainRun.day, mainRun.timeBlock);
		mainRunHtml = `
			<button class="btn btn-primary ${styles.continueBtn}">
				<span class="${styles.btnLabel}">${s.menu.continue}</span>
				<span class="${styles.btnSubtext}">${subtext}</span>
			</button>
			<button class="btn btn-secondary ${styles.newGameBtn}">${s.menu.newGame}</button>
		`;
	} else {
		// No save: "New Game" only
		mainRunHtml = `
			<button class="btn btn-primary ${styles.newGameBtn}">${s.menu.newGame}</button>
		`;
	}

	// Build seeded run notice if exists
	// All string content comes from i18n (trusted source), not user input
	let seededNoticeHtml = "";
	if (screenInfo.seededRunSummary) {
		const seededText = screenInfo.seededRunSummary.completed
			? s.menu.seededRunComplete(screenInfo.seededRunSummary.seed)
			: s.menu.seededRunNotice(
					screenInfo.seededRunSummary.day,
					screenInfo.seededRunSummary.seed,
				);
		const seededBtnLabel = screenInfo.seededRunSummary.completed
			? s.menu.viewSummary
			: s.menu.continue;
		seededNoticeHtml = `
			<p class="${styles.seededNotice}">
				${seededText}
				<button class="btn btn-secondary ${styles.seededContinueBtn}">${seededBtnLabel}</button>
			</p>
		`;
	}

	container.innerHTML = `
		<div class="${styles.menu}">
			<h1 class="${styles.title}">${s.intro.title}</h1>

			<div class="${styles.actions}">
				${mainRunHtml}
			</div>

			<div class="${styles.seedSection}">
				<label class="${styles.seedLabel}" for="seed-input">${s.menu.seedLabel}</label>
				<div class="${styles.seedRow}">
					<input
						type="text"
						id="seed-input"
						class="${styles.seedInput}"
						placeholder="${s.menu.seedPlaceholder}"
						inputmode="numeric"
						pattern="[0-9]*"
					>
					<button class="btn btn-secondary ${styles.seedBtn}">${s.menu.startSeeded}</button>
				</div>
			</div>

			${seededNoticeHtml}

			<div class="${styles.secondaryActions}">
				${screenInfo.patternsUnlocked ? `<button class="btn btn-secondary ${styles.patternsBtn}">${s.patterns.title}</button>` : ""}
				<button class="btn btn-secondary ${styles.settingsBtn}">${s.menu.settings}</button>
			</div>
		</div>
	`;

	// Wire up main run buttons
	const startNewWeekBtn = container.querySelector<HTMLElement>(
		`.${styles.startNewWeekBtn}`,
	);
	const viewSummaryBtn = container.querySelector<HTMLElement>(
		`.${styles.viewSummaryBtn}`,
	);
	const continueBtn = container.querySelector<HTMLElement>(
		`.${styles.continueBtn}`,
	);
	const newGameBtn = container.querySelector<HTMLElement>(
		`.${styles.newGameBtn}`,
	);

	// Focus the primary action
	if (startNewWeekBtn) {
		startNewWeekBtn.focus();
	} else if (continueBtn) {
		continueBtn.focus();
	} else {
		newGameBtn?.focus();
	}

	// Start New Week (completed run: clear save and start fresh)
	startNewWeekBtn?.addEventListener("click", () => {
		resetRun("main");
		const newState = createNewGame(undefined, "main");
		store.setState(newState);
	});

	// View Summary (completed run: load the weekComplete screen)
	viewSummaryBtn?.addEventListener("click", () => {
		const savedGame = loadGame("main");
		if (savedGame) {
			store.setState(savedGame);
		}
	});

	// Continue (in-progress run)
	continueBtn?.addEventListener("click", () => {
		const savedGame = loadGame("main");
		if (savedGame) {
			store.setState(savedGame);
		}
	});

	// New Game (abandon in-progress run)
	newGameBtn?.addEventListener("click", () => {
		const newState = createNewGame(undefined, "main");
		store.setState(newState);
	});

	// Seed input and button
	const seedInput = container.querySelector<HTMLInputElement>(
		`.${styles.seedInput}`,
	);
	const seedBtn = container.querySelector<HTMLElement>(`.${styles.seedBtn}`);

	seedBtn?.addEventListener("click", () => {
		startSeededGame(seedInput, store, patterns.hasSeenIntro);
	});

	seedInput?.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			startSeededGame(seedInput, store, patterns.hasSeenIntro);
		}
	});

	// Seeded run continue button
	const seededContinueBtn = container.querySelector<HTMLElement>(
		`.${styles.seededContinueBtn}`,
	);
	seededContinueBtn?.addEventListener("click", () => {
		const savedGame = loadGame("seeded");
		if (savedGame) {
			store.setState(savedGame);
		}
	});

	// Patterns button
	const patternsBtn = container.querySelector<HTMLElement>(
		`.${styles.patternsBtn}`,
	);
	patternsBtn?.addEventListener("click", () => {
		store.set("screen", "patterns");
	});

	// Settings button
	const settingsBtn = container.querySelector<HTMLElement>(
		`.${styles.settingsBtn}`,
	);
	settingsBtn?.addEventListener("click", () => {
		openSettingsDialog();
	});
}

/**
 * Starts a new seeded game, parsing the seed from input.
 */
function startSeededGame(
	seedInput: HTMLInputElement | null,
	store: Store<GameState>,
	hasSeenIntro?: boolean,
) {
	const seedText = seedInput?.value.trim() ?? "";
	let seed: number | undefined;

	if (seedText) {
		// Parse seed - accept integers
		const parsed = Number.parseInt(seedText, 10);
		if (!Number.isNaN(parsed)) {
			seed = parsed;
		}
	}

	// Clear any existing seeded run
	resetRun("seeded");

	const newState = createNewGame(seed, "seeded");
	// Skip intro for seeded runs if they've seen it before
	if (hasSeenIntro && newState.screen === "intro") {
		newState.screen = "game";
	}
	store.setState(newState);
}
