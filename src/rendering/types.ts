/**
 * Shared types for the seed-based room rendering system.
 * All art style renderers and layout generators use these.
 */

import type { AnimationState } from "../systems/animation";

/** Art style identifiers. Seed selects one per run. */
export type ArtStyleId = "pixel" | "minimal" | "sketch" | "isometric" | "flat";

/** Furniture placement strategy. */
export type FurniturePlacement =
	| "backWall"
	| "sideWall"
	| "floor"
	| "rightWall";

/** Furniture definition (size and placement hint). */
export interface FurnitureDef {
	w: number;
	h: number;
	placement: FurniturePlacement;
}

/** Axis-aligned rectangle (positioned furniture, collision box). */
export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** 2D position. */
export interface Position {
	x: number;
	y: number;
}

/** Floor decor item types. */
export type FloorDecorType =
	| "book"
	| "mug"
	| "plant"
	| "laundry"
	| "shoe"
	| "paper"
	| "bowl"
	| "cushion"
	| "bottle";

/** Wall decor item types. */
export type WallDecorType =
	| "poster"
	| "shelf"
	| "clock"
	| "mirror"
	| "photo"
	| "coathook"
	| "calendar"
	| "plant_hanging";

/** A floor decor item with position and rotation. */
export interface FloorDecorItem {
	type: FloorDecorType;
	x: number;
	y: number;
	rot: number;
	size: number;
}

/** A wall decor item with position and size. */
export interface WallDecorItem {
	type: WallDecorType;
	x: number;
	y: number;
	w: number;
	h: number;
	rot: number;
}

/** Furniture name keys used in layouts. */
export type FurnitureName =
	| "door"
	| "bed"
	| "kitchen"
	| "bathroom"
	| "desk"
	| "couch";

/**
 * Generated layout for a single room.
 * Coordinates are room-local (0,0 = top-left of room).
 */
export interface RoomLayout {
	/** Positioned furniture pieces. */
	furniture: Partial<Record<FurnitureName, Rect>>;
	/** Character starting position. */
	charPos: Position;
	/** Dog starting position. */
	dogPos: Position;
	/** Floor decor items. */
	decor: FloorDecorItem[];
	/** Wall decor items. */
	wallDecor: WallDecorItem[];
	/** Y coordinate where wall meets floor. 0 in top-down mode. */
	wallY: number;
	/** Y coordinate where furniture can start. wallY + 4 normally, 0-4 in top-down. */
	floorTop: number;
	/** Room width in logical pixels. */
	roomWidth: number;
	/** Room height in logical pixels. */
	roomHeight: number;
	/** Which side the door is on. */
	doorSide: "left" | "right";
}

/** Room type for multi-room apartments. */
export type RoomType =
	| "bedroom"
	| "living"
	| "kitchen"
	| "bathroom"
	| "hallway"
	| "study";

/** Room type definition with size ranges and furniture. */
export interface RoomTypeDef {
	minW: number;
	maxW: number;
	minH: number;
	maxH: number;
	furniture: FurnitureName[];
	label: string;
}

/** A placed room in an apartment. */
export interface ApartmentRoom {
	id: string;
	type: RoomType;
	bounds: Rect;
	layout: RoomLayout;
}

/** Connection between two rooms (doorway). */
export interface RoomConnection {
	roomA: string;
	roomB: string;
	position: Rect;
	axis: "vertical" | "horizontal";
}

/** Complete apartment layout. */
export interface Apartment {
	rooms: ApartmentRoom[];
	connections: RoomConnection[];
	floorPlan: { width: number; height: number };
}

/** Theme colors read from CSS variables. */
export interface ThemeColors {
	floor: string;
	wall: string;
	highlight: string;
	highlightBorder: string;
}

/** Seed-based color palette (hue-shifted furniture colors). */
export interface SeedPalette {
	colors: Record<string, string>;
	hueShiftDeg: number;
}

