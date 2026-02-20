import { selectTask } from "../actions/tasks";
import type { Decision } from "../core/controller";
import type { GameScreenInfo, TaskDisplay } from "../core/screenInfo";
import { ROOM_SCALE } from "../data/roomLayout";
import type { TaskId } from "../data/tasks";
import { SLOTS_PER_BLOCK } from "../data/timeBlocks";
import { strings } from "../i18n";
import type { RoomLayout } from "../rendering/types";
import type { GameState } from "../state";
import type { Store } from "../store";
import appStyles from "./App.module.css";
import gameAreaStyles from "./GameArea.module.css";
import panelStyles from "./Panel.module.css";
import taskStyles from "./Task.module.css";

/**
 * Focuses the main action in the panel: Continue button, or panel itself.
 * Uses rAF + delay to ensure DOM is painted and screen readers catch up.
 */
function focusPanelAction() {
	requestAnimationFrame(() => {
		setTimeout(() => {
			// Try Continue button
			const continueBtn = document.querySelector<HTMLElement>(
				`.${panelStyles.continueBtn}`,
			);
			if (continueBtn) {
				continueBtn.focus();
				return;
			}

			// Fall back to panel
			const panel = document.querySelector<HTMLElement>(
				`.${panelStyles.panel}`,
			);
			panel?.focus();
		}, 100);
	});
}

/** Creates the initial HTML structure for the app. */
export function createAppStructure(
	screenInfo: GameScreenInfo,
	layout: RoomLayout,
): string {
	const s = strings();

	return `
		<header class="${appStyles.header}">
			<h1 class="${appStyles.title}"></h1>
			<div class="${appStyles.timeBlock}"></div>
		</header>

		<main class="${appStyles.main}">
			<div class="${appStyles.gameAreaColumn}">
				<canvas
					class="${gameAreaStyles.gameArea} ${appStyles.gameArea}"
					width="${layout.roomWidth * ROOM_SCALE}"
					height="${layout.roomHeight * ROOM_SCALE}"
					role="img"
					aria-label="${s.a11y.gameArea ?? "Game area showing your room"}"
				></canvas>
				<div class="${appStyles.notification}" aria-live="polite" aria-atomic="true"></div>
			</div>

			<section class="${appStyles.taskListContainer}">
				<div class="${appStyles.slotsRow}">
					<div class="${appStyles.slots}" ${screenInfo.isWeekend ? 'data-weekend="true"' : ""}>
						${
							screenInfo.isWeekend
								? `<span class="${appStyles.points}"></span>`
								: `
						<span class="${appStyles.slot}"></span>
						<span class="${appStyles.slot}"></span>
						<span class="${appStyles.slot}"></span>
						`
						}
					</div>
					<button class="btn btn-secondary ${appStyles.phoneBtn}" aria-label="${s.game.checkPhone}">
						<svg class="${appStyles.phoneIcon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
							<line x1="12" y1="18" x2="12" y2="18"/>
						</svg>
						<span class="${appStyles.phoneDot}"></span>
					</button>
				</div>
				<ul class="${appStyles.taskList}"></ul>
			</section>

			<aside id="task-panel" class="${panelStyles.panel}" tabindex="-1" aria-label="${s.a11y.taskPanel}">
				<p class="${panelStyles.empty}">${s.game.selectTask}</p>
			</aside>
		</main>

		<footer class="${appStyles.footer}">
			<button class="btn btn-secondary ${appStyles.skipBtn}"></button>
			<button class="btn btn-secondary ${appStyles.menuBtn}">${s.game.menu}</button>
		</footer>
	`;
}

/** Timeout ID for hiding notification - tracked to reset on new notifications. */
let notificationHideTimeout: ReturnType<typeof setTimeout> | null = null;

/** Delivery style CSS classes keyed by style name. */
const deliveryStyleClasses: Record<string, string | undefined> = {
	notification: appStyles.notificationCard,
	message: appStyles.notificationMessage,
};

/**
 * Shows a brief notification message (e.g., phone buzz, event banner).
 * @param style - Delivery style for event banners. Default "thought" uses base italic style.
 */
