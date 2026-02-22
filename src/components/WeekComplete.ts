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

	container.innerHTML = `
		<div class="${styles.summary}">
			<h1 class="${styles.title}">${s.game.weekComplete}</h1>
			<div class="${styles.story}">${narrativeParagraphs}</div>
			${patternsHtml}
			<div class="${styles.actions}">
				${state.gameMode === "main" ? `<button class="btn btn-primary ${styles.restartBtn}">${s.game.startNewWeek}</button>` : ""}
				<button class="btn ${state.gameMode === "main" ? `btn-secondary ${styles.menuBtn}` : `btn-primary ${styles.menuBtn}`}">${s.game.menu}</button>
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

	container
		.querySelector(`.${styles.menuBtn}`)
		?.addEventListener("click", () => {
			store.set("screen", "menu");
		});
}