/** Time-of-day palette. */
export interface TimePalette {
	wall: string;
	floor: string;
	sky: string;
	tint: [number, number, number, number];
	/** Whether this is a night or late-night palette. */
	night: boolean;
}

// --- Item variants (seed-determined appearance) ---

export interface BedVariant {
	style: "single" | "double" | "futon" | "bunk";
	blanketPattern: "solid" | "striped" | "plaid" | "dots";
	pillowCount: number;
	messy: boolean;
}

export interface DeskVariant {
	monitor: "laptop" | "desktop" | "dual" | "none";
	messy: boolean;
	hasLamp: boolean;
	hasPlant: boolean;
	hasShelf: boolean;
}

export interface CouchVariant {
	style: "sofa" | "loveseat" | "sectional" | "beanbag";
	cushions: number;
	hasBlanket: boolean;
}

export interface KitchenVariant {
	style: "stove" | "counter" | "mini" | "full";
	hasMug: boolean;
	hasPot: boolean;
	dirty: boolean;
	hasCabinets: boolean;
}

export interface BathroomVariant {
	style: "tub" | "shower" | "combo" | "minimal";
	hasMat: boolean;
	hasTowel: boolean;
	hasMirror: boolean;
}

export interface DoorVariant {
	style: "plain" | "panel" | "arch" | "dutch";
	hasWindow: boolean;
	hasMat: boolean;
}

export interface CharacterVariant {
	skin: string;
	hairColor: string;
	hairStyle:
		| "short"
		| "buzz"
		| "long"
		| "ponytail"
		| "bun"
		| "curly"
		| "shaved";
	height: number;
	build: "thin" | "medium" | "stocky";
	buildW: number;
	topColor: string;
	pantsColor: string;
	shoeColor: string;
}

export interface DogVariant {
	bodyColor: string;
	earColor: string;
	size: "small" | "medium" | "large";
	bodyW: number;
	bodyH: number;
	earStyle: "pointed" | "floppy";
	tailStyle: "up" | "curl" | "down";
	hasSpots: boolean;
	spotColor: string;
	noseColor: string;
}

/** All item variants for a run. */
export interface ItemVariants {
	bed: BedVariant;
	desk: DeskVariant;
	couch: CouchVariant;
	kitchen: KitchenVariant;
	bathroom: BathroomVariant;
	door: DoorVariant;
	character: CharacterVariant;
	dog: DogVariant;
}

/** Dog mood state (computed by game logic, used by renderers). */
export type DogMoodState =
	| "normal"
	| "excited"
	| "disappointed"
	| "hopeful"
	| "happyForYou"
	| "sympathetic"
	| "unimpressed"
	| "interested"
	| "restless";

/** Options passed to room renderer. */
export interface RoomDrawOptions {
	showLabels?: boolean;
	/** Current time-of-day palette. */
	timePalette: TimePalette;
	/** Seed-derived color palette. */
	seedPalette: SeedPalette;
	/** Seed-derived item variants. */
	variants: ItemVariants;
}

/**
 * Interface that all 5 art style renderers implement.
 * Each draws a room, character, and dog in its own visual style.
 */
export interface RoomRenderer {
	/** Draw the room background, furniture, decor. */
	drawRoom(
		ctx: CanvasRenderingContext2D,
		layout: RoomLayout,
		options: RoomDrawOptions,
	): void;

	/** Draw the character at a position. */
	drawCharacter(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		variants: CharacterVariant,
		timePalette: TimePalette,
		animState: AnimationState | null,
	): void;

	/** Draw the dog at a position. */
	drawDog(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		variants: DogVariant,
		timePalette: TimePalette,
		mood: DogMoodState,
		energy: number,
	): void;

	/** Highlight a furniture piece (selected task target). */
	highlightFurniture(
		ctx: CanvasRenderingContext2D,
		rect: Rect,
		layout: RoomLayout,
		highlightFill?: string,
		highlightStroke?: string,
	): void;
}
