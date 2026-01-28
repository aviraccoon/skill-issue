/**
 * Seed-based room layout generation.
 * Places furniture, decor, character, and dog using collision detection.
 * Supports single rooms and multi-room apartments.
 */

import type {
	Apartment,
	FloorDecorItem,
	FloorDecorType,
	FurnitureDef,
	FurnitureName,
	Position,
	Rect,
	RoomConnection,
	RoomLayout,
	RoomType,
	RoomTypeDef,
	WallDecorItem,
	WallDecorType,
} from "./types";

/** Collision padding between furniture pieces. */
const PAD = 3;

/** Default room dimensions. */
export const DEFAULT_ROOM_WIDTH = 240;
export const DEFAULT_ROOM_HEIGHT = 160;

/** Furniture size and placement definitions. */
export const FURNITURE_DEFS: Record<FurnitureName, FurnitureDef> = {
	door: { w: 20, h: 44, placement: "rightWall" },
	bed: { w: 50, h: 26, placement: "backWall" },
	kitchen: { w: 46, h: 22, placement: "backWall" },
	bathroom: { w: 44, h: 22, placement: "backWall" },
	desk: { w: 36, h: 22, placement: "backWall" },
	couch: { w: 52, h: 20, placement: "floor" },
};

/** Room type definitions for multi-room apartments. */
export const ROOM_TYPES: Record<RoomType, RoomTypeDef> = {
	bedroom: {
		minW: 200,
		maxW: 260,
		minH: 140,
		maxH: 180,
		furniture: ["bed", "desk"],
		label: "Bedroom",
	},
	living: {
		minW: 200,
		maxW: 280,
		minH: 140,
		maxH: 180,
		furniture: ["couch", "desk"],
		label: "Living Room",
	},
	kitchen: {
		minW: 160,
		maxW: 220,
		minH: 120,
		maxH: 160,
		furniture: ["kitchen"],
		label: "Kitchen",
	},
	bathroom: {
		minW: 120,
		maxW: 180,
		minH: 100,
		maxH: 140,
		furniture: ["bathroom"],
		label: "Bathroom",
	},
	hallway: {
		minW: 80,
		maxW: 120,
		minH: 140,
		maxH: 200,
		furniture: [],
		label: "Hallway",
	},
	study: {
		minW: 140,
		maxW: 200,
		minH: 120,
		maxH: 160,
		furniture: ["desk"],
		label: "Study",
	},
};

// --- Collision detection ---

function rectsOverlap(a: Rect, b: Rect): boolean {
	return (
		a.x < b.x + b.w + PAD &&
		a.x + a.w + PAD > b.x &&
		a.y < b.y + b.h + PAD &&
		a.y + a.h + PAD > b.y
	);
}

function rectInBounds(r: Rect, rw: number, rh: number): boolean {
	return r.x >= 2 && r.y >= 2 && r.x + r.w <= rw - 2 && r.y + r.h <= rh - 4;
}

// --- Single room placement ---

function tryPlace(
	rng: () => number,
	def: FurnitureDef,
	placed: Rect[],
	name: string,
	doorSide: "left" | "right",
	rw: number,
	rh: number,
	wallY: number,
	floorTop: number,
): Rect {
	for (let attempt = 0; attempt < 80; attempt++) {
		let x: number;
		let y: number;

		if (name === "door") {
			x = doorSide === "left" ? 1 : rw - def.w - 1;
			y = wallY - 18 + Math.floor(rng() * 8);
		} else if (def.placement === "backWall") {
			x = PAD + Math.floor(rng() * (rw - def.w - PAD * 2 - 24));
			y = floorTop + Math.floor(rng() * 6);
			const wallPick = rng();
			if (wallPick < 0.2) {
				x = 2;
				y = floorTop + Math.floor(rng() * (rh - floorTop - def.h - 8));
			} else if (wallPick < 0.35) {
				x = rw - def.w - 2;
				y = floorTop + Math.floor(rng() * 20);
			}
		} else if (def.placement === "sideWall") {
			const side = rng() < 0.5 ? "left" : "right";
			x = side === "left" ? 2 : rw - def.w - 2;
			y = floorTop + 4 + Math.floor(rng() * (rh - floorTop - def.h - 12));
		} else {
			x = 20 + Math.floor(rng() * (rw - def.w - 44));
			y = floorTop + 16 + Math.floor(rng() * (rh - floorTop - def.h - 22));
		}

		const candidate = { x, y, w: def.w, h: def.h };
		if (!rectInBounds(candidate, rw, rh)) continue;
		if (candidate.y < floorTop && name !== "door") continue;
		let collision = false;
		for (const p of placed) {
			if (rectsOverlap(candidate, p)) {
				collision = true;
				break;
			}
		}
		if (collision) continue;
		return candidate;
	}
	return { x: 4 + placed.length * 8, y: floorTop + 2, w: def.w, h: def.h };
}

