/**
 * Visual game area component.
 * Renders a pixel art room with character, dog, and furniture.
 * This is output-only - no interaction, just displays animation state.
 */

import {
	CHARACTER,
	CHARACTER_START,
	DOG,
	DOG_POSITION,
	FURNITURE,
	getTaskPosition,
	ROOM,
} from "../data/roomLayout";
import type { PhoneOutcome } from "../data/scrollTrap";
import type { TaskId } from "../data/tasks";
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
}

/** Theme colors for the game area, read from CSS variables. */
interface GameAreaColors {
	floor: string;
	wall: string;
	highlight: string;
	highlightBorder: string;
}

/** Default colors (cozy/paper feel). */
const DEFAULT_COLORS: GameAreaColors = {
	floor: "#e8e4d9",
	wall: "#d4cfc4",
	highlight: "rgba(94, 106, 210, 0.15)",
	highlightBorder: "rgba(94, 106, 210, 0.4)",
};

/** Cached colors from CSS variables. */
let cachedColors: GameAreaColors | null = null;
let lastTheme: string | null = null;

/**
 * Gets theme colors from CSS variables.
 * Caches the result until theme changes.
 */
function getThemeColors(): GameAreaColors {
	const currentTheme = document.documentElement.dataset.theme ?? null;

	// Return cached if theme hasn't changed
	if (cachedColors && lastTheme === currentTheme) {
		return cachedColors;
	}

	// Read from CSS variables
	const style = getComputedStyle(document.documentElement);
	const floor = style.getPropertyValue("--game-area-floor").trim();
	const wall = style.getPropertyValue("--game-area-wall").trim();
	const highlight = style.getPropertyValue("--game-area-highlight").trim();
	const highlightBorder = style
		.getPropertyValue("--game-area-highlight-border")
		.trim();

	cachedColors = {
		floor: floor || DEFAULT_COLORS.floor,
		wall: wall || DEFAULT_COLORS.wall,
		highlight: highlight || DEFAULT_COLORS.highlight,
		highlightBorder: highlightBorder || DEFAULT_COLORS.highlightBorder,
	};
	lastTheme = currentTheme;

	return cachedColors;
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

	// Get theme colors (cached)
	const colors = getThemeColors();

	// Disable smoothing for crisp pixel art
	ctx.imageSmoothingEnabled = false;

	// Scale for rendering
	ctx.save();
	ctx.scale(ROOM.scale, ROOM.scale);

	// Clear and draw background
	drawBackground(ctx, colors);

	// Draw task position highlight (before furniture so it appears underneath)
	// Only show when idle (not during walking animation)
	const isIdle = !props.animationState || props.animationState.phase === "idle";
	if (props.selectedTaskId && isIdle) {
		drawTaskHighlight(ctx, props.selectedTaskId, colors);
	}

	// Draw furniture
	drawFurniture(ctx);

	// Draw dog (before character so character renders on top if overlapping)
	drawDog(
		ctx,
		props.energy,
		props.animationState,
		props.selectedTaskId,
		props.lastPhoneOutcome,
		props.lastPhoneTime,
		props.lastTaskOutcome,
		props.lastTaskTime,
		props.dogUrgency,
	);

	// Draw character
	const charPos = props.animationState
		? { x: props.animationState.characterX, y: props.animationState.characterY }
		: CHARACTER_START;
	drawCharacter(ctx, charPos, props.animationState);

	ctx.restore();
}

/** Draws the room background (wall and floor). */
function drawBackground(
	ctx: CanvasRenderingContext2D,
	colors: GameAreaColors,
): void {
	// Wall (top half)
	ctx.fillStyle = colors.wall;
	ctx.fillRect(0, 0, ROOM.width, ROOM.height * 0.4);

	// Floor (bottom portion)
	ctx.fillStyle = colors.floor;
	ctx.fillRect(0, ROOM.height * 0.4, ROOM.width, ROOM.height * 0.6);

	// Simple floor line (darken floor color for the line)
	ctx.strokeStyle = darken(colors.floor, 0.1);
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, ROOM.height * 0.4);
	ctx.lineTo(ROOM.width, ROOM.height * 0.4);
	ctx.stroke();
}

