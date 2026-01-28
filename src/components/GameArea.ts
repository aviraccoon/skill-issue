/**
 * Visual game area component.
 * Renders a seed-generated pixel art room with character, dog, and furniture.
 * This is output-only - no interaction, just displays animation state.
 */

import { getDogDoorPosition, getTaskFurnitureRect } from "../data/roomLayout";
import type { PhoneOutcome } from "../data/scrollTrap";
import type { TaskId } from "../data/tasks";
import type {
	DogMoodState,
	ItemVariants,
	RoomLayout,
	RoomRenderer,
	SeedPalette,
	ThemeColors,
	TimePalette,
} from "../rendering/types";
import type { AnimationState } from "../systems/animation";
import type { DogUrgency } from "../systems/dog";

/** Props for rendering the game area. */
export interface GameAreaProps {
	/** Current animation state, or null for idle. */
	animationState: AnimationState | null;
	/** Player energy (0-1) for dog mood. */
	energy: number;
	/** Currently selected task ID, for position highlighting. */
	selectedTaskId: TaskId | null;
	/** Last phone check outcome (for dog reactions). */
	lastPhoneOutcome: PhoneOutcome | null;
	/** Timestamp of last phone check. */
	lastPhoneTime: number;
	/** Last task attempt outcome (for dog reactions). */
	lastTaskOutcome: "success" | "failure" | null;
	/** Timestamp of last task attempt. */
	lastTaskTime: number;
	/** Dog walk urgency level. */
	dogUrgency: DogUrgency;
	/** Generated room layout. */
	layout: RoomLayout;
	/** Art style renderer. */
	renderer: RoomRenderer;
	/** Time-of-day palette. */
	timePalette: TimePalette;
	/** Seed-derived color palette. */
	seedPalette: SeedPalette;
	/** Seed-derived item variants. */
	variants: ItemVariants;
	/** Theme colors for highlights. */
	themeColors: ThemeColors;
}

/** How long dog reacts to phone checks (ms). */
const PHONE_REACTION_DURATION = 2500;

/** How long dog reacts to task outcomes (ms). */
const TASK_REACTION_DURATION = 2000;

/** Returns how far toward the door the dog should be based on urgency (0-1). */
function getUrgencyProgress(urgency: DogUrgency): number {
	switch (urgency) {
		case "waiting":
			return 0.15;
		case "urgent":
			return 0.4;
		case "critical":
			return 0.7;
		default:
			return 0;
	}
}

/**
 * Tracks the dog's last rendered position (when not animating).
 * Used as start point when walk-dog animation begins.
 */
let lastIdleDogPos = { x: 80, y: 110 };

/** Computes the dog's mood state from game props. */
function computeDogMood(props: GameAreaProps): DogMoodState {
	const {
		animationState: animState,
		selectedTaskId,
		energy,
		dogUrgency: urgency,
	} = props;

	const isWalkDogAttempt = animState?.taskId === "walk-dog";
	const isWalkDogAnimating =
		isWalkDogAttempt &&
		animState &&
		(animState.phase === "walking" ||
			animState.phase === "atTask" ||
			animState.phase === "returning");

	const isDisappointed = isWalkDogAttempt && animState?.succeeded === false;
	const isExcited =
		isWalkDogAttempt &&
		animState?.phase === "walking" &&
		animState.succeeded === null;
	const isHopeful =
		!isExcited &&
		!isDisappointed &&
		selectedTaskId === "walk-dog" &&
		animState?.phase !== "returning";

	// Check for recent phone reaction
	const timeSincePhone = performance.now() - props.lastPhoneTime;
	const isReactingToPhone =
		props.lastPhoneOutcome !== null && timeSincePhone < PHONE_REACTION_DURATION;
	const isUnimpressed =
		isReactingToPhone &&
		(props.lastPhoneOutcome === "void" ||
			props.lastPhoneOutcome === "scrollHole");
	const isInterested =
		isReactingToPhone &&
		(props.lastPhoneOutcome === "somethingNice" ||
			props.lastPhoneOutcome === "usefulFind");

	// Check for recent task outcome reaction
	const timeSinceTask = performance.now() - props.lastTaskTime;
	const isReactingToTask =
		!isWalkDogAnimating &&
		props.lastTaskOutcome !== null &&
		timeSinceTask < TASK_REACTION_DURATION;
	const isHappyForYou = isReactingToTask && props.lastTaskOutcome === "success";
	const isSympathetic = isReactingToTask && props.lastTaskOutcome === "failure";

	const isRestless =
		!isExcited &&
		!isDisappointed &&
		!isHopeful &&
		!isReactingToPhone &&
		!isReactingToTask &&
		(urgency === "urgent" || urgency === "critical");

	// Priority order
	if (isDisappointed) return "disappointed";
	if (isExcited) return "excited";
	if (isHopeful) return "hopeful";
	if (isHappyForYou) return "happyForYou";
	if (isSympathetic) return "sympathetic";
	if (isUnimpressed) return "unimpressed";
	if (isInterested) return "interested";
	if (isRestless) return "restless";

	void energy; // energy affects renderer's visual expression directly
	return "normal";
}

