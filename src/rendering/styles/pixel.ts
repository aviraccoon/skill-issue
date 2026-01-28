/**
 * Pixel art style renderer (Style 1).
 * Detailed 16-bit pixel art with furniture variants, character hair styles,
 * dog variants, floor/wall decor.
 */

import type { AnimationState } from "../../systems/animation";
import {
	darken,
	drawFurnitureHighlight,
	hueShift,
	lighten,
	roundRect,
} from "../color";
import { applyNightGlow, applyTimeOverlay, isNightPalette } from "../palettes";
import type {
	BathroomVariant,
	BedVariant,
	CharacterVariant,
	CouchVariant,
	DeskVariant,
	DogMoodState,
	DogVariant,
	DoorVariant,
	FloorDecorItem,
	FurnitureName,
	ItemVariants,
	KitchenVariant,
	Rect,
	RoomDrawOptions,
	RoomLayout,
	RoomRenderer,
	SeedPalette,
	TimePalette,
	WallDecorItem,
} from "../types";

type Ctx = CanvasRenderingContext2D;

/** Creates a pixel art renderer. */
export function createPixelRenderer(): RoomRenderer {
	return {
		drawRoom(ctx: Ctx, layout: RoomLayout, options: RoomDrawOptions): void {
			drawPixelRoom(ctx, layout, options);
		},
		drawCharacter(
			ctx: Ctx,
			x: number,
			y: number,
			variants: CharacterVariant,
			timePalette: TimePalette,
			_animState: AnimationState | null,
		): void {
			drawPixelChar(ctx, x, y, variants, timePalette);
		},
		drawDog(
			ctx: Ctx,
			x: number,
			y: number,
			variants: DogVariant,
			timePalette: TimePalette,
			mood: DogMoodState,
			energy: number,
		): void {
			drawPixelDog(ctx, x, y, variants, timePalette, mood, energy);
		},
		highlightFurniture(
			ctx: Ctx,
			rect: Rect,
			_layout: RoomLayout,
			fill?: string,
			stroke?: string,
		): void {
			drawFurnitureHighlight(ctx, rect, fill, stroke);
		},
	};
}

// ---- Main room draw ----

function drawPixelRoom(
	ctx: Ctx,
	layout: RoomLayout,
	options: RoomDrawOptions,
): void {
	const { timePalette, seedPalette, variants } = options;
	const { roomWidth, roomHeight, wallY, floorTop } = layout;

	// Floor tiles
	const tileSize = 16;
	for (let ty = Math.floor(floorTop); ty < roomHeight; ty += tileSize) {
		for (let tx = 0; tx < roomWidth; tx += tileSize) {
			const shade = (tx / tileSize + ty / tileSize) % 2 === 0 ? 0 : 0.04;
			ctx.fillStyle = darken(timePalette.floor, shade);
			ctx.fillRect(tx, ty, tileSize, tileSize);
			ctx.strokeStyle = darken(timePalette.floor, 0.1);
			ctx.lineWidth = 0.5;
			ctx.strokeRect(tx, ty, tileSize, tileSize);
		}
	}

	// Wall
	ctx.fillStyle = timePalette.wall;
	ctx.fillRect(0, 0, roomWidth, floorTop);

	// Baseboard
	ctx.fillStyle = darken(timePalette.wall, 0.2);
	ctx.fillRect(0, wallY, roomWidth, floorTop - wallY);

	// Window + wall decorations (skip in top-down mode)
	if (wallY > 0) {
		const winX = 30 + (((layout.furniture.desk?.x ?? 80) * 0.5) % 120);
		ctx.fillStyle = timePalette.sky;
		ctx.fillRect(winX, 6, 22, 18);
		ctx.strokeStyle = darken(timePalette.wall, 0.3);
		ctx.lineWidth = 2;
		ctx.strokeRect(winX, 6, 22, 18);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(winX + 11, 6);
		ctx.lineTo(winX + 11, 24);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(winX, 15);
		ctx.lineTo(winX + 22, 15);
		ctx.stroke();

		drawWallDecorPixel(ctx, layout.wallDecor, seedPalette);
		drawWallExtensionsPixel(ctx, layout, seedPalette, variants);
	}

	// Draw furniture sorted by Y for depth
	const names: FurnitureName[] = [
		"bed",
		"desk",
		"couch",
		"kitchen",
		"bathroom",
		"door",
	];
	const sorted = names
		.filter((n) => layout.furniture[n])
		.sort(
			(a, b) => (layout.furniture[a]?.y ?? 0) - (layout.furniture[b]?.y ?? 0),
		);

	for (const name of sorted) {
		const f = layout.furniture[name];
		if (!f) continue;
		const baseColor = seedPalette.colors[name] ?? "#888";

		switch (name) {
			case "bed":
				drawBedPixel(ctx, f, baseColor, variants.bed);
				break;
			case "desk":
				drawDeskPixel(ctx, f, baseColor, variants.desk, seedPalette);
				break;
			case "couch":
				drawCouchPixel(ctx, f, baseColor, variants.couch);
				break;
			case "kitchen":
				drawKitchenPixel(ctx, f, baseColor, variants.kitchen, seedPalette);
				break;
			case "bathroom":
				drawBathroomPixel(ctx, f, baseColor, variants.bathroom);
				break;
			case "door":
				drawDoorPixel(ctx, f, baseColor, variants.door);
				break;
		}

		if (options.showLabels) {
			ctx.fillStyle = "#fff";
			ctx.font = "5px monospace";
			ctx.textAlign = "center";
			ctx.fillText(name, f.x + f.w / 2, f.y + f.h / 2 + 2);
		}
	}

	drawDecorPixel(ctx, layout.decor, seedPalette);

	applyTimeOverlay(ctx, timePalette, roomWidth, roomHeight);
	applyNightGlow(ctx, layout, timePalette, roomWidth, roomHeight);
}

// ---- Furniture ----