export function showNotification(
	text: string,
	style?: "thought" | "notification" | "message",
) {
	const notification = document.querySelector(`.${appStyles.notification}`);
	if (!notification) return;

	// Cancel any pending hide timeout
	if (notificationHideTimeout) {
		clearTimeout(notificationHideTimeout);
		notificationHideTimeout = null;
	}

	// Remove any previous delivery style classes
	notification.classList.remove(
		appStyles.notificationCard,
		appStyles.notificationMessage,
	);

	// Clear first to ensure re-announcement, then set after paint
	notification.textContent = "";
	requestAnimationFrame(() => {
		setTimeout(() => {
			// Add sr-only delivery style prefix for screen readers
			const s = strings();
			const prefix =
				style === "notification"
					? s.a11y.deliveryPrefix.notification
					: style === "message"
						? s.a11y.deliveryPrefix.message
						: "";
			if (prefix) {
				const span = document.createElement("span");
				span.className = "sr-only";
				span.textContent = `${prefix} `;
				notification.textContent = "";
				notification.appendChild(span);
				notification.appendChild(document.createTextNode(text));
			} else {
				notification.textContent = text;
			}
			notification.classList.add(appStyles.notificationVisible);
			// Apply delivery style class (thought = default italic, no extra class)
			const styleClass = style ? deliveryStyleClasses[style] : undefined;
			if (styleClass) {
				notification.classList.add(styleClass);
			}
		}, 100);
	});

	// Display duration scales with text length: 2s base + 50ms per character
	const duration = Math.min(Math.max(2000 + text.length * 50, 2500), 8000);
	notificationHideTimeout = setTimeout(() => {
		notification.classList.remove(appStyles.notificationVisible);
		notification.classList.remove(
			appStyles.notificationCard,
			appStyles.notificationMessage,
		);
		notificationHideTimeout = null;
	}, duration);
}

/** Updates the header with current day and time block. */
export function renderHeader(screenInfo: GameScreenInfo) {
	const title = document.querySelector(`.${appStyles.title}`);
	const timeBlockEl = document.querySelector(`.${appStyles.timeBlock}`);

	if (title) title.textContent = screenInfo.dayDisplay;
	if (timeBlockEl) {
		// Hide time block on weekends
		timeBlockEl.textContent = screenInfo.isWeekend
			? ""
			: screenInfo.timeBlockDisplay;
	}
}

/** Updates the action slot or point indicators. */
export function renderSlots(screenInfo: GameScreenInfo) {
	const s = strings();
	const slotsContainer = document.querySelector(`.${appStyles.slots}`);

	if (screenInfo.isWeekend) {
		// Weekend: show remaining points
		const pointsEl = document.querySelector(`.${appStyles.points}`);
		if (pointsEl) {
			pointsEl.textContent = s.game.points(screenInfo.weekendPointsRemaining);
		}
	} else if (screenInfo.inExtendedNight) {
		// Extended night: hide slot count, just show text
		if (slotsContainer) {
			slotsContainer.innerHTML = `<span class="${appStyles.lateNight}">${s.game.lateNight}</span>`;
		}
	} else {
		// Normal weekday: show slot indicators
		// Rebuild slots if coming back from extended night
		const slots = document.querySelectorAll(`.${appStyles.slot}`);
		if (slots.length !== SLOTS_PER_BLOCK && slotsContainer) {
			slotsContainer.innerHTML = Array.from(
				{ length: SLOTS_PER_BLOCK },
				() => `<span class="${appStyles.slot}"></span>`,
			).join("\n\t\t\t\t");
		}
		const currentSlots = document.querySelectorAll(`.${appStyles.slot}`);
		const used = 3 - screenInfo.slotsRemaining;

		currentSlots.forEach((slot, i) => {
			slot.classList.toggle(appStyles.slotUsed, i < used);
		});
	}
}

