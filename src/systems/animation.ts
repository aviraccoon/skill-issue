/**
 * Animation system for the visual game area.
 * Handles character movement and task attempt animations.
 */

import { getTaskPosition } from "../data/roomLayout";
import type { TaskId } from "../data/tasks";
import type { Position, RoomLayout } from "../rendering/types";

/** When during the approach the failure becomes visible. */
export type FailureTiming = "immediate" | "midway" | "atTask";

/** Current phase of the animation. */
export type AnimationPhase = "idle" | "walking" | "atTask" | "returning";

/** Current state of the animation, used for rendering. */
export interface AnimationState {
	phase: AnimationPhase;
	characterX: number;
	characterY: number;
	targetX: number;
	targetY: number;
	/** Whether the attempt succeeded. null = still unknown. */
	succeeded: boolean | null;
	/** Progress through current walk (0-1). */
	walkProgress: number;
	/** The task being attempted (for task-specific reactions like dog following). */
	taskId: TaskId | null;
}

/** Controller for managing task attempt animations. */
export interface AnimationController {
	/** Get current animation state for rendering. */
	getState(): AnimationState;
	/** Start a task attempt animation. Returns when complete. */
	playTaskAttempt(taskId: TaskId): Promise<void>;
	/** Set the result of the attempt (called when executeDecision completes). */
	setResult(succeeded: boolean, timing?: FailureTiming): void;
	/** Cancel any running animation. */
	cancel(): void;
	/** Clean up resources. */
	destroy(): void;
}

/** Animation timing constants. */
const WALK_SPEED = 80; // pixels per second
const FAILURE_PAUSE_MS = 400; // pause before returning on failure
const SUCCESS_PAUSE_MS = 300; // brief pause on success
const AT_TASK_FREEZE_MS = 600; // freeze at task on atTask failure

/**
 * Picks failure timing based on a seed value.
 * Distribution: 30% immediate, 40% midway, 30% atTask
 */
export function pickFailureTiming(seed: number): FailureTiming {
	// Simple hash to get a value between 0-1
	const hash = Math.abs(Math.sin(seed * 9999.137)) % 1;
	if (hash < 0.3) return "immediate";
	if (hash < 0.7) return "midway";
	return "atTask";
}

/**
 * Creates an animation controller for the game area.
 * @param onFrame Callback to trigger re-render each frame
 * @param layout Generated room layout (positions derived from furniture)
 */