/** Draws a highlight at the selected task's target position. */
function drawTaskHighlight(
	ctx: CanvasRenderingContext2D,
	taskId: TaskId,
	colors: GameAreaColors,
): void {
	const pos = getTaskPosition(taskId);
	const radius = 18;

	// Filled highlight area
	ctx.fillStyle = colors.highlight;
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
	ctx.fill();

	// Border ring
	ctx.strokeStyle = colors.highlightBorder;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
	ctx.stroke();
}

/** Draws all furniture pieces. */
function drawFurniture(ctx: CanvasRenderingContext2D): void {
	for (const piece of Object.values(FURNITURE)) {
		// Main shape
		ctx.fillStyle = piece.color;
		ctx.fillRect(piece.x, piece.y, piece.w, piece.h);

		// Simple outline
		ctx.strokeStyle = darken(piece.color, 0.3);
		ctx.lineWidth = 1;
		ctx.strokeRect(piece.x + 0.5, piece.y + 0.5, piece.w - 1, piece.h - 1);

		// Label (small text for programmer art clarity)
		if (piece.label) {
			ctx.fillStyle = "#333";
			ctx.font = "6px monospace";
			ctx.textAlign = "center";
			ctx.fillText(
				piece.label,
				piece.x + piece.w / 2,
				piece.y + piece.h / 2 + 2,
			);
		}
	}
}

/** Position near the door where dog waits for walks. */
const DOG_DOOR_POSITION = { x: 190, y: 130 };

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
let lastIdleDogPos = { ...DOG_POSITION };

