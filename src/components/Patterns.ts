import type { PatternsScreenInfo } from "../core/screenInfo";
import { strings } from "../i18n";
import type { GameState } from "../state";
import type { Store } from "../store";
import styles from "./Patterns.module.css";

/**
 * Renders the Your Patterns screen showing lifetime stats.
 */
export function renderPatterns(
	screenInfo: PatternsScreenInfo,
	app: HTMLElement,
	store: Store<GameState>,
) {
	const s = strings();
	const { lifetime } = screenInfo;

	// Format success rate as percentage
	const successRatePercent = Math.round(lifetime.overallSuccessRate * 100);

	// Get translated time block names
	const bestTime = lifetime.bestTimeBlock
		? s.timeBlocks[lifetime.bestTimeBlock]
		: "-";
	const worstTime = lifetime.worstTimeBlock
		? s.timeBlocks[lifetime.worstTimeBlock]
		: "-";

	// Build personality breakdown string
	const { personalities } = lifetime;
	const timeBreakdown = [
		personalities.time.nightOwl > 0
			? `${s.patterns.personalities.nightOwl}: ${personalities.time.nightOwl}`
			: null,
		personalities.time.earlyBird > 0
			? `${s.patterns.personalities.earlyBird}: ${personalities.time.earlyBird}`
			: null,
		personalities.time.neutral > 0
			? `${s.patterns.personalities.neutralTime}: ${personalities.time.neutral}`
			: null,
	]
		.filter(Boolean)
		.join(", ");

	const socialBreakdown = [
		personalities.social.socialBattery > 0
			? `${s.patterns.personalities.socialBattery}: ${personalities.social.socialBattery}`
			: null,
		personalities.social.hermit > 0
			? `${s.patterns.personalities.hermit}: ${personalities.social.hermit}`
			: null,
		personalities.social.neutral > 0
			? `${s.patterns.personalities.neutralSocial}: ${personalities.social.neutral}`
			: null,
	]
		.filter(Boolean)
		.join(", ");

	// Variants display
	const variantsDisplay =
		lifetime.variantsUsed.length > 0
			? lifetime.variantsUsed.join(", ")
			: s.patterns.none;

	app.innerHTML = `
		<div class="${styles.container}">
			<header class="${styles.header}">
				<h1 class="${styles.title}">${s.patterns.title}</h1>
			</header>

			<main class="${styles.content}">
				<section class="${styles.stats}">
					<div class="${styles.stat}">
						<span class="${styles.statValue}">${lifetime.runsCompleted}</span>
						<span class="${styles.statLabel}">${s.patterns.runsCompleted}</span>
					</div>
					<div class="${styles.stat}">
						<span class="${styles.statValue}">${successRatePercent}%</span>
						<span class="${styles.statLabel}">${s.patterns.successRate}</span>
					</div>
					<div class="${styles.stat}">
						<span class="${styles.statValue}">${lifetime.totalSucceeded}/${lifetime.totalAttempted}</span>
						<span class="${styles.statLabel}">${s.patterns.tasks}</span>
					</div>
				</section>

				<section class="${styles.timeBlocks}">
					<div class="${styles.timeBlock}">
						<span class="${styles.timeLabel}">${s.patterns.bestTime}</span>
						<span class="${styles.timeValue}">${bestTime}</span>
					</div>
					<div class="${styles.timeBlock}">
						<span class="${styles.timeLabel}">${s.patterns.worstTime}</span>
						<span class="${styles.timeValue}">${worstTime}</span>
					</div>
				</section>

				<section class="${styles.extras}">
					<p>${s.patterns.phoneChecks}: ${lifetime.totalPhoneChecks}</p>
					<p>${s.patterns.allNighters}: ${lifetime.totalAllNighters}</p>
					<p>${s.patterns.friendRescues}: ${lifetime.totalFriendRescues.accepted}/${lifetime.totalFriendRescues.triggered}</p>
					<p>${s.patterns.variantsUsed}: ${variantsDisplay}</p>
				</section>

				<section class="${styles.personalities}">
					<p class="${styles.personalityRow}">${timeBreakdown}</p>
					<p class="${styles.personalityRow}">${socialBreakdown}</p>
				</section>
			</main>

			<footer class="${styles.footer}">
				<button class="btn btn-primary ${styles.backBtn}">${s.patterns.back}</button>
			</footer>
		</div>
	`;

	// Wire up back button
	app.querySelector(`.${styles.backBtn}`)?.addEventListener("click", () => {
		store.set("screen", "menu");
	});
}