function findOpenFloor(
	rng: () => number,
	placed: Rect[],
	w: number,
	h: number,
	rw: number,
	rh: number,
	floorTop: number,
): Position {
	for (let i = 0; i < 50; i++) {
		const x = 20 + rng() * (rw - 60);
		const y = floorTop + 20 + rng() * (rh - floorTop - h - 24);
		const candidate = { x: x - w / 2, y: y - h, w, h };
		let ok = true;
		for (const p of placed) {
			if (rectsOverlap(candidate, p)) {
				ok = false;
				break;
			}
		}
		if (ok) return { x, y };
	}
	return { x: rw / 2, y: rh * 0.75 };
}

function findNearby(
	rng: () => number,
	placed: Rect[],
	anchor: Position,
	w: number,
	h: number,
	rw: number,
	rh: number,
	floorTop: number,
): Position {
	for (let i = 0; i < 30; i++) {
		const angle = rng() * Math.PI * 2;
		const dist = 15 + rng() * 20;
		const x = anchor.x + Math.cos(angle) * dist;
		const y = anchor.y + Math.sin(angle) * dist * 0.5;
		const candidate = { x, y, w, h };
		if (!rectInBounds(candidate, rw, rh)) continue;
		if (candidate.y < floorTop) continue;
		let ok = true;
		for (const p of placed) {
			if (rectsOverlap(candidate, p)) {
				ok = false;
				break;
			}
		}
		if (ok) return { x, y };
	}
	return { x: anchor.x + 25, y: anchor.y + 5 };
}

// --- Decor generation ---

const FLOOR_DECOR_TYPES: FloorDecorType[] = [
	"book",
	"mug",
	"plant",
	"laundry",
	"shoe",
	"paper",
	"bowl",
	"cushion",
	"bottle",
];

const WALL_DECOR_TYPES: WallDecorType[] = [
	"poster",
	"shelf",
	"clock",
	"mirror",
	"photo",
	"coathook",
	"calendar",
	"plant_hanging",
];

function generateDecor(
	rng: () => number,
	placed: Rect[],
	rw: number,
	rh: number,
	floorTop: number,
): FloorDecorItem[] {
	const items: FloorDecorItem[] = [];
	const count = 2 + Math.floor(rng() * 5);
	for (let i = 0; i < count; i++) {
		const type = FLOOR_DECOR_TYPES[
			Math.floor(rng() * FLOOR_DECOR_TYPES.length)
		] as FloorDecorType;
		const size = 3 + rng() * 4;
		for (let t = 0; t < 15; t++) {
			const x = 8 + rng() * (rw - 16);
			const y = floorTop + 5 + rng() * (rh - floorTop - 10);
			const candidate = {
				x: x - size,
				y: y - size,
				w: size * 2,
				h: size * 2,
			};
			let ok = true;
			for (const p of placed) {
				if (rectsOverlap(candidate, p)) {
					ok = false;
					break;
				}
			}
			if (ok) {
				items.push({ type, x, y, rot: (rng() - 0.5) * 0.5, size });
				break;
			}
			if (t === 14) items.push({ type, x, y, rot: (rng() - 0.5) * 0.5, size });
		}
	}
	return items;
}