/** Draws the dog. */
function drawDog(
	ctx: CanvasRenderingContext2D,
	energy: number,
	animState: AnimationState | null,
	selectedTaskId: TaskId | null,
	lastPhoneOutcome: PhoneOutcome | null,
	lastPhoneTime: number,
	lastTaskOutcome: "success" | "failure" | null,
	lastTaskTime: number,
	urgency: DogUrgency,
): void {
	const { width, height, bodyColor, earColor } = DOG;

	// Determine dog position based on animation state and urgency
	let dogPos = { ...DOG_POSITION };
	const isWalkDogAttempt = animState?.taskId === "walk-dog";
	const isWalkDogAnimating =
		isWalkDogAttempt &&
		animState &&
		(animState.phase === "walking" ||
			animState.phase === "atTask" ||
			animState.phase === "returning");

	if (isWalkDogAnimating && animState) {
		// Dog follows character toward door during walk-dog attempt
		// Use lastIdleDogPos as start to prevent jumps from urgency position
		if (animState.phase === "walking" || animState.phase === "atTask") {
			const progress = animState.walkProgress;
			dogPos = {
				x:
					lastIdleDogPos.x +
					(DOG_DOOR_POSITION.x - lastIdleDogPos.x) * progress,
				y:
					lastIdleDogPos.y +
					(DOG_DOOR_POSITION.y - lastIdleDogPos.y) * progress,
			};
		} else if (animState.phase === "returning") {
			// Return toward the urgency-adjusted home position
			const progress = animState.walkProgress;
			const urgencyProgress = getUrgencyProgress(urgency);
			const homePos = {
				x:
					DOG_POSITION.x +
					(DOG_DOOR_POSITION.x - DOG_POSITION.x) * urgencyProgress,
				y:
					DOG_POSITION.y +
					(DOG_DOOR_POSITION.y - DOG_POSITION.y) * urgencyProgress,
			};
			dogPos = {
				x: DOG_DOOR_POSITION.x + (homePos.x - DOG_DOOR_POSITION.x) * progress,
				y: DOG_DOOR_POSITION.y + (homePos.y - DOG_DOOR_POSITION.y) * progress,
			};
		}
	} else {
		// Not in walk-dog animation - position based on urgency
		const urgencyProgress = getUrgencyProgress(urgency);
		const baseX =
			DOG_POSITION.x + (DOG_DOOR_POSITION.x - DOG_POSITION.x) * urgencyProgress;
		const baseY =
			DOG_POSITION.y + (DOG_DOOR_POSITION.y - DOG_POSITION.y) * urgencyProgress;

		// Add restless movement for higher urgency levels
		let restlessOffset = 0;
		if (urgency === "urgent") {
			restlessOffset = Math.sin(performance.now() / 800) * 2;
		} else if (urgency === "critical") {
			restlessOffset = Math.sin(performance.now() / 400) * 4;
		}

		dogPos = { x: baseX + restlessOffset, y: baseY };

		// Store idle position for use as animation start point
		lastIdleDogPos = { ...dogPos };
	}

	const { x, y } = dogPos;

	// Check for recent phone reaction
	const timeSincePhone = performance.now() - lastPhoneTime;
	const isReactingToPhone =
		lastPhoneOutcome !== null && timeSincePhone < PHONE_REACTION_DURATION;

	// Phone reactions: unimpressed (void/scrollHole) or interested (somethingNice/usefulFind)
	const isUnimpressed =
		isReactingToPhone &&
		(lastPhoneOutcome === "void" || lastPhoneOutcome === "scrollHole");
	const isInterested =
		isReactingToPhone &&
		(lastPhoneOutcome === "somethingNice" || lastPhoneOutcome === "usefulFind");

	// Check for recent task outcome reaction (only when not in walk-dog animation)
	const timeSinceTask = performance.now() - lastTaskTime;
	const isReactingToTask =
		!isWalkDogAnimating &&
		lastTaskOutcome !== null &&
		timeSinceTask < TASK_REACTION_DURATION;

	// Task reactions: happy (success) or sympathetic (failure)
	const isHappyForYou = isReactingToTask && lastTaskOutcome === "success";
	const isSympathetic = isReactingToTask && lastTaskOutcome === "failure";

	// Determine dog mood (priority: walk-dog states > task reactions > phone reactions > restless > normal)
	const isDisappointed = isWalkDogAttempt && animState?.succeeded === false;
	const isExcited =
		isWalkDogAttempt &&
		animState?.phase === "walking" &&
		animState.succeeded === null;
	// Hopeful: walk-dog is selected but not yet being attempted
	const isHopeful =
		!isExcited &&
		!isDisappointed &&
		selectedTaskId === "walk-dog" &&
		animState?.phase !== "returning";
	// Restless: urgency is high and not already in another mood state
	const isRestless =
		!isExcited &&
		!isDisappointed &&
		!isHopeful &&
		!isReactingToPhone &&
		!isReactingToTask &&
		(urgency === "urgent" || urgency === "critical");

	// Body color varies with mood and energy
	let currentBodyColor = bodyColor;
	if (isDisappointed) {
		currentBodyColor = darken(bodyColor, 0.15);
	} else if (!isExcited && !isHopeful && !isInterested && !isUnimpressed) {
		// Normal state: slightly desaturated when low energy
		if (energy < 0.3) {
			currentBodyColor = darken(bodyColor, 0.08);
		}
	}
	ctx.fillStyle = currentBodyColor;
	ctx.fillRect(x, y, width, height);

	// Ears (two small triangles on top)
	ctx.fillStyle = earColor;
	if (isDisappointed) {
		// Droopy ears - point outward/down
		ctx.beginPath();
		ctx.moveTo(x + 2, y + 2);
		ctx.lineTo(x - 1, y + 4);
		ctx.lineTo(x + 5, y + 2);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 5, y + 2);
		ctx.lineTo(x + width + 1, y + 4);
		ctx.lineTo(x + width - 2, y + 2);
		ctx.fill();
	} else if (isExcited) {
		// Perky ears - extra tall
		ctx.beginPath();
		ctx.moveTo(x + 2, y);
		ctx.lineTo(x + 5, y - 6);
		ctx.lineTo(x + 6, y);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 6, y);
		ctx.lineTo(x + width - 4, y - 6);
		ctx.lineTo(x + width - 2, y);
		ctx.fill();
	} else if (isHopeful || isInterested) {
		// Alert ears - slightly taller than normal, attentive
		ctx.beginPath();
		ctx.moveTo(x + 2, y);
		ctx.lineTo(x + 5, y - 5);
		ctx.lineTo(x + 6, y);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 6, y);
		ctx.lineTo(x + width - 4, y - 5);
		ctx.lineTo(x + width - 2, y);
		ctx.fill();
	} else if (isUnimpressed) {
		// Slightly flattened ears - unimpressed by phone scrolling
		ctx.beginPath();
		ctx.moveTo(x + 2, y + 1);
		ctx.lineTo(x + 4, y - 2);
		ctx.lineTo(x + 6, y + 1);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 6, y + 1);
		ctx.lineTo(x + width - 4, y - 2);
		ctx.lineTo(x + width - 2, y + 1);
		ctx.fill();
	} else if (isHappyForYou) {
		// Happy ears - perky and alert, you did it!
		ctx.beginPath();
		ctx.moveTo(x + 2, y);
		ctx.lineTo(x + 5, y - 5);
		ctx.lineTo(x + 6, y);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 6, y);
		ctx.lineTo(x + width - 4, y - 5);
		ctx.lineTo(x + width - 2, y);
		ctx.fill();
	} else if (isSympathetic) {
		// Sympathetic ears - tilted slightly inward, concerned
		ctx.beginPath();
		ctx.moveTo(x + 2, y);
		ctx.lineTo(x + 4, y - 4);
		ctx.lineTo(x + 6, y);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 6, y);
		ctx.lineTo(x + width - 4, y - 4);
		ctx.lineTo(x + width - 2, y);
		ctx.fill();
	} else if (isRestless) {
		// Alert, twitchy ears - oscillate slightly
		const twitch = Math.sin(performance.now() / 150) * 0.5;
		ctx.beginPath();
		ctx.moveTo(x + 2, y);
		ctx.lineTo(x + 5, y - 5 + twitch);
		ctx.lineTo(x + 6, y);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 6, y);
		ctx.lineTo(x + width - 4, y - 5 - twitch); // Opposite phase for asymmetry
		ctx.lineTo(x + width - 2, y);
		ctx.fill();
	} else {
		// Normal ears - height varies with energy
		// High energy (>0.6): taller ears, more alert
		// Low energy (<0.3): shorter ears, tired
		// Middle: standard
		const earHeight = energy > 0.6 ? -5 : energy < 0.3 ? -3 : -4;
		ctx.beginPath();
		ctx.moveTo(x + 2, y);
		ctx.lineTo(x + 5, y + earHeight);
		ctx.lineTo(x + 6, y);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(x + width - 6, y);
		ctx.lineTo(x + width - 4, y + earHeight);
		ctx.lineTo(x + width - 2, y);
		ctx.fill();
	}

	// Face - eyes vary with mood and energy
	ctx.fillStyle = "#333";
	if (isDisappointed) {
		// Sad eyes - small lines instead of dots
		ctx.fillRect(x + 2, y + 4, 3, 1);
		ctx.fillRect(x + width - 5, y + 4, 3, 1);
	} else if (
		!isExcited &&
		!isHopeful &&
		!isInterested &&
		!isUnimpressed &&
		!isHappyForYou &&
		!isSympathetic &&
		!isRestless &&
		energy < 0.25
	) {
		// Very tired - half-closed eyes (shorter height)
		ctx.fillRect(x + 3, y + 4, 2, 1);
		ctx.fillRect(x + width - 5, y + 4, 2, 1);
	} else {
		// Normal eyes
		ctx.fillRect(x + 3, y + 3, 2, 2);
		ctx.fillRect(x + width - 5, y + 3, 2, 2);
	}

	// Tail (small line on the right, color matches body)
	ctx.strokeStyle = currentBodyColor;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x + width, y + height / 2);

	// Tail position varies with mood
	let tailEndY: number;
	if (isDisappointed) {
		tailEndY = y + height / 2 + 5; // Tail way down
	} else if (isExcited) {
		// Tail wagging - oscillates using time-based sine wave
		const wag = Math.sin(performance.now() / 80) * 3;
		tailEndY = y + height / 2 - 5 + wag;
	} else if (isHappyForYou) {
		// Happy tail wag - slower and gentler than excited
		const wag = Math.sin(performance.now() / 150) * 2;
		tailEndY = y + height / 2 - 4 + wag;
	} else if (isHopeful || isInterested) {
		tailEndY = y + height / 2 - 4; // Tail up, attentive
	} else if (isSympathetic) {
		tailEndY = y + height / 2 + 1; // Tail slightly down, concerned but not sad
	} else if (isUnimpressed) {
		tailEndY = y + height / 2 + 2; // Tail slightly down, unimpressed
	} else if (isRestless) {
		// Anxious tail - up but twitchy, faster than excited wag
		const twitch = Math.sin(performance.now() / 120) * 2;
		tailEndY = y + height / 2 - 4 + twitch;
	} else {
		tailEndY = energy > 0.5 ? y + height / 2 - 3 : y + height / 2 + 3;
	}
	ctx.lineTo(x + width + 4, tailEndY);
	ctx.stroke();

	// Snout
	ctx.fillStyle = darken(bodyColor, 0.1);
	ctx.fillRect(x + width / 2 - 2, y + height - 3, 4, 3);
}

