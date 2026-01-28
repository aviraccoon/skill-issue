/**
 * Room layout configuration for the visual game area.
 * Maps task IDs to furniture positions in generated layouts.
 */

import type { FurnitureName, Position, RoomLayout } from "../rendering/types";
import type { TaskId } from "./tasks";

/** Room display scale factor. */
export const ROOM_SCALE = 2;

/** Maps task IDs to furniture names. */
const TASK_FURNITURE_MAP: Record<TaskId, FurnitureName> = {
	shower: "bathroom",
	"brush-teeth-morning": "bathroom",
	"brush-teeth-evening": "bathroom",
	cook: "kitchen",
	delivery: "couch",
	dishes: "kitchen",
	"walk-dog": "door",
	work: "desk",
	"practice-music": "desk",
	"go-outside": "door",
	shopping: "door",
	"social-event": "door",
};

/**
 * Gets the furniture rect associated with a task, if any.
 */
export function getTaskFurnitureRect(
	taskId: TaskId,
	layout: RoomLayout,
): import("../rendering/types").Rect | undefined {
	const furnitureName = TASK_FURNITURE_MAP[taskId];
	return furnitureName ? layout.furniture[furnitureName] : undefined;
}

/**
 * Gets the character target position for a task in a generated layout.
 * Returns center-front of the mapped furniture piece.
 */
export function getTaskPosition(taskId: TaskId, layout: RoomLayout): Position {
	const furnitureName = TASK_FURNITURE_MAP[taskId];
	const rect = furnitureName ? layout.furniture[furnitureName] : undefined;

	if (rect) {
		return {
			x: rect.x + rect.w / 2,
			y: rect.y + rect.h + 4,
		};
	}

	// Fallback: center of room
	return { x: layout.roomWidth / 2, y: layout.roomHeight * 0.75 };
}

/** Position near the door where dog waits for walks. */
export function getDogDoorPosition(layout: RoomLayout): Position {
	const door = layout.furniture.door;
	if (door) {
		return { x: door.x + door.w / 2, y: door.y + door.h - 4 };
	}
	return { x: layout.roomWidth - 30, y: layout.roomHeight - 20 };
}