function generateWallDecor(
	rng: () => number,
	layout: Partial<Record<FurnitureName, Rect>>,
	rw: number,
	wallY: number,
): WallDecorItem[] {
	const items: WallDecorItem[] = [];
	const count = 2 + Math.floor(rng() * 4);
	for (let i = 0; i < count; i++) {
		const type = WALL_DECOR_TYPES[
			Math.floor(rng() * WALL_DECOR_TYPES.length)
		] as WallDecorType;
		let w: number;
		let h: number;
		switch (type) {
			case "poster":
				w = 14 + rng() * 10;
				h = 16 + rng() * 12;
				break;
			case "shelf":
				w = 20 + rng() * 16;
				h = 5 + rng() * 3;
				break;
			case "clock":
				w = 8 + rng() * 4;
				h = w;
				break;
			case "mirror":
				w = 10 + rng() * 8;
				h = 14 + rng() * 8;
				break;
			case "photo":
				w = 8 + rng() * 6;
				h = 6 + rng() * 5;
				break;
			case "coathook":
				w = 12 + rng() * 6;
				h = 6 + rng() * 4;
				break;
			case "calendar":
				w = 10 + rng() * 4;
				h = 12 + rng() * 4;
				break;
			case "plant_hanging":
				w = 10 + rng() * 6;
				h = 12 + rng() * 8;
				break;
		}
		w = Math.round(w);
		h = Math.round(h);

		let placed = false;
		for (let t = 0; t < 20; t++) {
			const x = 6 + Math.floor(rng() * (rw - w - 30));
			const y = 3 + Math.floor(rng() * (wallY - h - 16));
			let ok = true;
			for (const p of items) {
				if (
					x < p.x + p.w + 4 &&
					x + w + 4 > p.x &&
					y < p.y + p.h + 3 &&
					y + h + 3 > p.y
				) {
					ok = false;
					break;
				}
			}
			const winX = 30 + (((layout.desk?.x ?? 80) * 0.5) % 120);
			if (x < winX + 26 && x + w > winX - 4 && y < 28) {
				ok = false;
			}
			if (ok) {
				items.push({
					type,
					x,
					y,
					w,
					h,
					rot: (rng() - 0.5) * 0.1,
				});
				placed = true;
				break;
			}
		}
		// If all attempts fail, skip this item (don't force bad placement)
		void placed;
	}
	return items;
}

// --- Single room layout ---

/** Generates a single-room layout from seed RNG. */
export function generateSingleRoomLayout(
	rng: () => number,
	roomWidth = DEFAULT_ROOM_WIDTH,
	roomHeight = DEFAULT_ROOM_HEIGHT,
	topDown = false,
): RoomLayout {
	const wallY = topDown ? 0 : roomHeight * 0.38;
	const floorTop = topDown ? 4 : wallY + 4;
	const doorSide: "left" | "right" = rng() < 0.5 ? "left" : "right";

	const placed: Rect[] = [];
	const furniture: Partial<Record<FurnitureName, Rect>> = {};
	const order: FurnitureName[] = [
		"door",
		"bed",
		"kitchen",
		"bathroom",
		"desk",
		"couch",
	];

	for (const name of order) {
		const rect = tryPlace(
			rng,
			FURNITURE_DEFS[name],
			placed,
			name,
			doorSide,
			roomWidth,
			roomHeight,
			wallY,
			floorTop,
		);
		furniture[name] = rect;
		placed.push(rect);
	}

	const charPos = findOpenFloor(
		rng,
		placed,
		12,
		24,
		roomWidth,
		roomHeight,
		floorTop,
	);
	const dogPos = findNearby(
		rng,
		placed,
		charPos,
		16,
		12,
		roomWidth,
		roomHeight,
		floorTop,
	);
	const decor = generateDecor(rng, placed, roomWidth, roomHeight, floorTop);
	const wallDecor = generateWallDecor(rng, furniture, roomWidth, wallY);

	return {
		furniture,
		charPos,
		dogPos,
		decor,
		wallDecor,
		wallY,
		floorTop,
		roomWidth,
		roomHeight,
		doorSide,
	};
}

// --- Multi-room apartments ---

/** Picks room types for an apartment. */
function pickRoomTypes(rng: () => number, count: number): RoomType[] {
	const types: RoomType[] = ["bedroom", "bathroom"];
	if (count >= 3) types.push("kitchen");
	const pool: RoomType[] = ["living", "hallway", "study", "kitchen"];
	while (types.length < count) {
		const pick = pool[Math.floor(rng() * pool.length)] as RoomType;
		if (types.includes(pick)) continue;
		types.push(pick);
	}
	// Shuffle but keep bedroom first
	for (let i = types.length - 1; i > 1; i--) {
		const j = 1 + Math.floor(rng() * i);
		const temp = types[i] as RoomType;
		types[i] = types[j] as RoomType;
		types[j] = temp;
	}
	return types;
}