export function createAnimationController(
	onFrame: () => void,
	layout: RoomLayout,
): AnimationController {
	const characterStart = layout.charPos;

	const state: AnimationState = {
		phase: "idle",
		characterX: characterStart.x,
		characterY: characterStart.y,
		targetX: characterStart.x,
		targetY: characterStart.y,
		succeeded: null,
		walkProgress: 0,
		taskId: null,
	};

	let animationFrameId: number | null = null;
	let resolveAnimation: (() => void) | null = null;
	let resultReceived = false;
	let pendingResult: { succeeded: boolean; timing?: FailureTiming } | null =
		null;

	/** Distance between two points. */
	function distance(from: Position, to: Position): number {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/** Linear interpolation. */
	function lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}

	/** Easing function for smoother movement. */
	function easeInOutQuad(t: number): number {
		return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
	}

	/** Sleep for a duration. */
	function sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/** Animate walking from current position to target. */
	async function walkTo(target: Position): Promise<boolean> {
		const startX = state.characterX;
		const startY = state.characterY;
		const dist = distance({ x: startX, y: startY }, target);

		if (dist < 1) return true; // Already there

		const duration = (dist / WALK_SPEED) * 1000;
		const startTime = performance.now();

		return new Promise((resolve) => {
			function frame() {
				const elapsed = performance.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);

				state.walkProgress = progress;
				const eased = easeInOutQuad(progress);
				state.characterX = lerp(startX, target.x, eased);
				state.characterY = lerp(startY, target.y, eased);
				onFrame();

				if (progress < 1) {
					animationFrameId = requestAnimationFrame(frame);
				} else {
					resolve(true); // Completed
				}
			}

			animationFrameId = requestAnimationFrame(frame);
		});
	}

	/** Main animation sequence for a task attempt. */
	async function runAnimation(taskId: TaskId): Promise<void> {
		const target = getTaskPosition(taskId, layout);
		state.targetX = target.x;
		state.targetY = target.y;
		state.phase = "walking";
		state.succeeded = null;
		state.walkProgress = 0;
		state.taskId = taskId;
		resultReceived = false;
		pendingResult = null;

		// Start walking toward target
		// We'll check for result during the walk
		const walkPromise = new Promise<void>((resolve) => {
			let completed = false;

			// Walk loop - check for result periodically
			const startX = state.characterX;
			const startY = state.characterY;
			const dist = distance({ x: startX, y: startY }, target);
			const duration = (dist / WALK_SPEED) * 1000;
			const startTime = performance.now();

			function frame() {
				// Check if result arrived
				if (pendingResult !== null && !completed) {
					const { succeeded, timing } = pendingResult;
					state.succeeded = succeeded;

					if (!succeeded && timing) {
						// Determine stop point based on timing
						let stopProgress: number;
						switch (timing) {
							case "immediate":
								stopProgress = 0.15; // Barely started
								break;
							case "midway":
								stopProgress = 0.5; // Halfway
								break;
							case "atTask":
								stopProgress = 1.0; // Go all the way
								break;
						}

						const elapsed = performance.now() - startTime;
						const currentProgress = Math.min(elapsed / duration, 1);

						if (currentProgress >= stopProgress) {
							// Already past stop point or at it
							completed = true;
							resolve();
							return;
						}
					}
					// Success - continue to target (no early exit)
				}

				const elapsed = performance.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);

				state.walkProgress = progress;
				const eased = easeInOutQuad(progress);
				state.characterX = lerp(startX, target.x, eased);
				state.characterY = lerp(startY, target.y, eased);
				onFrame();

				if (progress < 1 && !completed) {
					animationFrameId = requestAnimationFrame(frame);
				} else {
					completed = true;
					resolve();
				}
			}

			animationFrameId = requestAnimationFrame(frame);
		});

		await walkPromise;

		// Wait for result if we haven't received it yet
		while (!resultReceived) {
			await sleep(16);
		}

		// At this point pendingResult is guaranteed to be set (resultReceived is true)
		if (!pendingResult) {
			// Defensive check - should never happen
			state.phase = "idle";
			onFrame();
			return;
		}

		const { succeeded, timing } = pendingResult;

		if (succeeded) {
			// Success - brief pause at task
			state.phase = "atTask";
			onFrame();
			await sleep(SUCCESS_PAUSE_MS);
		} else {
			// Failure - behavior depends on timing
			if (timing === "atTask") {
				// Made it to task, freeze, then return
				state.phase = "atTask";
				onFrame();
				await sleep(AT_TASK_FREEZE_MS);
			} else {
				// Stopped early - brief pause
				await sleep(FAILURE_PAUSE_MS);
			}

			// Return to start
			state.phase = "returning";
			await walkTo(characterStart);
		}

		// Done
		state.phase = "idle";
		state.taskId = null;
		onFrame();
	}

	return {
		getState(): AnimationState {
			return { ...state };
		},

		async playTaskAttempt(taskId: TaskId): Promise<void> {
			return new Promise((resolve) => {
				resolveAnimation = resolve;
				runAnimation(taskId).then(() => {
					resolveAnimation = null;
					resolve();
				});
			});
		},

		setResult(succeeded: boolean, timing?: FailureTiming): void {
			pendingResult = { succeeded, timing };
			resultReceived = true;
		},

		cancel(): void {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
			state.phase = "idle";
			state.characterX = characterStart.x;
			state.characterY = characterStart.y;
			state.succeeded = null;
			if (resolveAnimation) {
				resolveAnimation();
				resolveAnimation = null;
			}
			onFrame();
		},

		destroy(): void {
			this.cancel();
		},
	};
}