function drawBedPixel(ctx: Ctx, f: Rect, color: string, v: BedVariant): void {
	const top = lighten(color, 0.12);
	// Frame
	ctx.fillStyle = darken(color, 0.25);
	ctx.fillRect(f.x, f.y, f.w, f.h);
	ctx.fillStyle = darken(color, 0.1);
	ctx.fillRect(f.x + 1, f.y + 1, f.w - 2, f.h - 2);

	if (v.style === "futon") {
		ctx.fillStyle = color;
		ctx.fillRect(f.x + 2, f.y + f.h - 14, f.w - 4, 12);
		ctx.fillStyle = top;
		ctx.fillRect(f.x + 2, f.y + f.h - 14, f.w - 4, 2);
	} else if (v.style === "bunk") {
		ctx.fillStyle = darken(color, 0.3);
		ctx.fillRect(f.x + 1, f.y + 2, 2, f.h - 4);
		ctx.fillRect(f.x + f.w - 3, f.y + 2, 2, f.h - 4);
		ctx.fillStyle = color;
		ctx.fillRect(f.x + 3, f.y + 3, f.w - 6, 8);
		ctx.fillRect(f.x + 3, f.y + f.h - 11, f.w - 6, 8);
	} else {
		const mw = v.style === "double" ? f.w - 4 : f.w * 0.7;
		ctx.fillStyle = color;
		ctx.fillRect(f.x + 2, f.y + 8, f.w - 4, f.h - 10);
		const blanketColor = lighten(color, 0.15);
		ctx.fillStyle = blanketColor;
		ctx.fillRect(f.x + 2, f.y + 12, mw, f.h - 14);
		if (v.blanketPattern === "striped") {
			ctx.fillStyle = lighten(color, 0.25);
			for (let sy = f.y + 14; sy < f.y + f.h - 3; sy += 4)
				ctx.fillRect(f.x + 3, sy, mw - 2, 2);
		} else if (v.blanketPattern === "plaid") {
			ctx.fillStyle = darken(blanketColor, 0.1);
			for (let sx = f.x + 6; sx < f.x + mw; sx += 6)
				ctx.fillRect(sx, f.y + 12, 2, f.h - 14);
			for (let sy = f.y + 15; sy < f.y + f.h - 3; sy += 6)
				ctx.fillRect(f.x + 2, sy, mw, 2);
		} else if (v.blanketPattern === "dots") {
			ctx.fillStyle = lighten(color, 0.3);
			for (let dx = f.x + 6; dx < f.x + mw; dx += 5)
				for (let dy = f.y + 15; dy < f.y + f.h - 3; dy += 5)
					ctx.fillRect(dx, dy, 2, 2);
		}
		if (v.messy) {
			ctx.fillStyle = blanketColor;
			ctx.fillRect(f.x + mw - 2, f.y + f.h - 10, 8, 6);
		}
	}

	// Pillows
	ctx.fillStyle = "#e0e0e8";
	for (let pi = 0; pi < v.pillowCount; pi++) {
		ctx.fillRect(f.x + 3 + pi * 13, f.y + 2, 11, 7);
		ctx.fillStyle = "#d0d0d8";
		ctx.fillRect(f.x + 3 + pi * 13, f.y + 2, 11, 1);
		ctx.fillStyle = "#e0e0e8";
	}

	ctx.strokeStyle = darken(color, 0.4);
	ctx.lineWidth = 1;
	ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
}

function drawDeskPixel(
	ctx: Ctx,
	f: Rect,
	color: string,
	v: DeskVariant,
	seedPal: SeedPalette,
): void {
	const shadow = darken(color, 0.15);
	ctx.fillStyle = color;
	ctx.fillRect(f.x, f.y, f.w, f.h);
	ctx.fillStyle = lighten(color, 0.12);
	ctx.fillRect(f.x, f.y, f.w, 2);
	ctx.fillStyle = shadow;
	ctx.fillRect(f.x, f.y + f.h - 2, f.w, 2);
	// Legs
	ctx.fillStyle = darken(color, 0.2);
	ctx.fillRect(f.x + 2, f.y + f.h - 1, 3, 3);
	ctx.fillRect(f.x + f.w - 5, f.y + f.h - 1, 3, 3);

	const screenColor = hueShift("#4466aa", seedPal.hueShiftDeg);
	if (v.monitor === "laptop") {
		ctx.fillStyle = "#444";
		ctx.fillRect(f.x + 8, f.y + 10, 20, 2);
		ctx.fillStyle = "#333";
		ctx.fillRect(f.x + 8, f.y + 2, 20, 9);
		ctx.fillStyle = screenColor;
		ctx.fillRect(f.x + 9, f.y + 3, 18, 7);
	} else if (v.monitor === "desktop") {
		ctx.fillStyle = "#333";
		ctx.fillRect(f.x + 10, f.y + 2, 18, 12);
		ctx.fillStyle = screenColor;
		ctx.fillRect(f.x + 11, f.y + 3, 16, 10);
		ctx.fillStyle = "#444";
		ctx.fillRect(f.x + 17, f.y + 14, 4, 3);
		ctx.fillStyle = "#555";
		ctx.fillRect(f.x + 8, f.y + 16, 14, 3);
	} else if (v.monitor === "dual") {
		ctx.fillStyle = "#333";
		ctx.fillRect(f.x + 3, f.y + 2, 14, 10);
		ctx.fillRect(f.x + 19, f.y + 2, 14, 10);
		ctx.fillStyle = screenColor;
		ctx.fillRect(f.x + 4, f.y + 3, 12, 8);
		ctx.fillRect(f.x + 20, f.y + 3, 12, 8);
	} else if (v.messy) {
		ctx.fillStyle = "#ddd";
		ctx.fillRect(f.x + 5, f.y + 4, 8, 5);
		ctx.fillRect(f.x + 18, f.y + 6, 6, 4);
	}

	if (v.hasLamp) {
		ctx.fillStyle = "#888";
		ctx.fillRect(f.x + f.w - 8, f.y + 2, 2, 8);
		ctx.fillStyle = hueShift("#ddaa44", seedPal.hueShiftDeg);
		ctx.fillRect(f.x + f.w - 11, f.y + 1, 8, 4);
	}
	if (v.hasPlant) {
		ctx.fillStyle = hueShift("#6b4423", seedPal.hueShiftDeg);
		ctx.fillRect(f.x + 2, f.y + 5, 4, 5);
		ctx.fillStyle = hueShift("#3a8a3a", seedPal.hueShiftDeg);
		ctx.beginPath();
		ctx.arc(f.x + 4, f.y + 4, 3, 0, Math.PI * 2);
		ctx.fill();
	}
	if (v.messy) {
		ctx.fillStyle = "#ddd";
		ctx.fillRect(f.x + f.w - 6, f.y + 14, 5, 3);
	}

	ctx.strokeStyle = darken(color, 0.4);
	ctx.lineWidth = 1;
	ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
}

