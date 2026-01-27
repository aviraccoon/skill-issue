/**
 * Room layout configuration for the visual game area.
 * Defines furniture positions and task-to-location mappings.
 */

import type { TaskId } from "./tasks";

/** Room dimensions (in logical pixels, before scaling). */
export const ROOM = {
	width: 240,
	height: 160,
	scale: 2, // Render at 2x for crisp pixels
};

/** Furniture piece definition. */
export interface FurniturePiece {
	x: number;
	y: number;
	w: number;
	h: number;
	color: string;
	label?: string;
}

/** Room furniture layout. Colored rectangles for programmer art. */
export const FURNITURE: Record<string, FurniturePiece> = {
	bed: { x: 10, y: 10, w: 50, h: 30, color: "#4a6fa5", label: "Bed" },
	desk: { x: 70, y: 10, w: 40, h: 25, color: "#8b7355", label: "Desk" },
	couch: { x: 10, y: 70, w: 60, h: 25, color: "#5d8a5d", label: "Couch" },
	kitchen: { x: 130, y: 10, w: 50, h: 40, color: "#c9a959", label: "Kitchen" },
	bathroom: { x: 180, y: 70, w: 50, h: 40, color: "#7a7a7a", label: "Bath" },
	door: { x: 200, y: 120, w: 30, h: 40, color: "#6b4423", label: "Door" },
};

/** Position in the room. */
export interface Position {
	x: number;
	y: number;
}

/** Default position when task has no specific mapping. */
const DEFAULT_POSITION: Position = { x: 120, y: 100 };

/**
 * Task ID to room position mapping.
 * Character walks to these positions when attempting tasks.
 */
export const TASK_POSITIONS: Record<TaskId, Position> = {
	// Hygiene - bathroom area
	shower: { x: 195, y: 90 },
	"brush-teeth-morning": { x: 195, y: 90 },
	"brush-teeth-evening": { x: 195, y: 90 },

	// Food - kitchen area
	cook: { x: 145, y: 35 },
	delivery: { x: 25, y: 85 }, // Couch (ordering from phone)
	dishes: { x: 145, y: 35 },

	// Dog - door for walking
	"walk-dog": { x: 210, y: 135 },

	// Work/Creative - desk
	work: { x: 85, y: 25 },
	"practice-music": { x: 85, y: 25 },

	// Self-care / going out - door
	"go-outside": { x: 210, y: 135 },
	shopping: { x: 210, y: 135 },
	"social-event": { x: 210, y: 135 },
};

/** Gets the position for a task, with fallback to default. */
export function getTaskPosition(taskId: TaskId): Position {
	return TASK_POSITIONS[taskId] ?? DEFAULT_POSITION;
}

/** Character starting position (center-left of room). */
export const CHARACTER_START: Position = { x: 40, y: 100 };

/** Dog position (near character start). */
export const DOG_POSITION: Position = { x: 80, y: 110 };

/** Character visual dimensions. */
export const CHARACTER = {
	width: 12,
	height: 20,
	color: "#e8a87c", // Skin tone
	outlineColor: "#5c4033",
};

/** Dog visual dimensions. */
export const DOG = {
	width: 16,
	height: 12,
	bodyColor: "#d4a574",
	earColor: "#8b6914",
};