/** Renders the list of available tasks. */
export function renderTaskList(
	screenInfo: GameScreenInfo,
	store: Store<GameState>,
) {
	const s = strings();
	const list = document.querySelector(`.${appStyles.taskList}`);
	if (!list) return;

	// Preserve focus across re-render - track which task had focus
	const focusedTaskId = (document.activeElement as HTMLElement)?.dataset?.id;
	const focusWasInList = list.contains(document.activeElement);

	list.innerHTML = "";

	for (const task of screenInfo.tasks) {
		const button = document.createElement("button");
		button.className = taskStyles.task;
		button.dataset.id = task.id;

		const displayName = getTaskDisplayName(task, screenInfo.isWeekend);
		const isSelected = screenInfo.selectedTask?.id === task.id;

		// Set accessible name with state info
		if (task.succeededToday) {
			button.setAttribute(
				"aria-label",
				`${displayName}, ${s.a11y.completedToday}`,
			);
		}
		button.textContent = displayName;

		// Indicate relationship to panel
		button.setAttribute("aria-controls", "task-panel");

		// Indicate selection state
		button.setAttribute("aria-pressed", String(isSelected));
		if (isSelected) {
			button.classList.add(taskStyles.selected);
		}
		if (task.succeededToday) {
			button.classList.add(taskStyles.succeeded);
		}

		button.addEventListener("click", (e) => {
			selectTask(store, task.id);
			// Move focus to panel action if activated via keyboard (Enter/Space)
			// Keyboard clicks have no pointer coordinates
			if (e.detail === 0) {
				focusPanelAction();
			}
		});

		// Arrow key navigation between tasks
		button.addEventListener("keydown", (e) => {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				const tasks = list.querySelectorAll<HTMLElement>(`.${taskStyles.task}`);
				const currentIndex = Array.from(tasks).indexOf(button);
				const nextIndex =
					e.key === "ArrowDown"
						? Math.min(currentIndex + 1, tasks.length - 1)
						: Math.max(currentIndex - 1, 0);
				tasks[nextIndex]?.focus();
			}
			// Arrow Right to select/open details and focus action
			if (e.key === "ArrowRight") {
				e.preventDefault();
				selectTask(store, task.id);
				focusPanelAction();
			}
			// Arrow Left handled at document level (works from panel too)
		});

		list.appendChild(button);
	}

	// Restore focus if it was in the list before re-render
	if (focusWasInList && focusedTaskId) {
		const buttonToFocus = list.querySelector<HTMLElement>(
			`[data-id="${focusedTaskId}"]`,
		);
		buttonToFocus?.focus();
	}
}

/**
 * Renders the side panel showing selected task details.
 * @param animatingTaskId - Task currently being animated, or null if idle
 * @param preAttemptState - Cached display values from before animation started
 */