/** Finds shared wall between two rooms. */
function findSharedWall(
	a: Rect,
	b: Rect,
	gap: number,
): { axis: "vertical" | "horizontal"; x?: number; y?: number } | null {
	const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
	const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);

	if (Math.abs(a.x + a.w - (b.x + gap)) < gap + 2 && overlapY > 20) {
		return { axis: "vertical", x: a.x + a.w };
	}
	if (Math.abs(b.x + b.w - (a.x + gap)) < gap + 2 && overlapY > 20) {
		return { axis: "vertical", x: b.x + b.w };
	}
	if (Math.abs(a.y + a.h - (b.y + gap)) < gap + 2 && overlapX > 20) {
		return { axis: "horizontal", y: a.y + a.h };
	}
	if (Math.abs(b.y + b.h - (a.y + gap)) < gap + 2 && overlapX > 20) {
		return { axis: "horizontal", y: b.y + b.h };
	}
	return null;
}

/** Generates contents for a single room in an apartment. */
function generateRoomContents(
	rng: () => number,
	roomType: RoomType,
	rw: number,
	rh: number,
	topDown: boolean,
): RoomLayout {
	const wallY = topDown ? 0 : rh * 0.38;
	const floorTop = topDown ? 4 : wallY + 4;
	const doorSide: "left" | "right" = rng() < 0.5 ? "left" : "right";

	const placed: Rect[] = [];
	const furniture: Partial<Record<FurnitureName, Rect>> = {};

	const furnitureList: FurnitureName[] = [
		...(ROOM_TYPES[roomType]?.furniture ?? []),
	];
	if (roomType === "bedroom") {
		furnitureList.unshift("door");
	}

	for (const name of furnitureList) {
		const def = FURNITURE_DEFS[name];
		if (!def) continue;
		const rect = tryPlaceInRoom(
			rng,
			def,
			placed,
			name,
			doorSide,
			rw,
			rh,
			floorTop,
		);
		furniture[name] = rect;
		placed.push(rect);
	}

	const decor = generateDecorInRoom(rng, placed, rw, rh, floorTop);
	const wallDecor = generateWallDecorInRoom(rng, furniture, rw, wallY);

	return {
		furniture,
		charPos: { x: rw / 2, y: rh * 0.75 },
		dogPos: { x: rw / 2 + 25, y: rh * 0.75 + 5 },
		decor,
		wallDecor,
		wallY,
		floorTop,
		roomWidth: rw,
		roomHeight: rh,
		doorSide,
	};
}

function tryPlaceInRoom(
	rng: () => number,
	def: FurnitureDef,
	placed: Rect[],
	name: string,
	doorSide: "left" | "right",
	rw: number,
	rh: number,
	floorTop: number,
): Rect {
	for (let attempt = 0; attempt < 80; attempt++) {
		let x: number;
		let y: number;

		if (name === "door") {
			x = doorSide === "left" ? 1 : rw - def.w - 1;
			y = Math.max(2, floorTop - 18) + Math.floor(rng() * 8);
		} else if (def.placement === "backWall" && floorTop > 10) {
			x = 4 + rng() * (rw - def.w - 8);
			y = floorTop + Math.floor(rng() * 6);
		} else if (floorTop <= 10) {
			x = 4 + rng() * (rw - def.w - 8);
			y = 4 + rng() * (rh - def.h - 8);
		} else {
			x = 10 + rng() * (rw - def.w - 20);
			y = floorTop + 10 + rng() * (rh - floorTop - def.h - 14);
		}

		const candidate = { x, y, w: def.w, h: def.h };
		if (x < 2 || y < 2 || x + def.w > rw - 2 || y + def.h > rh - 4) continue;
		let collision = false;
		for (const p of placed) {
			if (rectsOverlap(candidate, p)) {
				collision = true;
				break;
			}
		}
		if (!collision) return candidate;
	}
	return { x: 4, y: floorTop + 2, w: def.w, h: def.h };
}

function generateDecorInRoom(
	rng: () => number,
	placed: Rect[],
	rw: number,
	rh: number,
	floorTop: number,
): FloorDecorItem[] {
	const items: FloorDecorItem[] = [];
	const count = 1 + Math.floor(rng() * 4);
	for (let i = 0; i < count; i++) {
		const type = FLOOR_DECOR_TYPES[
			Math.floor(rng() * FLOOR_DECOR_TYPES.length)
		] as FloorDecorType;
		const size = 3 + rng() * 4;
		for (let t = 0; t < 15; t++) {
			const x = 8 + rng() * (rw - 16);
			const y = floorTop + 5 + rng() * (rh - floorTop - 10);
			const candidate = {
				x: x - size,
				y: y - size,
				w: size * 2,
				h: size * 2,
			};
			let ok = true;
			for (const p of placed) {
				if (rectsOverlap(candidate, p)) {
					ok = false;
					break;
				}
			}
			if (ok) {
				items.push({ type, x, y, rot: (rng() - 0.5) * 0.5, size });
				break;
			}
		}
	}
	return items;
}