function drawCouchPixel(
	ctx: Ctx,
	f: Rect,
	color: string,
	v: CouchVariant,
): void {
	if (v.style === "beanbag") {
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.ellipse(
			f.x + f.w / 2,
			f.y + f.h / 2,
			f.w / 2 - 2,
			f.h / 2 - 1,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.fillStyle = darken(color, 0.1);
		ctx.beginPath();
		ctx.ellipse(
			f.x + f.w / 2,
			f.y + f.h / 2 + 2,
			f.w / 2 - 6,
			f.h / 2 - 5,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.strokeStyle = darken(color, 0.3);
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.ellipse(
			f.x + f.w / 2,
			f.y + f.h / 2,
			f.w / 2 - 2,
			f.h / 2 - 1,
			0,
			0,
			Math.PI * 2,
		);
		ctx.stroke();
		return;
	}

	ctx.fillStyle = "rgba(0,0,0,0.12)";
	ctx.fillRect(f.x + 2, f.y + 2, f.w, f.h);
	ctx.fillStyle = color;
	ctx.fillRect(f.x, f.y, f.w, f.h);
	// Back
	ctx.fillStyle = darken(color, 0.1);
	ctx.fillRect(f.x, f.y, f.w, 6);
	// Arms
	if (v.style !== "sectional") {
		ctx.fillStyle = darken(color, 0.05);
		ctx.fillRect(f.x, f.y, 5, f.h);
		ctx.fillRect(f.x + f.w - 5, f.y, 5, f.h);
	} else {
		ctx.fillStyle = darken(color, 0.05);
		ctx.fillRect(f.x, f.y, 5, f.h);
		ctx.fillRect(f.x + f.w - 14, f.y + f.h - 6, 14, 6);
	}
	// Seat cushions
	ctx.fillStyle = lighten(color, 0.08);
	const cushW = (f.w - 12) / v.cushions;
	for (let ci = 0; ci < v.cushions; ci++) {
		ctx.fillRect(f.x + 6 + ci * cushW, f.y + 7, cushW - 2, f.h - 9);
		ctx.strokeStyle = darken(color, 0.15);
		ctx.lineWidth = 0.5;
		ctx.strokeRect(f.x + 6 + ci * cushW, f.y + 7, cushW - 2, f.h - 9);
	}
	if (v.hasBlanket) {
		ctx.fillStyle = hueShift("#cc8866", 0);
		ctx.globalAlpha = 0.6;
		ctx.fillRect(f.x + f.w - 18, f.y + 4, 14, f.h - 2);
		ctx.globalAlpha = 1;
	}

	ctx.strokeStyle = darken(color, 0.35);
	ctx.lineWidth = 1;
	ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
}

function drawKitchenPixel(
	ctx: Ctx,
	f: Rect,
	color: string,
	v: KitchenVariant,
	seedPal: SeedPalette,
): void {
	ctx.fillStyle = "rgba(0,0,0,0.12)";
	ctx.fillRect(f.x + 2, f.y + 2, f.w, f.h);
	ctx.fillStyle = color;
	ctx.fillRect(f.x, f.y, f.w, f.h);
	ctx.fillStyle = lighten(color, 0.1);
	ctx.fillRect(f.x, f.y, f.w, 2);
	ctx.fillStyle = darken(color, 0.15);
	ctx.fillRect(f.x, f.y + f.h - 2, f.w, 2);

	if (v.style === "stove" || v.style === "full") {
		ctx.fillStyle = "#555";
		ctx.fillRect(f.x + 3, f.y + 3, 16, 16);
		ctx.strokeStyle = "#777";
		ctx.lineWidth = 1;
		for (const [cx, cy] of [
			[7, 7],
			[14, 7],
			[7, 14],
			[14, 14],
		] as const) {
			ctx.beginPath();
			ctx.arc(f.x + cx, f.y + cy, 3, 0, Math.PI * 2);
			ctx.stroke();
		}
	}
	if (v.style === "full" || v.style === "counter") {
		const sinkX = v.style === "full" ? f.x + 22 : f.x + 4;
		ctx.fillStyle = "#aab";
		ctx.fillRect(sinkX, f.y + 4, 14, 10);
		ctx.fillStyle = "#88a";
		ctx.fillRect(sinkX + 2, f.y + 6, 10, 6);
		ctx.fillStyle = "#ccc";
		ctx.fillRect(sinkX + 5, f.y + 2, 2, 4);
		ctx.fillRect(sinkX + 4, f.y + 2, 4, 2);
	}
	if (v.style === "mini") {
		ctx.fillStyle = "#ddd";
		ctx.fillRect(f.x + 3, f.y + 2, 12, f.h - 4);
		ctx.fillStyle = "#ccc";
		ctx.fillRect(f.x + 3, f.y + f.h / 2, 12, 1);
		ctx.fillStyle = "#555";
		ctx.fillRect(f.x + 20, f.y + 4, 10, 8);
		ctx.strokeStyle = "#777";
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.arc(f.x + 25, f.y + 8, 3, 0, Math.PI * 2);
		ctx.stroke();
	}
	if (v.hasMug) {
		ctx.fillStyle = hueShift("#cc6644", seedPal.hueShiftDeg);
		ctx.fillRect(f.x + f.w - 10, f.y + 4, 5, 6);
		ctx.fillRect(f.x + f.w - 6, f.y + 5, 3, 3);
	}
	if (v.hasPot) {
		const potX = v.style === "stove" || v.style === "full" ? f.x + 5 : f.x + 22;
		ctx.fillStyle = "#666";
		ctx.fillRect(potX, f.y + 4, 8, 6);
		ctx.fillStyle = "#888";
		ctx.fillRect(potX + 3, f.y + 2, 2, 2);
	}
	if (v.dirty) {
		ctx.fillStyle = "#aa9977";
		ctx.fillRect(f.x + f.w - 16, f.y + f.h - 6, 8, 4);
		ctx.fillRect(f.x + f.w - 14, f.y + f.h - 8, 6, 3);
	}

	ctx.strokeStyle = darken(color, 0.4);
	ctx.lineWidth = 1;
	ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
}

function drawBathroomPixel(
	ctx: Ctx,
	f: Rect,
	color: string,
	v: BathroomVariant,
): void {
	ctx.fillStyle = "rgba(0,0,0,0.12)";
	ctx.fillRect(f.x + 2, f.y + 2, f.w, f.h);
	ctx.fillStyle = color;
	ctx.fillRect(f.x, f.y, f.w, f.h);
	// Tile pattern
	ctx.fillStyle = lighten(color, 0.08);
	for (let tx = f.x + 2; tx < f.x + f.w - 2; tx += 6)
		for (let ty = f.y + 2; ty < f.y + f.h - 2; ty += 6)
			ctx.fillRect(tx, ty, 5, 5);

	if (v.style === "tub") {
		ctx.fillStyle = "#e8e8ee";
		ctx.fillRect(f.x + 3, f.y + 3, f.w * 0.6, f.h - 6);
		ctx.fillStyle = "#aac8e8";
		ctx.fillRect(f.x + 5, f.y + 5, f.w * 0.6 - 4, f.h - 10);
		ctx.fillStyle = "#ccc";
		ctx.fillRect(f.x + f.w * 0.6 - 2, f.y + 4, 4, 2);
	} else if (v.style === "shower") {
		ctx.fillStyle = "#d8d8dd";
		ctx.fillRect(f.x + 3, f.y + 2, f.w * 0.45, f.h - 4);
		ctx.strokeStyle = "#aaa";
		ctx.lineWidth = 0.5;
		ctx.strokeRect(f.x + 3, f.y + 2, f.w * 0.45, f.h - 4);
		ctx.fillStyle = "#bbb";
		ctx.fillRect(f.x + f.w * 0.25, f.y + 2, 4, 2);
		ctx.strokeStyle = "#aac8e8";
		ctx.lineWidth = 0.5;
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			ctx.moveTo(f.x + 8 + i * 5, f.y + 5);
			ctx.lineTo(f.x + 8 + i * 5, f.y + f.h - 5);
			ctx.stroke();
		}
	} else if (v.style === "combo") {
		ctx.fillStyle = "#e8e8ee";
		ctx.fillRect(f.x + 3, f.y + 3, f.w * 0.55, f.h - 6);
		ctx.fillStyle = "#aac8e8";
		ctx.fillRect(f.x + 5, f.y + 5, f.w * 0.55 - 4, f.h - 10);
		ctx.fillStyle = hueShift("#8899aa", 0);
		ctx.globalAlpha = 0.4;
		ctx.fillRect(f.x + 3, f.y + 2, f.w * 0.55, 3);
		ctx.globalAlpha = 1;
	} else {
		// Minimal
		ctx.fillStyle = "#e8e8ee";
		ctx.fillRect(f.x + 4, f.y + 4, 10, 8);
		ctx.fillStyle = "#aac8e8";
		ctx.fillRect(f.x + 5, f.y + 5, 8, 6);
	}

	// Toilet
	ctx.fillStyle = "#eee";
	ctx.fillRect(f.x + f.w - 12, f.y + f.h - 12, 8, 10);
	ctx.fillStyle = "#ddd";
	ctx.fillRect(f.x + f.w - 12, f.y + f.h - 12, 8, 2);

	if (v.style !== "minimal") {
		ctx.fillStyle = "#c8d8e8";
		ctx.fillRect(f.x + f.w - 20, f.y + 2, 8, 8);
		ctx.strokeStyle = "#999";
		ctx.lineWidth = 0.5;
		ctx.strokeRect(f.x + f.w - 20, f.y + 2, 8, 8);
	}
	if (v.hasMat) {
		ctx.fillStyle = hueShift("#6688aa", 0);
		ctx.globalAlpha = 0.5;
		ctx.fillRect(f.x + f.w * 0.3, f.y + f.h - 4, 12, 3);
		ctx.globalAlpha = 1;
	}
	if (v.hasTowel) {
		ctx.fillStyle = hueShift("#dd8866", 0);
		ctx.fillRect(f.x + f.w - 4, f.y + 6, 3, 8);
	}

	ctx.strokeStyle = darken(color, 0.4);
	ctx.lineWidth = 1;
	ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
}

function drawDoorPixel(ctx: Ctx, f: Rect, color: string, v: DoorVariant): void {
	// Frame
	ctx.fillStyle = darken(color, 0.3);
	ctx.fillRect(f.x - 1, f.y, f.w + 2, f.h + 1);
	ctx.fillStyle = color;
	ctx.fillRect(f.x, f.y + 1, f.w, f.h - 1);

	if (v.style === "panel") {
		ctx.fillStyle = darken(color, 0.08);
		ctx.strokeStyle = darken(color, 0.2);
		ctx.lineWidth = 0.5;
		ctx.fillRect(f.x + 3, f.y + 4, f.w - 6, f.h * 0.35);
		ctx.strokeRect(f.x + 3, f.y + 4, f.w - 6, f.h * 0.35);
		ctx.fillRect(f.x + 3, f.y + f.h * 0.45, f.w - 6, f.h * 0.45);
		ctx.strokeRect(f.x + 3, f.y + f.h * 0.45, f.w - 6, f.h * 0.45);
	} else if (v.style === "arch") {
		ctx.fillStyle = darken(color, 0.15);
		ctx.beginPath();
		ctx.moveTo(f.x + 2, f.y + f.h - 2);
		ctx.lineTo(f.x + 2, f.y + 12);
		ctx.arc(f.x + f.w / 2, f.y + 12, f.w / 2 - 2, Math.PI, 0);
		ctx.lineTo(f.x + f.w - 2, f.y + f.h - 2);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.moveTo(f.x + 4, f.y + f.h - 2);
		ctx.lineTo(f.x + 4, f.y + 14);
		ctx.arc(f.x + f.w / 2, f.y + 14, f.w / 2 - 4, Math.PI, 0);
		ctx.lineTo(f.x + f.w - 4, f.y + f.h - 2);
		ctx.closePath();
		ctx.fill();
	} else if (v.style === "dutch") {
		ctx.fillStyle = darken(color, 0.15);
		ctx.fillRect(f.x + 1, f.y + f.h * 0.48, f.w - 2, 2);
	}

	if (v.hasWindow) {
		ctx.fillStyle = "#87ceeb";
		ctx.fillRect(f.x + 5, f.y + 6, f.w - 10, 10);
		ctx.strokeStyle = darken(color, 0.3);
		ctx.lineWidth = 1;
		ctx.strokeRect(f.x + 5, f.y + 6, f.w - 10, 10);
		ctx.beginPath();
		ctx.moveTo(f.x + f.w / 2, f.y + 6);
		ctx.lineTo(f.x + f.w / 2, f.y + 16);
		ctx.stroke();
	}

	// Handle
	ctx.fillStyle = "#d4a030";
	ctx.fillRect(f.x + 3, f.y + f.h * 0.5 - 1, 3, 4);

	if (v.hasMat) {
		ctx.fillStyle = hueShift("#887755", 0);
		ctx.fillRect(f.x - 3, f.y + f.h + 1, f.w + 6, 3);
	}

	ctx.strokeStyle = darken(color, 0.4);
	ctx.lineWidth = 1;
	ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h);
}