export function renderTaskPanel(
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
	animatingTaskId: TaskId | null,
	preAttemptState?: {
		failureCount: number | null;
		evolvedName: string | null;
	},
) {
	const s = strings();
	const panel = document.querySelector(`.${panelStyles.panel}`);
	if (!panel) return;

	const selectedTask = screenInfo.selectedTask;

	// Check if this task is currently being attempted (animation in progress)
	const isAttempting = selectedTask && animatingTaskId === selectedTask.id;

	// Check if period is exhausted (no more actions possible)
	const periodExhausted = screenInfo.isWeekend
		? screenInfo.weekendPointsRemaining <= 0
		: screenInfo.slotsRemaining <= 0;

	// Build continue button HTML if period is exhausted
	let continueButtonHtml = "";
	if (periodExhausted && !isAttempting) {
		const buttonText = screenInfo.isWeekend
			? s.game.endDay
			: screenInfo.nextTimeBlock
				? s.game.continueTo(screenInfo.nextTimeBlock)
				: s.game.endDay;
		continueButtonHtml = `<button class="btn btn-secondary ${panelStyles.continueBtn}">${buttonText}</button>`;
	}

	if (!selectedTask) {
		panel.innerHTML = `
			<p class="${panelStyles.empty}">${s.game.selectTask}</p>
			${continueButtonHtml}
		`;
		attachContinueHandler(panel, screenInfo, onDecision);
		return;
	}

	// Show cost on weekends if > 1
	const costDisplay =
		screenInfo.isWeekend && selectedTask.weekendCost > 1
			? `<p class="${panelStyles.cost}">${s.game.costPoints(selectedTask.weekendCost)}</p>`
			: "";

	// Build hidden description for screen readers (proper sentences)
	const descParts = [
		`${selectedTask.evolvedName}.`,
		`${s.game.failedCount(selectedTask.failureCount)}.`,
	];
	if (selectedTask.urgency) descParts.push(`${selectedTask.urgency.text}.`);
	if (
		selectedTask.variant &&
		selectedTask.canAttempt &&
		!selectedTask.succeededToday
	) {
		descParts.push(`${s.a11y.variantAvailable(selectedTask.variant.name)}`);
	}
	const buttonDesc = descParts.join(" ");

	// Don't show "Done" while animation is still playing
	const showDone = selectedTask.succeededToday && !isAttempting;

	// Use pre-attempt values during animation (don't reveal result early)
	const displayEvolvedName =
		isAttempting && preAttemptState
			? (preAttemptState.evolvedName ?? selectedTask.evolvedName)
			: selectedTask.evolvedName;
	const displayFailureCount =
		isAttempting && preAttemptState
			? (preAttemptState.failureCount ?? selectedTask.failureCount)
			: selectedTask.failureCount;

	// Determine button state - show during animation even if task just succeeded
	const showAttemptBtn =
		(selectedTask.canAttempt && !periodExhausted) || isAttempting;
	const attemptBtnText = isAttempting ? s.game.attempting : s.game.attempt;
	const attemptBtnDisabled = isAttempting ? "disabled" : "";
	const attemptBtnAria = isAttempting ? 'aria-busy="true"' : "";

	panel.innerHTML = `
		<span id="panel-desc" class="sr-only">${buttonDesc}</span>
		<p class="${panelStyles.taskName}">${displayEvolvedName}</p>
		<p class="${panelStyles.stats}">
			${s.game.failedCount(displayFailureCount)}
		</p>
		${selectedTask.urgency ? `<p class="${panelStyles.urgency}" data-urgency="${selectedTask.urgency.level}">${selectedTask.urgency.text}</p>` : ""}
${costDisplay}
		${showDone ? `<p class="${panelStyles.doneText}">${s.game.done}</p>` : ""}
		${
			showAttemptBtn
				? `
			<button class="btn btn-primary ${panelStyles.attemptBtn}" aria-describedby="panel-desc" ${attemptBtnDisabled} ${attemptBtnAria}>
				${attemptBtnText}
			</button>
		`
				: ""
		}
		${selectedTask.variant && selectedTask.canAttempt && !selectedTask.succeededToday && !periodExhausted && !isAttempting ? `<button class="btn ${panelStyles.variantBtn}" aria-describedby="panel-desc">${selectedTask.variant.name}</button>` : ""}
		${continueButtonHtml}
	`;

	const attemptBtn = panel.querySelector(`.${panelStyles.attemptBtn}`);
	if (attemptBtn && selectedTask.canAttempt && !isAttempting) {
		attemptBtn.addEventListener("click", () => {
			onDecision({ type: "attempt", taskId: selectedTask.id });
		});
	}

	// Wire up variant button
	const variantBtn = panel.querySelector(`.${panelStyles.variantBtn}`);
	if (variantBtn && selectedTask.canAttempt) {
		variantBtn.addEventListener("click", () => {
			onDecision({
				type: "attempt",
				taskId: selectedTask.id,
				useVariant: true,
			});
		});
	}

	attachContinueHandler(panel, screenInfo, onDecision);
}

/** Attaches click handler to continue button if present. */
function attachContinueHandler(
	panel: Element,
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
) {
	panel
		.querySelector(`.${panelStyles.continueBtn}`)
		?.addEventListener("click", () => {
			if (screenInfo.isWeekend) {
				onDecision({ type: "endDay" });
			} else {
				onDecision({ type: "skip" });
			}
		});
}