function generateWallDecorInRoom(
	rng: () => number,
	furniture: Partial<Record<FurnitureName, Rect>>,
	rw: number,
	wallY: number,
): WallDecorItem[] {
	if (wallY <= 0) return []; // top-down mode has no wall
	const items: WallDecorItem[] = [];
	const count = 1 + Math.floor(rng() * 3);
	for (let i = 0; i < count; i++) {
		const type = WALL_DECOR_TYPES[
			Math.floor(rng() * WALL_DECOR_TYPES.length)
		] as WallDecorType;
		const w =
			type === "shelf" || type === "coathook" ? 18 + rng() * 6 : 8 + rng() * 6;
		const h = type === "plant_hanging" ? 16 + rng() * 6 : 6 + rng() * 6;
		for (let t = 0; t < 20; t++) {
			const x = 6 + rng() * (rw - w - 12);
			const y = 4 + rng() * (wallY - h - 8);
			const candidate = { x, y, w, h, rot: (rng() - 0.5) * 0.08 };
			let ok = true;
			for (const p of items) {
				if (
					rectsOverlap(candidate, {
						x: p.x,
						y: p.y,
						w: p.w,
						h: p.h,
					})
				) {
					ok = false;
					break;
				}
			}
			if (ok) {
				items.push({ ...candidate, type });
				break;
			}
		}
	}
	void furniture; // used in full version for avoiding window
	return items;
}