// ---- Wall extensions ----

function drawWallExtensionsPixel(
	ctx: Ctx,
	layout: RoomLayout,
	seedPal: SeedPalette,
	variants: ItemVariants,
): void {
	const { floorTop } = layout;

	// Kitchen cabinets
	const k = layout.furniture.kitchen;
	if (k && k.y < floorTop + 10 && variants.kitchen.hasCabinets) {
		const cabColor = darken(seedPal.colors.kitchen ?? "#888", 0.1);
		const cabY = k.y - 20;
		const cabH = 18;
		ctx.fillStyle = cabColor;
		ctx.fillRect(k.x + 2, cabY, k.w * 0.4, cabH);
		ctx.fillRect(k.x + k.w * 0.5, cabY, k.w * 0.4, cabH);
		ctx.strokeStyle = darken(cabColor, 0.3);
		ctx.lineWidth = 1;
		ctx.strokeRect(k.x + 2, cabY, k.w * 0.4, cabH);
		ctx.strokeRect(k.x + k.w * 0.5, cabY, k.w * 0.4, cabH);
		ctx.fillStyle = "#bbb";
		ctx.fillRect(k.x + k.w * 0.2 - 1, cabY + cabH - 5, 2, 3);
		ctx.fillRect(k.x + k.w * 0.7 - 1, cabY + cabH - 5, 2, 3);
	}

	// Desk shelf
	const d = layout.furniture.desk;
	if (d && d.y < floorTop + 10 && variants.desk.hasShelf) {
		const shelfColor = darken(seedPal.colors.desk ?? "#888", 0.05);
		const shelfY = d.y - 12;
		ctx.fillStyle = shelfColor;
		ctx.fillRect(d.x + 2, shelfY, d.w - 4, 3);
		ctx.fillStyle = darken(shelfColor, 0.15);
		ctx.fillRect(d.x + 2, shelfY + 3, 2, 8);
		ctx.fillRect(d.x + d.w - 4, shelfY + 3, 2, 8);
		ctx.fillStyle = hueShift("#8844aa", seedPal.hueShiftDeg);
		ctx.fillRect(d.x + 6, shelfY - 4, 5, 4);
		ctx.fillStyle = hueShift("#44aa88", seedPal.hueShiftDeg);
		ctx.fillRect(d.x + 14, shelfY - 3, 3, 3);
		ctx.fillStyle = hueShift("#aa6644", seedPal.hueShiftDeg);
		ctx.fillRect(d.x + 20, shelfY - 5, 4, 5);
	}

	// Bathroom mirror
	const b = layout.furniture.bathroom;
	if (b && b.y < floorTop + 10 && variants.bathroom.hasMirror) {
		const mirY = b.y - 16;
		const mirW = Math.min(16, b.w * 0.4);
		const mirX = b.x + b.w - mirW - 8;
		ctx.fillStyle = "#c8d8e8";
		ctx.fillRect(mirX, mirY, mirW, 14);
		ctx.strokeStyle = "#999";
		ctx.lineWidth = 1;
		ctx.strokeRect(mirX, mirY, mirW, 14);
		ctx.fillStyle = "rgba(255,255,255,0.3)";
		ctx.fillRect(mirX + 2, mirY + 2, 3, 10);
	}

	// Bed headboard
	const bed = layout.furniture.bed;
	if (bed && bed.y < floorTop + 10) {
		const hbColor = darken(seedPal.colors.bed ?? "#888", 0.2);
		ctx.fillStyle = hbColor;
		ctx.fillRect(bed.x + 1, bed.y - 10, bed.w - 2, 12);
		ctx.fillStyle = darken(hbColor, 0.15);
		for (let sx = bed.x + 5; sx < bed.x + bed.w - 4; sx += 8) {
			ctx.fillRect(sx, bed.y - 8, 5, 8);
		}
		ctx.strokeStyle = darken(hbColor, 0.3);
		ctx.lineWidth = 1;
		ctx.strokeRect(bed.x + 1, bed.y - 10, bed.w - 2, 12);
	}
}

