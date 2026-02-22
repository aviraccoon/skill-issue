import type { WeekCompleteInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import {
	createNewGame,
	resetRun,
	saveCompletedRun,
} from "../systems/persistence";
import styles from "./WeekComplete.module.css";

/** Track if we've saved this completion (avoid duplicate saves on re-render). */
let savedRunSeed: number | null = null;

/**
 * Renders the week complete screen.
 */
export function renderWeekComplete(
	screenInfo: WeekCompleteInfo,
	container: HTMLElement,
	store: Store<GameState>,
) {
	const s = strings();
	const { patterns } = screenInfo;

	// Save completed run to patterns history (once per run)
	const state = store.getState();
	if (savedRunSeed !== state.runSeed) {
		saveCompletedRun(state, state.gameMode);
		savedRunSeed = state.runSeed;
	}

	// Format success rate as percentage
	const successRateDisplay = `${Math.round(patterns.successRate * 100)}%`;

	// Build narrative HTML - split paragraphs
	const narrativeParagraphs = screenInfo.narrative
		.split("\n\n")
		.map((p) => {
			const html = p.replace(/\n/g, "<br>");
			return `<p class="${styles.narrative}">${html}</p>`;
		})
		.join("");

	// Build patterns HTML
	const patternsHtml = `
		<section class="${styles.patterns}" aria-labelledby="patterns-title">
			<h2 id="patterns-title" class="${styles.patternsTitle}">${s.patterns.title}</h2>
			<dl class="${styles.patternList}">
				<div class="${styles.patternItem}">
					<dt>${s.patterns.personality}</dt>
					<dd class="${styles.personality}">${patterns.personality}</dd>
				</div>
				<div class="${styles.patternItem}">
					<dt>${s.patterns.successRate}</dt>
					<dd>${successRateDisplay}</dd>
				</div>
				${
					patterns.bestTimeBlock
						? `
				<div class="${styles.patternItem}">
					<dt>${s.patterns.bestTime}</dt>
					<dd>${s.timeBlocks[patterns.bestTimeBlock]}</dd>
				</div>
				`
						: ""
				}
				${
					patterns.worstTimeBlock &&
					patterns.worstTimeBlock !== patterns.bestTimeBlock
						? `
				<div class="${styles.patternItem}">
					<dt>${s.patterns.worstTime}</dt>
					<dd>${s.timeBlocks[patterns.worstTimeBlock]}</dd>
				</div>
				`
						: ""
				}
				<div class="${styles.patternItem}">
					<dt>${s.patterns.phoneChecks}</dt>
					<dd>${patterns.phoneChecks}</dd>
				</div>
				${
					patterns.allNighters > 0
						? `
				<div class="${styles.patternItem}">
					<dt>${s.patterns.allNighters}</dt>
					<dd>${patterns.allNighters}</dd>
				</div>
				`
						: ""
				}
				${
					patterns.friendRescues.triggered > 0
						? `
				<div class="${styles.patternItem}">
					<dt>${s.patterns.friendRescues}</dt>
					<dd>${patterns.friendRescues.accepted}/${patterns.friendRescues.triggered}</dd>
				</div>
				`
						: ""
				}
				${
					patterns.variantsUsed.length > 0
						? `
				<div class="${styles.patternItem}">
					<dt>${s.patterns.variantsUsed}</dt>
					<dd>${patterns.variantsUsed.join(", ")}</dd>
				</div>
				`
						: ""
				}
				<div class="${styles.patternItem}">
					<dt>${s.patterns.seed}</dt>
					<dd class="${styles.seed}">${patterns.seed}</dd>
				</div>
			</dl>
		</section>
	`;

	// All string content comes from i18n (trusted source), not user input
	const showRestart = state.gameMode === "main";
	const showCopy = state.gameMode === "daily" || state.gameMode === "seeded";

	container.innerHTML = `
		<div class="${styles.summary}">
			<h1 class="${styles.title}">${s.game.weekComplete}</h1>
			<div class="${styles.story}">${narrativeParagraphs}</div>
			${patternsHtml}
			<div class="${styles.actions}">
				${showRestart ? `<button class="btn btn-primary ${styles.restartBtn}">${s.game.startNewWeek}</button>` : ""}
				${showCopy ? `<button class="btn btn-secondary ${styles.copyBtn}">${s.game.copyResults}</button>` : ""}
				<button class="btn ${showRestart ? `btn-secondary ${styles.menuBtn}` : `btn-primary ${styles.menuBtn}`}">${s.game.menu}</button>
			</div>
		</div>
	`;

	// Focus primary action for keyboard users
	const restartBtn = container.querySelector<HTMLElement>(
		`.${styles.restartBtn}`,
	);
	const menuBtn = container.querySelector<HTMLElement>(`.${styles.menuBtn}`);
	if (restartBtn) {
		restartBtn.focus();
	} else {
		menuBtn?.focus();
	}

	container
		.querySelector(`.${styles.restartBtn}`)
		?.addEventListener("click", () => {
			const mode = store.getState().gameMode;
			resetRun(mode);
			const fresh = createNewGame(undefined, mode);
			// Set savedRunSeed to new seed BEFORE state update to prevent
			// intermediate re-renders from saving the old run again
			savedRunSeed = fresh.runSeed;
			// Batch all state changes to trigger single re-render
			store.setState({
				...fresh,
				screen: "game",
				selectedTaskId: null,
			});
		});

	// Copy Results button
	const copyBtn = container.querySelector<HTMLElement>(`.${styles.copyBtn}`);
	copyBtn?.addEventListener("click", () => {
		const text = formatShareableResults(screenInfo, state, s);
		navigator.clipboard.writeText(text).then(() => {
			if (copyBtn) {
				copyBtn.textContent = s.game.resultsCopied;
				setTimeout(() => {
					copyBtn.textContent = s.game.copyResults;
				}, 2000);
			}
		});
	});

	container
		.querySelector(`.${styles.menuBtn}`)
		?.addEventListener("click", () => {
			store.set("screen", "menu");
		});
}

/**
 * Formats run results as shareable plaintext.
 */
function formatShareableResults(
	screenInfo: WeekCompleteInfo,
	state: GameState,
	s: ReturnType<typeof strings>,
): string {
	const { patterns: p } = screenInfo;
	const stats = state.runStats;
	const modeLabel =
		s.share[state.gameMode as keyof typeof s.share] ?? state.gameMode;
	const lines = [
		`Skill Issue - ${modeLabel} (seed ${p.seed})`,
		"",
		`${stats.tasks.succeeded}/${stats.tasks.attempted} tasks`,
		`${Math.round(p.successRate * 100)}% success rate`,
	];

	if (p.bestTimeBlock) {
		lines.push(`Best time: ${s.timeBlocks[p.bestTimeBlock]}`);
	}
	if (p.phoneChecks > 0) {
		lines.push(`Phone checks: ${p.phoneChecks}`);
	}
	if (p.allNighters > 0) {
		lines.push(`All-nighters: ${p.allNighters}`);
	}
	if (p.friendRescues.triggered > 0) {
		lines.push(
			`Friend rescues: ${p.friendRescues.accepted}/${p.friendRescues.triggered}`,
		);
	}

	return lines.join("\n");
}
