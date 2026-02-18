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
	// Hygiene
	shower: "bathroom",
	"brush-teeth-morning": "bathroom",
	"brush-teeth-evening": "bathroom",
	// Food
	cook: "kitchen",
	delivery: "couch",
	"go-out-to-eat": "door",
	"make-coffee": "kitchen",
	// Chores
	dishes: "kitchen",
	laundry: "bathroom",
	"take-out-trash": "door",
	"tidy-up": "couch",
	shopping: "door",
	// Dog
	"walk-dog": "door",
	"feed-dog": "kitchen",
	"play-with-dog": "couch",
	"chill-with-dog": "couch",
	// Work
	work: "desk",
	// Creative
	"practice-music": "desk",
	"draw-sketch": "desk",
	write: "desk",
	exercise: "door",
	// Social
	"social-event": "door",
	"meet-friend": "door",
	"text-someone": "couch",
	// Self-care
	"go-outside": "door",
	"take-meds": "bathroom",
	read: "couch",
	meditate: "bed",
	// Obligations (injected by events)
	"dentist-visit": "door",
	"vet-visit": "door",
	"work-deadline": "desk",
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
