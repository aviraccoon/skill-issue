import type { MenuScreenInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import {
	createNewGame,
	getDailySeed,
	getPatterns,
	loadGame,
	resetRun,
} from "../systems/persistence";
import { createAccessibilityDialog } from "./AccessibilityDialog";
import styles from "./MainMenu.module.css";
import { createSettingsDialog, openSettingsDialog } from "./SettingsDialog";

/** Tracks whether we've created the dialogs. */
let dialogsCreated = false;

/** Interval for refreshing the daily timer. */
let timerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Renders the main menu screen.
 * Shows Continue (if save exists), New Game, daily seed, and custom seed input.
 */
export function renderMainMenu(
	screenInfo: MenuScreenInfo,
	container: HTMLElement,
	store: Store<GameState>,
) {
	const s = strings();
	const patterns = getPatterns();

	// Clear any previous timer refresh interval
	if (timerInterval !== null) {
		clearInterval(timerInterval);
		timerInterval = null;
	}

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

	// Build daily section
	// All string content comes from i18n (trusted source), not user input
	const daily = screenInfo.dailyRunSummary;
	const dailyTitle = s.menu.todaysDaily(screenInfo.dailyDateLabel);
	const dailyTimer = `<span class="${styles.dailyTimer}">${screenInfo.dailyTimeRemaining}</span>`;
	let dailyHtml = "";
	if (daily && !daily.completed && !daily.newDailyAvailable) {
		// In-progress daily for today: show continue button + timer
		const subtext = s.menu.dailySubtext(daily.day, daily.timeBlock);
		dailyHtml = `
			<button class="btn btn-secondary ${styles.dailyContinueBtn}">
				<span class="${styles.btnLabel}">${s.menu.continueDaily}</span>
				<span class="${styles.btnSubtext}">${subtext}</span>
			</button>
			${dailyTimer}
		`;
	} else if (daily?.completed && !daily.newDailyAvailable) {
		// Completed today's daily: show view summary + timer
		dailyHtml = `
			<p class="${styles.dailyNotice}">
				${s.menu.dailyRunComplete(daily.dateLabel, daily.seed)}
				<button class="btn btn-secondary ${styles.dailyViewBtn}">${s.menu.viewSummary}</button>
			</p>
			${dailyTimer}
		`;
	} else if (daily?.newDailyAvailable) {
		// Old daily exists but new one available: show both
		const oldLabel = daily.completed
			? s.menu.dailyRunComplete(daily.dateLabel, daily.seed)
			: s.menu.dailyRunNotice(daily.dateLabel, daily.day, daily.seed);
		const oldBtnLabel = daily.completed
			? s.menu.viewSummary
			: s.menu.continueDaily;
		dailyHtml = `
			<button class="btn btn-primary ${styles.dailyStartBtn}">${dailyTitle}</button>
			${dailyTimer}
			<p class="${styles.dailyNotice}">
				${oldLabel}
				<button class="btn btn-secondary ${styles.dailyOldBtn}">${oldBtnLabel}</button>
			</p>
		`;
	} else {
		// No daily save: show start button + timer
		dailyHtml = `
			<button class="btn btn-primary ${styles.dailyStartBtn}">${dailyTitle}</button>
			${dailyTimer}
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

			<div class="${styles.dailySection}">
				${dailyHtml}
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

	// Wire up daily buttons
	const dailyStartBtn = container.querySelector<HTMLElement>(
		`.${styles.dailyStartBtn}`,
	);
	const dailyContinueBtn = container.querySelector<HTMLElement>(
		`.${styles.dailyContinueBtn}`,
	);
	const dailyViewBtn = container.querySelector<HTMLElement>(
		`.${styles.dailyViewBtn}`,
	);
	const dailyOldBtn = container.querySelector<HTMLElement>(
		`.${styles.dailyOldBtn}`,
	);

	dailyStartBtn?.addEventListener("click", () => {
		startDailyGame(store, patterns.hasSeenIntro);
	});

	dailyContinueBtn?.addEventListener("click", () => {
		const savedGame = loadGame("daily");
		if (savedGame) {
			store.setState(savedGame);
		}
	});

	dailyViewBtn?.addEventListener("click", () => {
		const savedGame = loadGame("daily");
		if (savedGame) {
			store.setState(savedGame);
		}
	});

	dailyOldBtn?.addEventListener("click", () => {
		const savedGame = loadGame("daily");
		if (savedGame) {
			store.setState(savedGame);
		}
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

	// Refresh the daily timer every minute while on the menu screen.
	// Cleared at the top of renderMainMenu on next render, or self-clears
	// if the user navigated away.
	const interval = setInterval(() => {
		if (store.getState().screen !== "menu") {
			clearInterval(interval);
			timerInterval = null;
			return;
		}
		store.setState(store.getState());
	}, 60_000);
	timerInterval = interval;
}

/**
 * Starts a new daily seed game.
 */
function startDailyGame(store: Store<GameState>, hasSeenIntro?: boolean) {
	const seed = getDailySeed();
	resetRun("daily");
	const newState = createNewGame(seed, "daily");
	if (hasSeenIntro && newState.screen === "intro") {
		newState.screen = "game";
	}
	store.setState(newState);
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