/** Draws the character. */
function drawCharacter(
	ctx: CanvasRenderingContext2D,
	pos: { x: number; y: number },
	animState: AnimationState | null,
): void {
	const { width, height, color, outlineColor } = CHARACTER;

	// Adjust position so character is centered on the pos
	const x = pos.x - width / 2;
	const y = pos.y - height;

	// Body (rectangle)
	ctx.fillStyle = color;
	ctx.fillRect(x, y, width, height);

	// Outline
	ctx.strokeStyle = outlineColor;
	ctx.lineWidth = 1;
	ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

	// Head (circle on top)
	const headRadius = width / 2;
	const headY = y - headRadius + 2;
	ctx.beginPath();
	ctx.arc(x + width / 2, headY, headRadius, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.fill();
	ctx.strokeStyle = outlineColor;
	ctx.stroke();

	// Eyes (two dots)
	ctx.fillStyle = "#333";
	ctx.fillRect(x + 3, headY - 1, 2, 2);
	ctx.fillRect(x + width - 5, headY - 1, 2, 2);

	// Show visual feedback based on animation state
	if (animState) {
		if (animState.succeeded === true && animState.phase === "atTask") {
			// Success indicator - brief green glow
			ctx.fillStyle = "rgba(100, 200, 100, 0.3)";
			ctx.beginPath();
			ctx.arc(x + width / 2, y + height / 2, width, 0, Math.PI * 2);
			ctx.fill();
		} else if (animState.succeeded === false && animState.phase !== "idle") {
			// Failure indicator - red tint on character
			ctx.fillStyle = "rgba(200, 100, 100, 0.2)";
			ctx.fillRect(x - 1, y - headRadius, width + 2, height + headRadius + 2);
		}
	}
}

/** Darkens a hex color by a factor (0-1). */
function darken(hex: string, factor: number): string {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	const nr = Math.round(r * (1 - factor));
	const ng = Math.round(g * (1 - factor));
	const nb = Math.round(b * (1 - factor));

	return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}