/** Updates the phone button: click handler, tooltip, notification dot. */
export function renderPhoneButton(
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
) {
	const s = strings();
	const phoneBtn = document.querySelector(`.${appStyles.phoneBtn}`);
	if (!phoneBtn) return;

	const newPhoneBtn = phoneBtn.cloneNode(true) as HTMLButtonElement;
	phoneBtn.parentNode?.replaceChild(newPhoneBtn, phoneBtn);
	// Clear tooltip init flag so initTooltips re-initializes after cloning
	delete newPhoneBtn.dataset.tooltipInit;
	newPhoneBtn.addEventListener("click", () => {
		onDecision({ type: "checkPhone" });
	});
	// Random tooltip on hover (set initial so initTooltips picks it up)
	const phoneTips = s.tooltips.checkPhone;
	newPhoneBtn.dataset.tooltip =
		phoneTips[Math.floor(Math.random() * phoneTips.length)];
	newPhoneBtn.addEventListener("mouseenter", () => {
		newPhoneBtn.dataset.tooltip =
			phoneTips[Math.floor(Math.random() * phoneTips.length)];
	});

	// Update notification dot visibility and animation intensity
	const dot = newPhoneBtn.querySelector(`.${appStyles.phoneDot}`);
	if (dot) {
		const count = screenInfo.phoneNotificationCount;
		dot.classList.toggle(appStyles.phoneDotVisible, count > 0);
		dot.classList.toggle(appStyles.phoneDotPulse, count >= 3);
		dot.classList.toggle(appStyles.phoneDotUrgent, count >= 5);
	}
}

/** Renders the footer with skip/end day button. */
export function renderFooter(
	screenInfo: GameScreenInfo,
	onDecision: (decision: Decision) => void,
) {
	const s = strings();
	const skipBtn = document.querySelector(`.${appStyles.skipBtn}`);

	if (!skipBtn) return;

	// Remove old listeners by cloning
	const newBtn = skipBtn.cloneNode(true) as HTMLButtonElement;
	skipBtn.parentNode?.replaceChild(newBtn, skipBtn);
	// Clear tooltip init flag so initTooltips re-initializes after cloning
	delete newBtn.dataset.tooltipInit;

	if (screenInfo.isWeekend) {
		// Weekend: single "End day" button
		newBtn.textContent = s.game.endDay;
		newBtn.disabled = false;
		newBtn.addEventListener("click", () => {
			onDecision({ type: "endDay" });
		});
	} else {
		// Weekday: skip to next block or end day
		if (screenInfo.nextTimeBlock) {
			newBtn.textContent = s.game.skipTo(screenInfo.nextTimeBlock);
			newBtn.disabled = false;
			newBtn.addEventListener("click", () => {
				onDecision({ type: "skip" });
			});
			// Random tooltip on hover (set initial so initTooltips picks it up)
			const skipTips = s.tooltips.skip;
			newBtn.dataset.tooltip =
				skipTips[Math.floor(Math.random() * skipTips.length)];
			newBtn.addEventListener("mouseenter", () => {
				newBtn.dataset.tooltip =
					skipTips[Math.floor(Math.random() * skipTips.length)];
			});
		} else {
			newBtn.textContent = s.game.endDay;
			newBtn.disabled = false;
			newBtn.addEventListener("click", () => {
				onDecision({ type: "skip" });
			});
		}
	}
}

/**
 * Gets the display name for a task, adding context on weekends.
 * Adds time qualifier for time-specific tasks and point cost for expensive tasks.
 */
function getTaskDisplayName(task: TaskDisplay, weekend: boolean): string {
	const s = strings();
	let name = task.name;

	if (weekend) {
		// Add time qualifier for tasks limited to specific time blocks
		if (
			task.availableBlocks.length === 1 ||
			(task.availableBlocks.length === 2 &&
				!task.availableBlocks.includes("afternoon"))
		) {
			// Single block or morning+evening (like shower) - show primary block
			const block = task.availableBlocks[0];
			if (block) {
				name = s.game.taskWithTime(name, block);
			}
		}

		// Add point cost for expensive tasks
		if (task.weekendCost > 1) {
			name = s.game.taskWithCost(name, task.weekendCost);
		}
	}

	return name;
}