// ---- Wall decor ----

/** Pixel-style wall decor. Exported for reuse by isometric renderer. */
export function drawWallDecorPixel(
	ctx: Ctx,
	wallDecor: WallDecorItem[],
	seedPal: SeedPalette,
): void {
	const hue = seedPal.hueShiftDeg;
	for (const d of wallDecor) {
		ctx.save();
		ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
		ctx.rotate(d.rot);
		const hw = d.w / 2;
		const hh = d.h / 2;

		switch (d.type) {
			case "poster": {
				const posterColor = hueShift("#cc5544", hue);
				ctx.fillStyle = posterColor;
				ctx.fillRect(-hw, -hh, d.w, d.h);
				ctx.strokeStyle = darken(posterColor, 0.3);
				ctx.lineWidth = 0.5;
				ctx.strokeRect(-hw, -hh, d.w, d.h);
				ctx.fillStyle = lighten(posterColor, 0.3);
				ctx.fillRect(-hw + 2, -hh + 2, d.w - 4, d.h * 0.3);
				ctx.fillStyle = darken(posterColor, 0.1);
				for (let ly = -hh + d.h * 0.45; ly < hh - 3; ly += 3) {
					ctx.fillRect(-hw + 3, ly, d.w * 0.7, 1.5);
				}
				break;
			}
			case "shelf": {
				const shelfColor = hueShift("#8b7355", hue);
				ctx.fillStyle = shelfColor;
				ctx.fillRect(-hw, -hh, d.w, d.h);
				ctx.strokeStyle = darken(shelfColor, 0.3);
				ctx.lineWidth = 0.5;
				ctx.strokeRect(-hw, -hh, d.w, d.h);
				ctx.fillStyle = hueShift("#44aa88", hue);
				ctx.fillRect(-hw + 2, -hh - 5, 4, 5);
				ctx.fillStyle = hueShift("#aa4488", hue);
				ctx.fillRect(-hw + 8, -hh - 7, 5, 7);
				ctx.fillStyle = "#ddd";
				ctx.fillRect(-hw + 15, -hh - 4, 3, 4);
				ctx.fillStyle = darken(shelfColor, 0.2);
				ctx.fillRect(-hw + 3, 0, 2, 6);
				ctx.fillRect(hw - 5, 0, 2, 6);
				break;
			}
			case "clock": {
				ctx.fillStyle = "#ddd";
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "#888";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.stroke();
				ctx.strokeStyle = "#333";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(0, -hw * 0.6);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(hw * 0.4, 0);
				ctx.stroke();
				ctx.fillStyle = "#333";
				ctx.beginPath();
				ctx.arc(0, 0, 1, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case "mirror": {
				ctx.fillStyle = "#b8c8d8";
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.fill();
				ctx.strokeStyle = "#888";
				ctx.lineWidth = 1;
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.stroke();
				ctx.fillStyle = "rgba(255,255,255,0.3)";
				ctx.fillRect(-hw + 2, -hh + 2, 3, d.h - 4);
				break;
			}
			case "photo": {
				const frameColor = hueShift("#6b4423", hue);
				ctx.fillStyle = frameColor;
				ctx.fillRect(-hw, -hh, d.w, d.h);
				ctx.fillStyle = "#ddd";
				ctx.fillRect(-hw + 2, -hh + 2, d.w - 4, d.h - 4);
				ctx.fillStyle = hueShift("#88bbdd", hue);
				ctx.fillRect(-hw + 3, -hh + 3, d.w - 6, (d.h - 6) * 0.6);
				ctx.fillStyle = hueShift("#66aa66", hue);
				ctx.fillRect(
					-hw + 3,
					-hh + 3 + (d.h - 6) * 0.6,
					d.w - 6,
					(d.h - 6) * 0.4,
				);
				break;
			}
			case "coathook": {
				ctx.fillStyle = darken("#8b7355", 0.1);
				ctx.fillRect(-hw, -hh, d.w, 3);
				for (let hx = -hw + 3; hx < hw - 2; hx += 6) {
					ctx.fillStyle = "#999";
					ctx.fillRect(hx, -hh + 3, 2, 4);
					ctx.fillRect(hx - 1, -hh + 6, 4, 2);
				}
				break;
			}
			case "calendar": {
				ctx.fillStyle = "#eee";
				ctx.fillRect(-hw, -hh, d.w, d.h);
				ctx.fillStyle = hueShift("#cc3333", hue);
				ctx.fillRect(-hw, -hh, d.w, 4);
				ctx.strokeStyle = "#999";
				ctx.lineWidth = 0.5;
				ctx.strokeRect(-hw, -hh, d.w, d.h);
				ctx.fillStyle = "#888";
				for (let gx = -hw + 2; gx < hw - 1; gx += 3)
					for (let gy = -hh + 6; gy < hh - 1; gy += 3)
						ctx.fillRect(gx, gy, 1.5, 1.5);
				break;
			}
			case "plant_hanging": {
				const potColor = hueShift("#aa6644", hue);
				ctx.strokeStyle = "#888";
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(0, -hh);
				ctx.lineTo(0, -hh + 4);
				ctx.stroke();
				ctx.fillStyle = potColor;
				ctx.fillRect(-4, -hh + 4, 8, 6);
				ctx.fillStyle = hueShift("#44aa44", hue);
				ctx.beginPath();
				ctx.moveTo(-3, -hh + 10);
				ctx.quadraticCurveTo(-6, -hh + d.h * 0.5, -4, hh);
				ctx.quadraticCurveTo(-2, -hh + d.h * 0.6, 0, -hh + 10);
				ctx.fill();
				ctx.beginPath();
				ctx.moveTo(3, -hh + 10);
				ctx.quadraticCurveTo(6, -hh + d.h * 0.6, 5, hh - 2);
				ctx.quadraticCurveTo(4, -hh + d.h * 0.5, 0, -hh + 10);
				ctx.fill();
				break;
			}
		}
		ctx.restore();
	}
}

// ---- Floor decor ----

function drawDecorPixel(
	ctx: Ctx,
	decor: FloorDecorItem[],
	seedPal: SeedPalette,
): void {
	const hue = seedPal.hueShiftDeg;
	for (const d of decor) {
		ctx.save();
		ctx.translate(d.x, d.y);
		ctx.rotate(d.rot);
		const s = d.size;

		switch (d.type) {
			case "book": {
				const bookC = hueShift("#8844aa", hue);
				ctx.fillStyle = bookC;
				ctx.fillRect(-s / 2, -s / 4, s, s / 2);
				ctx.fillStyle = darken(bookC, 0.25);
				ctx.fillRect(-s / 2, -s / 4, s * 0.12, s / 2);
				ctx.fillStyle = "#e8e0d0";
				ctx.fillRect(-s / 2 + s * 0.12, -s / 4 + 1, s * 0.06, s / 2 - 2);
				ctx.strokeStyle = darken(bookC, 0.3);
				ctx.lineWidth = 0.5;
				ctx.strokeRect(-s / 2, -s / 4, s, s / 2);
				break;
			}
			case "mug": {
				const mugC = hueShift("#cc8855", hue);
				ctx.fillStyle = "#ddd";
				ctx.fillRect(-s * 0.3, -s * 0.35, s * 0.6, s * 0.7);
				ctx.fillStyle = darken(mugC, 0.4);
				ctx.fillRect(-s * 0.3 + 1, -s * 0.35, s * 0.6 - 2, 2);
				ctx.strokeStyle = "#ccc";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.arc(s * 0.3, -s * 0.05, s * 0.2, -Math.PI * 0.5, Math.PI * 0.5);
				ctx.stroke();
				ctx.fillStyle = hueShift("#8b4513", hue);
				ctx.fillRect(-s * 0.3 + 1, -s * 0.35 + 2, s * 0.6 - 2, s * 0.25);
				break;
			}
			case "plant": {
				const potC = hueShift("#6b4423", hue);
				const leafC = hueShift("#3a8a3a", hue);
				ctx.fillStyle = potC;
				ctx.fillRect(-s * 0.3, s * 0.05, s * 0.6, s * 0.4);
				ctx.fillRect(-s * 0.35, 0, s * 0.7, s * 0.08);
				ctx.fillStyle = darken(potC, 0.15);
				ctx.fillRect(-s * 0.25, s * 0.3, s * 0.5, s * 0.15);
				ctx.fillStyle = "#3a2a1a";
				ctx.fillRect(-s * 0.25, s * 0.02, s * 0.5, s * 0.08);
				ctx.fillStyle = leafC;
				ctx.beginPath();
				ctx.arc(0, -s * 0.15, s * 0.3, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(-s * 0.2, -s * 0.05, s * 0.2, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(s * 0.2, -s * 0.05, s * 0.2, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = darken(leafC, 0.15);
				ctx.beginPath();
				ctx.arc(-s * 0.1, -s * 0.2, s * 0.12, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(s * 0.15, -s * 0.12, s * 0.1, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case "laundry": {
				const clothC = hueShift("#7788aa", hue);
				const clothC2 = hueShift("#aa6677", hue);
				ctx.fillStyle = darken(clothC, 0.1);
				ctx.fillRect(-s * 0.5, -s * 0.1, s, s * 0.5);
				ctx.fillStyle = clothC2;
				ctx.beginPath();
				ctx.moveTo(-s * 0.4, s * 0.05);
				ctx.lineTo(-s * 0.15, -s * 0.3);
				ctx.lineTo(s * 0.25, -s * 0.15);
				ctx.lineTo(s * 0.4, s * 0.1);
				ctx.lineTo(-s * 0.1, s * 0.15);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = clothC;
				ctx.fillRect(-s * 0.45, 0, s * 0.25, s * 0.35);
				ctx.strokeStyle = darken(clothC, 0.2);
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(-s * 0.2, -s * 0.1);
				ctx.lineTo(s * 0.1, -s * 0.05);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(-s * 0.3, s * 0.15);
				ctx.lineTo(0, s * 0.1);
				ctx.stroke();
				break;
			}
			case "shoe": {
				const shoeC = hueShift("#5a4a3a", hue);
				ctx.fillStyle = darken(shoeC, 0.3);
				ctx.fillRect(-s * 0.45, s * 0.1, s * 0.9, s * 0.15);
				ctx.fillStyle = shoeC;
				ctx.fillRect(-s * 0.4, -s * 0.1, s * 0.7, s * 0.25);
				ctx.beginPath();
				ctx.arc(s * 0.3, 0, s * 0.2, -Math.PI * 0.5, Math.PI * 0.5);
				ctx.fill();
				ctx.fillStyle = darken(shoeC, 0.4);
				ctx.fillRect(-s * 0.4, -s * 0.1, s * 0.3, s * 0.08);
				ctx.strokeStyle = "#ddd";
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(-s * 0.15, -s * 0.1);
				ctx.lineTo(-s * 0.05, s * 0.05);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, -s * 0.1);
				ctx.lineTo(s * 0.1, s * 0.05);
				ctx.stroke();
				break;
			}
			case "paper": {
				ctx.fillStyle = "#d8d4cc";
				ctx.fillRect(-s * 0.35, -s * 0.25, s * 0.65, s * 0.5);
				ctx.fillStyle = "#eee8e0";
				ctx.fillRect(-s * 0.4, -s * 0.3, s * 0.7, s * 0.55);
				ctx.fillStyle = "#aaa";
				for (let ly = 0; ly < 4; ly++) {
					const lw = s * (0.35 + (ly === 3 ? -0.15 : 0));
					ctx.fillRect(-s * 0.3, -s * 0.2 + ly * s * 0.12, lw, 1);
				}
				ctx.fillStyle = "#d0ccc4";
				ctx.beginPath();
				ctx.moveTo(s * 0.3, -s * 0.3);
				ctx.lineTo(s * 0.15, -s * 0.3);
				ctx.lineTo(s * 0.3, -s * 0.15);
				ctx.closePath();
				ctx.fill();
				break;
			}
			case "bowl": {
				const bowlC = hueShift("#8899aa", hue);
				ctx.fillStyle = bowlC;
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.45, s * 0.3, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = darken(bowlC, 0.2);
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.32, s * 0.2, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = lighten(bowlC, 0.2);
				ctx.beginPath();
				ctx.ellipse(
					-s * 0.15,
					-s * 0.1,
					s * 0.12,
					s * 0.06,
					-0.3,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				break;
			}
			case "cushion": {
				const cushC = hueShift("#cc6644", hue);
				ctx.fillStyle = cushC;
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.4, s * 0.35, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = darken(cushC, 0.2);
				ctx.lineWidth = 0.8;
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.4, s * 0.35, 0, 0, Math.PI * 2);
				ctx.stroke();
				ctx.strokeStyle = darken(cushC, 0.15);
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(-s * 0.3, 0);
				ctx.lineTo(s * 0.3, 0);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, -s * 0.28);
				ctx.lineTo(0, s * 0.28);
				ctx.stroke();
				ctx.fillStyle = darken(cushC, 0.25);
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case "bottle": {
				const bottleC = hueShift("#44aa88", hue);
				ctx.fillStyle = bottleC;
				ctx.fillRect(-s * 0.18, -s * 0.15, s * 0.36, s * 0.55);
				ctx.fillRect(-s * 0.1, -s * 0.35, s * 0.2, s * 0.22);
				ctx.fillStyle = darken(bottleC, 0.3);
				ctx.fillRect(-s * 0.12, -s * 0.4, s * 0.24, s * 0.08);
				ctx.fillStyle = "#eee";
				ctx.fillRect(-s * 0.16, s * 0.0, s * 0.32, s * 0.15);
				ctx.fillStyle = lighten(bottleC, 0.25);
				ctx.fillRect(-s * 0.18, -s * 0.1, s * 0.08, s * 0.35);
				break;
			}
			default: {
				ctx.fillStyle = "#ddd";
				ctx.fillRect(-s / 3, -s / 4, s * 0.6, s * 0.5);
			}
		}
		ctx.restore();
	}
}

// ---- Character ----

function drawPixelChar(
	ctx: Ctx,
	x: number,
	y: number,
	cv: CharacterVariant,
	palette: TimePalette,
): void {
	const night = isNightPalette(palette);
	const skin = night ? darken(cv.skin, 0.15) : cv.skin;
	const topC = night ? darken(cv.topColor, 0.3) : cv.topColor;
	const pantsC = night ? darken(cv.pantsColor, 0.2) : cv.pantsColor;
	const shoeC = night ? darken(cv.shoeColor, 0.15) : cv.shoeColor;
	const hw = Math.floor(cv.buildW / 2);
	const bh = cv.height;
	const headW = 8;
	const headH = 7;

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.12)";
	ctx.fillRect(x - hw - 1, y + 1, cv.buildW + 2, 3);
	// Body
	ctx.fillStyle = topC;
	ctx.fillRect(x - hw, y - bh, cv.buildW, Math.floor(bh * 0.65));
	// Arms
	const armW = cv.build === "stocky" ? 3 : 2;
	ctx.fillRect(x - hw - armW, y - bh + 2, armW, Math.floor(bh * 0.5));
	ctx.fillRect(x + hw, y - bh + 2, armW, Math.floor(bh * 0.5));
	// Hands
	ctx.fillStyle = skin;
	ctx.fillRect(x - hw - armW, y - bh + 2 + Math.floor(bh * 0.5), armW, 2);
	ctx.fillRect(x + hw, y - bh + 2 + Math.floor(bh * 0.5), armW, 2);
	// Pants
	ctx.fillStyle = pantsC;
	ctx.fillRect(
		x - hw,
		y - bh + Math.floor(bh * 0.65),
		cv.buildW,
		Math.ceil(bh * 0.35),
	);
	// Shoes
	ctx.fillStyle = shoeC;
	ctx.fillRect(x - hw, y, Math.floor(cv.buildW / 2), 3);
	ctx.fillRect(x + 1, y, Math.floor(cv.buildW / 2), 3);
	// Head
	ctx.fillStyle = skin;
	ctx.fillRect(x - Math.floor(headW / 2), y - bh - headH, headW, headH);
	// Eyes
	ctx.fillStyle = "#333";
	ctx.fillRect(x - 2, y - bh - 4, 1, 1);
	ctx.fillRect(x + 2, y - bh - 4, 1, 1);

	// Hair
	const hairC = night ? darken(cv.hairColor, 0.2) : cv.hairColor;
	ctx.fillStyle = hairC;
	const hx = x - Math.floor(headW / 2);
	const hy = y - bh - headH;
	switch (cv.hairStyle) {
		case "short":
			ctx.fillRect(hx, hy, headW, 3);
			ctx.fillRect(hx, hy, 2, 5);
			break;
		case "buzz":
			ctx.fillRect(hx, hy, headW, 2);
			break;
		case "long":
			ctx.fillRect(hx - 1, hy, headW + 2, 3);
			ctx.fillRect(hx - 1, hy, 2, headH + 4);
			ctx.fillRect(hx + headW - 1, hy, 2, headH + 4);
			break;
		case "ponytail":
			ctx.fillRect(hx, hy, headW, 3);
			ctx.fillRect(hx + headW - 2, hy + 1, 2, 3);
			ctx.fillRect(hx + headW, hy + 3, 3, 2);
			ctx.fillRect(hx + headW + 1, hy + 5, 2, 3);
			break;
		case "bun":
			ctx.fillRect(hx, hy, headW, 3);
			ctx.fillRect(hx + 2, hy - 3, 4, 4);
			break;
		case "curly":
			ctx.fillRect(hx - 1, hy - 1, headW + 2, 4);
			ctx.fillRect(hx - 1, hy, 2, headH - 1);
			ctx.fillRect(hx + headW - 1, hy, 2, headH - 1);
			ctx.fillRect(hx - 2, hy + 1, 1, 2);
			ctx.fillRect(hx + headW, hy + 1, 1, 2);
			ctx.fillRect(hx - 2, hy + 4, 1, 2);
			ctx.fillRect(hx + headW, hy + 4, 1, 2);
			break;
		case "shaved":
			ctx.fillStyle = darken(skin, 0.08);
			ctx.fillRect(hx + 1, hy, headW - 2, 2);
			break;
	}
}

// ---- Dog ----

function drawPixelDog(
	ctx: Ctx,
	x: number,
	y: number,
	dv: DogVariant,
	palette: TimePalette,
	mood: DogMoodState,
	energy: number,
): void {
	const night = isNightPalette(palette);
	let bodyC = night ? darken(dv.bodyColor, 0.2) : dv.bodyColor;
	const earC = night ? darken(dv.earColor, 0.2) : dv.earColor;
	const bw = dv.bodyW;
	const bh = dv.bodyH;
	const legH = Math.floor(bh * 0.3);

	// Mood affects body color
	if (mood === "disappointed") {
		bodyC = darken(bodyC, 0.15);
	} else if (mood === "normal" && energy < 0.3) {
		bodyC = darken(bodyC, 0.08);
	}

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	ctx.fillRect(x - 1, y + bh, bw + 2, 3);
	// Body
	ctx.fillStyle = bodyC;
	ctx.fillRect(x, y, bw, bh);
	// Spots
	if (dv.hasSpots) {
		ctx.fillStyle = night ? darken(dv.spotColor, 0.2) : dv.spotColor;
		ctx.fillRect(x + Math.floor(bw * 0.3), y + 2, 3, 3);
		ctx.fillRect(x + Math.floor(bw * 0.6), y + 4, 4, 2);
		ctx.fillRect(x + Math.floor(bw * 0.15), y + bh - 4, 2, 2);
	}
	// Legs
	ctx.fillStyle = darken(bodyC, 0.1);
	const legW = Math.max(2, Math.floor(bw * 0.15));
	ctx.fillRect(x + 1, y + bh, legW, legH);
	ctx.fillRect(x + legW + 2, y + bh, legW, legH);
	ctx.fillRect(x + bw - legW * 2 - 2, y + bh, legW, legH);
	ctx.fillRect(x + bw - legW - 1, y + bh, legW, legH);

	// Ears -- mood-reactive
	ctx.fillStyle = earC;
	if (mood === "disappointed") {
		// Droopy ears
		if (dv.earStyle === "pointed") {
			ctx.fillRect(x - 1, y + 1, 3, 4);
			ctx.fillRect(x + bw - 2, y + 1, 3, 4);
		} else {
			ctx.fillRect(x - 2, y + 1, 2, 6);
			ctx.fillRect(x + bw, y + 1, 2, 6);
		}
	} else if (
		mood === "excited" ||
		mood === "happyForYou" ||
		mood === "hopeful" ||
		mood === "interested"
	) {
		// Perky/alert ears -- extra tall
		const h = mood === "excited" ? 6 : 5;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(x + 1, y - h, 3, h + 1);
			ctx.fillRect(x + bw - 4, y - h, 3, h + 1);
		} else {
			ctx.fillRect(x - 1, y - h + 2, 2, h + 1);
			ctx.fillRect(x + bw - 1, y - h + 2, 2, h + 1);
		}
	} else if (mood === "unimpressed" || mood === "sympathetic") {
		// Slightly flattened
		if (dv.earStyle === "pointed") {
			ctx.fillRect(x + 1, y - 1, 3, 3);
			ctx.fillRect(x + bw - 4, y - 1, 3, 3);
		} else {
			ctx.fillRect(x - 1, y, 2, 4);
			ctx.fillRect(x + bw - 1, y, 2, 4);
		}
	} else if (mood === "restless") {
		// Twitchy ears
		const twitch = Math.sin(performance.now() / 150) * 0.5;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(x + 1, y - 4 + twitch, 3, 5);
			ctx.fillRect(x + bw - 4, y - 4 - twitch, 3, 5);
		} else {
			ctx.fillRect(x - 1, y - 2 + twitch, 2, 5);
			ctx.fillRect(x + bw - 1, y - 2 - twitch, 2, 5);
		}
	} else {
		// Normal -- height varies with energy
		const earH = energy > 0.6 ? 4 : energy < 0.3 ? 2 : 3;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(x + 1, y - earH, 3, earH + 1);
			ctx.fillRect(x + bw - 4, y - earH, 3, earH + 1);
		} else {
			ctx.fillRect(x - 1, y - earH + 1, 2, earH + 2);
			ctx.fillRect(x + bw - 1, y - earH + 1, 2, earH + 2);
		}
	}

	// Eyes -- mood and energy reactive
	ctx.fillStyle = "#333";
	const eyeY = y + Math.floor(bh * 0.3);
	const eyeXL = x + Math.floor(bw * 0.2);
	const eyeXR = x + Math.floor(bw * 0.65);
	if (mood === "disappointed") {
		// Sad eyes -- horizontal lines
		ctx.fillRect(eyeXL, eyeY + 1, 3, 1);
		ctx.fillRect(eyeXR, eyeY + 1, 3, 1);
	} else if (mood === "normal" && energy < 0.25) {
		// Very tired -- half-closed
		ctx.fillRect(eyeXL, eyeY + 1, 2, 1);
		ctx.fillRect(eyeXR, eyeY + 1, 2, 1);
	} else {
		// Normal eyes
		ctx.fillRect(eyeXL, eyeY, 2, 2);
		ctx.fillRect(eyeXR, eyeY, 2, 2);
	}

	// Nose
	ctx.fillStyle = dv.noseColor;
	ctx.fillRect(x + Math.floor(bw * 0.43), y + Math.floor(bh * 0.55), 2, 2);

	// Tail -- mood-reactive
	ctx.strokeStyle = bodyC;
	ctx.lineWidth = 2;
	const tailX = x + bw;
	const tailBaseY = y + Math.floor(bh * 0.3);
	ctx.beginPath();
	ctx.moveTo(tailX, tailBaseY);

	if (mood === "disappointed") {
		ctx.lineTo(tailX + 4, tailBaseY + 5);
	} else if (mood === "excited") {
		const wag = Math.sin(performance.now() / 80) * 3;
		ctx.lineTo(tailX + 4, tailBaseY - 5 + wag);
	} else if (mood === "happyForYou") {
		const wag = Math.sin(performance.now() / 150) * 2;
		ctx.lineTo(tailX + 4, tailBaseY - 4 + wag);
	} else if (mood === "hopeful" || mood === "interested") {
		ctx.lineTo(tailX + 4, tailBaseY - 4);
	} else if (mood === "sympathetic") {
		ctx.lineTo(tailX + 4, tailBaseY + 1);
	} else if (mood === "unimpressed") {
		ctx.lineTo(tailX + 4, tailBaseY + 2);
	} else if (mood === "restless") {
		const twitch = Math.sin(performance.now() / 120) * 2;
		ctx.lineTo(tailX + 4, tailBaseY - 4 + twitch);
	} else {
		// Normal -- energy-based
		if (dv.tailStyle === "up") {
			ctx.lineTo(tailX + 4, energy > 0.5 ? tailBaseY - 5 : tailBaseY - 2);
		} else if (dv.tailStyle === "curl") {
			const curveY = energy > 0.5 ? tailBaseY - 7 : tailBaseY - 4;
			ctx.quadraticCurveTo(tailX + 5, tailBaseY - 4, tailX + 3, curveY);
		} else {
			ctx.lineTo(tailX + 4, energy > 0.5 ? tailBaseY : tailBaseY + 3);
		}
	}
	ctx.stroke();
}
