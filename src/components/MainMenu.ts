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

	// Build continue button if main run exists
	let continueHtml = "";
	if (screenInfo.mainRunSummary) {
		const subtext = s.menu.continueSubtext(
			screenInfo.mainRunSummary.day,
			screenInfo.mainRunSummary.timeBlock,
		);
		continueHtml = `
			<button class="${styles.continueBtn}">
				<span class="${styles.btnLabel}">${s.menu.continue}</span>
				<span class="${styles.btnSubtext}">${subtext}</span>
			</button>
		`;
	}

	// Build seeded run notice if exists
	let seededNoticeHtml = "";
	if (screenInfo.seededRunSummary) {
		seededNoticeHtml = `
			<p class="${styles.seededNotice}">
				${s.menu.seededRunNotice(screenInfo.seededRunSummary.day, screenInfo.seededRunSummary.seed)}
				<button class="${styles.secondaryBtn} ${styles.seededContinueBtn}">${s.menu.continue}</button>
			</p>
		`;
	}

	container.innerHTML = `
		<div class="${styles.menu}">
			<h1 class="${styles.title}">${s.intro.title}</h1>

			<div class="${styles.actions}">
				${continueHtml}
				<button class="${styles.secondaryBtn} ${styles.newGameBtn}">${s.menu.newGame}</button>
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
					<button class="${styles.secondaryBtn} ${styles.seedBtn}">${s.menu.startSeeded}</button>
				</div>
			</div>

			${seededNoticeHtml}

			<button class="${styles.secondaryBtn} ${styles.settingsBtn}">${s.menu.settings}</button>
		</div>
	`;

	// Focus Continue if exists, otherwise New Game
	const continueBtn = container.querySelector<HTMLElement>(
		`.${styles.continueBtn}`,
	);
	const newGameBtn = container.querySelector<HTMLElement>(
		`.${styles.newGameBtn}`,
	);

	if (continueBtn) {
		continueBtn.focus();
		continueBtn.addEventListener("click", () => {
			const savedGame = loadGame("main");
			if (savedGame) {
				store.setState(savedGame);
			}
		});
	} else {
		newGameBtn?.focus();
	}

	// New Game button
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