/** Computes the dog's current position from game props. */
function computeDogPosition(props: GameAreaProps): { x: number; y: number } {
	const { animationState: animState, dogUrgency: urgency, layout } = props;
	const dogHome = layout.dogPos;
	const dogDoor = getDogDoorPosition(layout);

	const isWalkDogAttempt = animState?.taskId === "walk-dog";
	const isWalkDogAnimating =
		isWalkDogAttempt &&
		animState &&
		(animState.phase === "walking" ||
			animState.phase === "atTask" ||
			animState.phase === "returning");

	if (isWalkDogAnimating && animState) {
		if (animState.phase === "walking" || animState.phase === "atTask") {
			const progress = animState.walkProgress;
			return {
				x: lastIdleDogPos.x + (dogDoor.x - lastIdleDogPos.x) * progress,
				y: lastIdleDogPos.y + (dogDoor.y - lastIdleDogPos.y) * progress,
			};
		}
		if (animState.phase === "returning") {
			const progress = animState.walkProgress;
			const urgencyProgress = getUrgencyProgress(urgency);
			const homePos = {
				x: dogHome.x + (dogDoor.x - dogHome.x) * urgencyProgress,
				y: dogHome.y + (dogDoor.y - dogHome.y) * urgencyProgress,
			};
			return {
				x: dogDoor.x + (homePos.x - dogDoor.x) * progress,
				y: dogDoor.y + (homePos.y - dogDoor.y) * progress,
			};
		}
	}

	// Not in walk-dog animation - position based on urgency
	const urgencyProgress = getUrgencyProgress(urgency);
	const baseX = dogHome.x + (dogDoor.x - dogHome.x) * urgencyProgress;
	const baseY = dogHome.y + (dogDoor.y - dogHome.y) * urgencyProgress;

	let restlessOffset = 0;
	if (urgency === "urgent") {
		restlessOffset = Math.sin(performance.now() / 800) * 2;
	} else if (urgency === "critical") {
		restlessOffset = Math.sin(performance.now() / 400) * 4;
	}

	const pos = { x: baseX + restlessOffset, y: baseY };
	lastIdleDogPos = { ...pos };
	return pos;
}

/**
 * Renders the game area to a canvas.
 * Call this each frame when animating.
 */
export function renderGameArea(
	canvas: HTMLCanvasElement,
	props: GameAreaProps,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const { layout, renderer, timePalette, seedPalette, variants, themeColors } =
		props;

	// Disable smoothing for crisp pixel art
	ctx.imageSmoothingEnabled = false;

	// Scale for rendering
	ctx.save();
	const scale = canvas.width / layout.roomWidth;
	ctx.scale(scale, scale);

	// Draw room (background, furniture, decor)
	renderer.drawRoom(ctx, layout, { timePalette, seedPalette, variants });

	// Highlight selected task's furniture (before character/dog, only when idle)
	const isIdle = !props.animationState || props.animationState.phase === "idle";
	if (props.selectedTaskId && isIdle) {
		const furnitureRect = getTaskFurnitureRect(props.selectedTaskId, layout);
		if (furnitureRect) {
			renderer.highlightFurniture(
				ctx,
				furnitureRect,
				layout,
				themeColors.highlight,
				themeColors.highlightBorder,
			);
		}
	}

	// Compute dog state
	const dogMood = computeDogMood(props);
	const dogPos = computeDogPosition(props);

	// Draw dog (before character for layering)
	renderer.drawDog(
		ctx,
		dogPos.x,
		dogPos.y,
		variants.dog,
		timePalette,
		dogMood,
		props.energy,
	);

	// Draw character
	const charPos = props.animationState
		? { x: props.animationState.characterX, y: props.animationState.characterY }
		: layout.charPos;
	renderer.drawCharacter(
		ctx,
		charPos.x,
		charPos.y,
		variants.character,
		timePalette,
		props.animationState,
	);

	ctx.restore();
}