/** Generates a multi-room apartment. */
export function generateApartment(
	rng: () => number,
	roomCount: number,
): Apartment {
	if (roomCount <= 1) {
		const layout = generateSingleRoomLayout(rng);
		return {
			rooms: [
				{
					id: "bedroom",
					type: "bedroom",
					bounds: {
						x: 0,
						y: 0,
						w: layout.roomWidth,
						h: layout.roomHeight,
					},
					layout,
				},
			],
			connections: [],
			floorPlan: { width: layout.roomWidth, height: layout.roomHeight },
		};
	}

	const types = pickRoomTypes(rng, roomCount);
	const WALL_GAP = 4;

	// Generate room sizes
	interface PlacedRoom {
		id: string;
		type: RoomType;
		x: number;
		y: number;
		w: number;
		h: number;
		furniture: FurnitureName[];
		layout?: RoomLayout;
	}

	const roomDefs = types.map((type, i) => {
		const def = ROOM_TYPES[type] as RoomTypeDef;
		const w = def.minW + Math.floor(rng() * (def.maxW - def.minW));
		const h = def.minH + Math.floor(rng() * (def.maxH - def.minH));
		const dupCount = types.slice(0, i).filter((t) => t === type).length;
		return {
			id: type + (dupCount || ""),
			type,
			w,
			h,
			furniture: def.furniture,
		};
	});

	const placed: PlacedRoom[] = [];
	const first = roomDefs[0];
	if (first) {
		placed.push({ ...first, x: 0, y: 0 });
	}

	for (let i = 1; i < roomDefs.length; i++) {
		const rd = roomDefs[i];
		if (!rd) continue;
		let bestPlacement: PlacedRoom | null = null;

		for (let attempt = 0; attempt < 60; attempt++) {
			const target = placed[Math.floor(rng() * placed.length)] as PlacedRoom;
			const side = Math.floor(rng() * 4);

			let nx: number;
			let ny: number;
			if (side === 0) {
				nx = target.x + target.w - WALL_GAP;
				const maxOffset = Math.max(0, target.h - rd.h);
				ny = target.y + Math.floor(rng() * (maxOffset + 1));
			} else if (side === 1) {
				const maxOffset = Math.max(0, target.w - rd.w);
				nx = target.x + Math.floor(rng() * (maxOffset + 1));
				ny = target.y + target.h - WALL_GAP;
			} else if (side === 2) {
				nx = target.x - rd.w + WALL_GAP;
				const maxOffset = Math.max(0, target.h - rd.h);
				ny = target.y + Math.floor(rng() * (maxOffset + 1));
			} else {
				const maxOffset = Math.max(0, target.w - rd.w);
				nx = target.x + Math.floor(rng() * (maxOffset + 1));
				ny = target.y - rd.h + WALL_GAP;
			}

			const candidate = { x: nx, y: ny, w: rd.w, h: rd.h };
			let overlaps = false;
			for (const p of placed) {
				const a = {
					x: candidate.x + WALL_GAP,
					y: candidate.y + WALL_GAP,
					w: candidate.w - WALL_GAP * 2,
					h: candidate.h - WALL_GAP * 2,
				};
				const b = {
					x: p.x + WALL_GAP,
					y: p.y + WALL_GAP,
					w: p.w - WALL_GAP * 2,
					h: p.h - WALL_GAP * 2,
				};
				if (
					a.x < b.x + b.w &&
					a.x + a.w > b.x &&
					a.y < b.y + b.h &&
					a.y + a.h > b.y
				) {
					overlaps = true;
					break;
				}
			}
			if (!overlaps) {
				bestPlacement = { ...rd, x: nx, y: ny };
				break;
			}
		}

		if (bestPlacement) {
			placed.push(bestPlacement);
		} else {
			const last = placed[placed.length - 1] as PlacedRoom;
			placed.push({
				...rd,
				x: last.x + last.w - WALL_GAP,
				y: last.y,
			});
		}
	}

	// Normalize coordinates
	const minX = Math.min(...placed.map((r) => r.x));
	const minY = Math.min(...placed.map((r) => r.y));
	for (const r of placed) {
		r.x -= minX;
		r.y -= minY;
	}

	const totalW = Math.max(...placed.map((r) => r.x + r.w));
	const totalH = Math.max(...placed.map((r) => r.y + r.h));

	// Find connections
	const connections: RoomConnection[] = [];
	for (let i = 0; i < placed.length; i++) {
		for (let j = i + 1; j < placed.length; j++) {
			const a = placed[i] as PlacedRoom;
			const b = placed[j] as PlacedRoom;
			const conn = findSharedWall(a, b, WALL_GAP);
			if (!conn) continue;

			const doorW = 20;
			if (conn.axis === "vertical" && conn.x !== undefined) {
				const overlapMin = Math.max(a.y, b.y) + 10;
				const overlapMax = Math.min(a.y + a.h, b.y + b.h) - 10;
				if (overlapMax - overlapMin >= doorW) {
					const dy =
						overlapMin + Math.floor(rng() * (overlapMax - overlapMin - doorW));
					connections.push({
						roomA: a.id,
						roomB: b.id,
						position: {
							x: conn.x - WALL_GAP / 2,
							y: dy,
							w: WALL_GAP,
							h: doorW,
						},
						axis: "vertical",
					});
				}
			} else if (conn.axis === "horizontal" && conn.y !== undefined) {
				const overlapMin = Math.max(a.x, b.x) + 10;
				const overlapMax = Math.min(a.x + a.w, b.x + b.w) - 10;
				if (overlapMax - overlapMin >= doorW) {
					const dx =
						overlapMin + Math.floor(rng() * (overlapMax - overlapMin - doorW));
					connections.push({
						roomA: a.id,
						roomB: b.id,
						position: {
							x: dx,
							y: conn.y - WALL_GAP / 2,
							w: doorW,
							h: WALL_GAP,
						},
						axis: "horizontal",
					});
				}
			}
		}
	}

	// Generate per-room contents
	for (const room of placed) {
		room.layout = generateRoomContents(
			rng,
			room.type,
			room.w,
			room.h,
			true, // multi-room uses top-down
		);
	}

	// Character + dog in bedroom (first room)
	const bedroom = placed[0] as PlacedRoom;
	if (bedroom.layout) {
		const brPlaced: Rect[] = Object.values(bedroom.layout.furniture).filter(
			(r): r is Rect => r !== undefined,
		);
		bedroom.layout.charPos = findOpenFloor(
			rng,
			brPlaced,
			12,
			24,
			bedroom.w,
			bedroom.h,
			bedroom.layout.floorTop,
		);
		bedroom.layout.dogPos = findNearby(
			rng,
			brPlaced,
			bedroom.layout.charPos,
			16,
			12,
			bedroom.w,
			bedroom.h,
			bedroom.layout.floorTop,
		);
	}

	return {
		rooms: placed.map((r) => ({
			id: r.id,
			type: r.type,
			bounds: { x: r.x, y: r.y, w: r.w, h: r.h },
			layout: r.layout as RoomLayout,
		})),
		connections,
		floorPlan: { width: totalW, height: totalH },
	};
}
