/**
 * Minimal geometric style renderer (Style 2).
 * Clean rounded shapes, solid fills, soft shadows. No outlines or pixel grid.
 */

import type { AnimationState } from "../../systems/animation";
import {
	darken,
	drawFurnitureHighlight,
	hueShift,
	lighten,
	roundRect,
} from "../color";
import { applyTimeOverlay } from "../palettes";
import type {
	BedVariant,
	CharacterVariant,
	DeskVariant,
	DogMoodState,
	DogVariant,
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

/** Creates a minimal geometric renderer. */
export function createMinimalRenderer(): RoomRenderer {
	return {
		drawRoom(ctx: Ctx, layout: RoomLayout, options: RoomDrawOptions): void {
			drawMinimalRoom(ctx, layout, options);
		},
		drawCharacter(
			ctx: Ctx,
			x: number,
			y: number,
			variants: CharacterVariant,
			timePalette: TimePalette,
			_animState: AnimationState | null,
		): void {
			drawMinimalChar(ctx, x, y, variants, timePalette);
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
			drawMinimalDog(ctx, x, y, variants, timePalette, mood, energy);
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

function drawMinimalRoom(
	ctx: Ctx,
	layout: RoomLayout,
	options: RoomDrawOptions,
): void {
	const { timePalette, seedPalette, variants } = options;
	const { roomWidth, roomHeight, wallY, floorTop } = layout;

	// Gradient background: wall -> floor
	const grd = ctx.createLinearGradient(0, 0, 0, roomHeight);
	grd.addColorStop(0, timePalette.wall);
	grd.addColorStop(wallY / roomHeight, timePalette.wall);
	grd.addColorStop(floorTop / roomHeight, timePalette.floor);
	grd.addColorStop(1, darken(timePalette.floor, 0.05));
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, roomWidth, roomHeight);

	// Wall decor (skip in top-down mode)
	if (wallY > 0) {
		drawWallDecorGeometric(ctx, layout.wallDecor, seedPalette);
		drawWallExtensionsGeometric(ctx, layout, seedPalette, variants);
	}

	// Furniture sorted by Y for depth
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
		const c = seedPalette.colors[name] ?? "#888";

		// Soft shadow
		ctx.fillStyle = "rgba(0,0,0,0.06)";
		roundRect(ctx, f.x + 1, f.y + 2, f.w, f.h, 4);
		ctx.fill();

		// Base shape
		ctx.fillStyle = c;
		roundRect(ctx, f.x, f.y, f.w, f.h, 4);
		ctx.fill();

		switch (name) {
			case "bed":
				drawBedMinimal(ctx, f, c, variants.bed);
				break;
			case "desk":
				drawDeskMinimal(ctx, f, variants.desk, seedPalette);
				break;
			case "kitchen":
				drawKitchenMinimal(ctx, f, c, variants.kitchen, seedPalette);
				break;
			case "couch":
				if (variants.couch.style === "beanbag") {
					ctx.fillStyle = c;
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
				}
				break;
			case "door":
				ctx.fillStyle = "#d4a040";
				ctx.beginPath();
				ctx.arc(f.x + 4, f.y + f.h / 2, 2, 0, Math.PI * 2);
				ctx.fill();
				break;
		}

		if (options.showLabels) {
			ctx.fillStyle = "#fff";
			ctx.font = "5px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(name, f.x + f.w / 2, f.y + f.h / 2 + 2);
		}
	}

	// Floor decor
	drawDecorMinimal(ctx, layout.decor, seedPalette);

	applyTimeOverlay(ctx, timePalette, roomWidth, roomHeight);
}

// ---- Furniture details ----

function drawBedMinimal(ctx: Ctx, f: Rect, c: string, v: BedVariant): void {
	// Pillows
	ctx.fillStyle = lighten(c, 0.25);
	const pw = 11;
	for (let pi = 0; pi < v.pillowCount; pi++) {
		roundRect(ctx, f.x + 3 + pi * (pw + 1), f.y + 3, pw, 7, 2);
		ctx.fill();
	}
	// Blanket
	ctx.fillStyle = lighten(c, 0.1);
	roundRect(ctx, f.x + 2, f.y + 12, f.w - 4, f.h - 14, 2);
	ctx.fill();
}

function drawDeskMinimal(
	ctx: Ctx,
	f: Rect,
	v: DeskVariant,
	seedPal: SeedPalette,
): void {
	const screenColor = hueShift("#5577bb", seedPal.hueShiftDeg);
	if (v.monitor === "laptop") {
		ctx.fillStyle = "#444";
		roundRect(ctx, f.x + 8, f.y + 10, 20, 2, 1);
		ctx.fill();
		ctx.fillStyle = "#333";
		roundRect(ctx, f.x + 8, f.y + 2, 20, 9, 1);
		ctx.fill();
		ctx.fillStyle = screenColor;
		roundRect(ctx, f.x + 9, f.y + 3, 18, 7, 1);
		ctx.fill();
	} else if (v.monitor === "desktop" || v.monitor === "dual") {
		ctx.fillStyle = "#333";
		roundRect(ctx, f.x + 8, f.y + 2, 20, 12, 1);
		ctx.fill();
		ctx.fillStyle = screenColor;
		roundRect(ctx, f.x + 9, f.y + 3, 18, 10, 1);
		ctx.fill();
	}
}

function drawKitchenMinimal(
	ctx: Ctx,
	f: Rect,
	c: string,
	v: KitchenVariant,
	seedPal: SeedPalette,
): void {
	// Burners
	ctx.fillStyle = darken(c, 0.12);
	ctx.beginPath();
	ctx.arc(f.x + 10, f.y + 12, 4, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(f.x + 22, f.y + 12, 4, 0, Math.PI * 2);
	ctx.fill();
	if (v.hasMug) {
		ctx.fillStyle = hueShift("#cc6644", seedPal.hueShiftDeg);
		roundRect(ctx, f.x + f.w - 10, f.y + 4, 6, 7, 2);
		ctx.fill();
	}
}

// ---- Wall extensions ----

function drawWallExtensionsGeometric(
	ctx: Ctx,
	layout: RoomLayout,
	seedPal: SeedPalette,
	variants: ItemVariants,
): void {
	const { floorTop } = layout;

	// Kitchen cabinets
	const k = layout.furniture.kitchen;
	if (k && k.y < floorTop + 10 && variants.kitchen.hasCabinets) {
		ctx.fillStyle = darken(seedPal.colors.kitchen ?? "#888", 0.08);
		roundRect(ctx, k.x + 2, k.y - 20, k.w * 0.4, 18, 3);
		ctx.fill();
		roundRect(ctx, k.x + k.w * 0.5, k.y - 20, k.w * 0.4, 18, 3);
		ctx.fill();
	}

	// Desk shelf
	const d = layout.furniture.desk;
	if (d && d.y < floorTop + 10 && variants.desk.hasShelf) {
		ctx.fillStyle = darken(seedPal.colors.desk ?? "#888", 0.05);
		roundRect(ctx, d.x + 2, d.y - 12, d.w - 4, 3, 1);
		ctx.fill();
		ctx.fillStyle = hueShift("#8844aa", seedPal.hueShiftDeg);
		roundRect(ctx, d.x + 6, d.y - 16, 5, 4, 1);
		ctx.fill();
		ctx.fillStyle = hueShift("#aa6644", seedPal.hueShiftDeg);
		roundRect(ctx, d.x + 14, d.y - 17, 4, 5, 1);
		ctx.fill();
	}

	// Bathroom mirror
	const b = layout.furniture.bathroom;
	if (b && b.y < floorTop + 10 && variants.bathroom.hasMirror) {
		const mirW = Math.min(16, b.w * 0.4);
		ctx.fillStyle = "#c8d8e8";
		roundRect(ctx, b.x + b.w - mirW - 8, b.y - 16, mirW, 14, 3);
		ctx.fill();
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		roundRect(ctx, b.x + b.w - mirW - 6, b.y - 14, 3, 10, 1);
		ctx.fill();
	}

	// Bed headboard
	const bed = layout.furniture.bed;
	if (bed && bed.y < floorTop + 10) {
		ctx.fillStyle = darken(seedPal.colors.bed ?? "#888", 0.18);
		roundRect(ctx, bed.x + 1, bed.y - 10, bed.w - 2, 12, 3);
		ctx.fill();
	}
}

// ---- Wall decor ----

function drawWallDecorGeometric(
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
				const c = hueShift("#cc5544", hue);
				ctx.fillStyle = c;
				roundRect(ctx, -hw, -hh, d.w, d.h, 3);
				ctx.fill();
				ctx.fillStyle = lighten(c, 0.25);
				roundRect(ctx, -hw + 2, -hh + 2, d.w - 4, d.h * 0.3, 2);
				ctx.fill();
				break;
			}
			case "shelf": {
				const c = hueShift("#8b7355", hue);
				ctx.fillStyle = c;
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.fill();
				ctx.fillStyle = hueShift("#44aa88", hue);
				ctx.beginPath();
				ctx.arc(-hw + 5, -hh - 3, 3, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = hueShift("#aa4488", hue);
				roundRect(ctx, -hw + 10, -hh - 5, 5, 5, 1);
				ctx.fill();
				break;
			}
			case "clock": {
				ctx.fillStyle = "#e0e0e0";
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#666";
				ctx.fillRect(-0.5, -hw * 0.5, 1, hw * 0.5);
				ctx.fillRect(0, -0.5, hw * 0.35, 1);
				break;
			}
			case "mirror": {
				ctx.fillStyle = "#c0d0e0";
				roundRect(ctx, -hw, -hh, d.w, d.h, 3);
				ctx.fill();
				ctx.fillStyle = "rgba(255,255,255,0.25)";
				roundRect(ctx, -hw + 2, -hh + 2, d.w * 0.3, d.h - 4, 2);
				ctx.fill();
				break;
			}
			case "photo": {
				ctx.fillStyle = hueShift("#6b4423", hue);
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.fill();
				ctx.fillStyle = "#ddd";
				roundRect(ctx, -hw + 2, -hh + 2, d.w - 4, d.h - 4, 1);
				ctx.fill();
				break;
			}
			case "coathook": {
				ctx.fillStyle = "#999";
				roundRect(ctx, -hw, -hh, d.w, 3, 1);
				ctx.fill();
				for (let hx = -hw + 3; hx < hw - 2; hx += 6) {
					ctx.beginPath();
					ctx.arc(hx + 1, -hh + 6, 2, 0, Math.PI * 2);
					ctx.fill();
				}
				break;
			}
			case "calendar": {
				ctx.fillStyle = "#eee";
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.fill();
				ctx.fillStyle = hueShift("#cc3333", hue);
				roundRect(ctx, -hw, -hh, d.w, 4, 2);
				ctx.fill();
				break;
			}
			case "plant_hanging": {
				const potC = hueShift("#aa6644", hue);
				ctx.fillStyle = "#888";
				ctx.fillRect(-0.5, -hh, 1, 4);
				ctx.fillStyle = potC;
				roundRect(ctx, -4, -hh + 4, 8, 6, 2);
				ctx.fill();
				ctx.fillStyle = hueShift("#44aa44", hue);
				ctx.beginPath();
				ctx.ellipse(-3, hh - 4, 4, 8, -0.2, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.ellipse(3, hh - 2, 3, 7, 0.2, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
		}
		ctx.restore();
	}
}

// ---- Floor decor ----

function drawDecorMinimal(
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
		ctx.globalAlpha = 0.85;

		switch (d.type) {
			case "book": {
				const c = hueShift("#8855aa", hue);
				ctx.fillStyle = c;
				roundRect(ctx, -s / 2, -s / 4, s, s / 2, 1.5);
				ctx.fill();
				// Spine
				ctx.fillStyle = darken(c, 0.2);
				roundRect(ctx, -s / 2, -s / 4, s * 0.15, s / 2, 1);
				ctx.fill();
				// Pages
				ctx.fillStyle = "#ece4d4";
				ctx.fillRect(-s / 2 + s * 0.15, -s / 4 + 1, s * 0.08, s / 2 - 2);
				break;
			}
			case "mug": {
				// Body
				ctx.fillStyle = "#e0d8d0";
				roundRect(ctx, -s * 0.3, -s * 0.35, s * 0.6, s * 0.7, 2);
				ctx.fill();
				// Handle
				ctx.strokeStyle = "#d0c8c0";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.arc(s * 0.3, -s * 0.05, s * 0.18, -Math.PI * 0.5, Math.PI * 0.5);
				ctx.stroke();
				// Liquid
				ctx.fillStyle = hueShift("#8b4513", hue);
				roundRect(ctx, -s * 0.25, -s * 0.3, s * 0.5, s * 0.25, 1);
				ctx.fill();
				break;
			}
			case "plant": {
				const potC = hueShift("#6b4423", hue);
				const leafC = hueShift("#55aa55", hue);
				ctx.fillStyle = potC;
				roundRect(ctx, -s * 0.3, 0, s * 0.6, s * 0.4, 2);
				ctx.fill();
				ctx.fillStyle = leafC;
				ctx.beginPath();
				ctx.arc(0, -s * 0.12, s * 0.32, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(-s * 0.18, -s * 0.02, s * 0.18, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(s * 0.18, -s * 0.02, s * 0.18, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case "laundry": {
				const c1 = hueShift("#7788aa", hue);
				const c2 = hueShift("#aa6677", hue);
				ctx.fillStyle = darken(c1, 0.1);
				roundRect(ctx, -s * 0.45, -s * 0.05, s * 0.9, s * 0.45, 2);
				ctx.fill();
				ctx.fillStyle = c2;
				roundRect(ctx, -s * 0.35, -s * 0.25, s * 0.65, s * 0.35, 3);
				ctx.fill();
				ctx.fillStyle = c1;
				roundRect(ctx, -s * 0.4, 0, s * 0.25, s * 0.3, 2);
				ctx.fill();
				break;
			}
			case "shoe": {
				const c = hueShift("#5a4a3a", hue);
				// Sole
				ctx.fillStyle = darken(c, 0.3);
				roundRect(ctx, -s * 0.45, s * 0.08, s * 0.9, s * 0.14, 1);
				ctx.fill();
				// Upper
				ctx.fillStyle = c;
				roundRect(ctx, -s * 0.4, -s * 0.12, s * 0.7, s * 0.28, 3);
				ctx.fill();
				// Toe
				ctx.beginPath();
				ctx.arc(s * 0.28, 0, s * 0.18, 0, Math.PI * 2);
				ctx.fill();
				// Opening
				ctx.fillStyle = darken(c, 0.35);
				roundRect(ctx, -s * 0.38, -s * 0.1, s * 0.28, s * 0.1, 1);
				ctx.fill();
				break;
			}
			case "paper": {
				// Bottom sheet
				ctx.fillStyle = "#d8d4cc";
				roundRect(ctx, -s * 0.32, -s * 0.22, s * 0.6, s * 0.48, 1);
				ctx.fill();
				// Top sheet
				ctx.fillStyle = "#ece8e0";
				roundRect(ctx, -s * 0.38, -s * 0.28, s * 0.7, s * 0.52, 1);
				ctx.fill();
				// Text lines
				ctx.fillStyle = "#bbb";
				for (let i = 0; i < 3; i++) {
					ctx.fillRect(
						-s * 0.28,
						-s * 0.18 + i * s * 0.12,
						s * (0.4 - (i === 2 ? 0.12 : 0)),
						1,
					);
				}
				break;
			}
			case "bowl": {
				const c = hueShift("#8899aa", hue);
				ctx.fillStyle = c;
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.42, s * 0.28, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = darken(c, 0.18);
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.3, s * 0.18, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = lighten(c, 0.2);
				ctx.beginPath();
				ctx.ellipse(
					-s * 0.12,
					-s * 0.08,
					s * 0.1,
					s * 0.05,
					-0.3,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				break;
			}
			case "cushion": {
				const c = hueShift("#cc6644", hue);
				ctx.fillStyle = c;
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.38, s * 0.32, 0, 0, Math.PI * 2);
				ctx.fill();
				// Seam
				ctx.strokeStyle = darken(c, 0.15);
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(-s * 0.28, 0);
				ctx.lineTo(s * 0.28, 0);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, -s * 0.24);
				ctx.lineTo(0, s * 0.24);
				ctx.stroke();
				// Button
				ctx.fillStyle = darken(c, 0.25);
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.05, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case "bottle": {
				const c = hueShift("#44aa88", hue);
				ctx.fillStyle = c;
				roundRect(ctx, -s * 0.16, -s * 0.15, s * 0.32, s * 0.5, 2);
				ctx.fill();
				roundRect(ctx, -s * 0.09, -s * 0.32, s * 0.18, s * 0.2, 1);
				ctx.fill();
				// Cap
				ctx.fillStyle = darken(c, 0.3);
				roundRect(ctx, -s * 0.1, -s * 0.38, s * 0.2, s * 0.08, 1);
				ctx.fill();
				// Label
				ctx.fillStyle = "#eee";
				ctx.fillRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.14);
				break;
			}
			default: {
				ctx.fillStyle = "#ddd";
				roundRect(ctx, -s / 3, -s / 4, s * 0.6, s * 0.5, 1);
				ctx.fill();
			}
		}
		ctx.globalAlpha = 1;
		ctx.restore();
	}
}

// ---- Character ----

function drawMinimalChar(
	ctx: Ctx,
	x: number,
	y: number,
	cv: CharacterVariant,
	_timePalette: TimePalette,
): void {
	const hw = Math.floor(cv.buildW / 2);
	const bh = cv.height;

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.05)";
	ctx.beginPath();
	ctx.ellipse(x, y + 2, hw + 2, 3, 0, 0, Math.PI * 2);
	ctx.fill();

	// Body
	ctx.fillStyle = cv.topColor;
	roundRect(ctx, x - hw, y - bh, cv.buildW, Math.floor(bh * 0.65), 3);
	ctx.fill();
	ctx.fillStyle = cv.pantsColor;
	roundRect(
		ctx,
		x - hw,
		y - bh + Math.floor(bh * 0.65),
		cv.buildW,
		Math.ceil(bh * 0.35),
		2,
	);
	ctx.fill();

	// Head
	ctx.fillStyle = cv.skin;
	ctx.beginPath();
	ctx.arc(x, y - bh - 4, 5, 0, Math.PI * 2);
	ctx.fill();

	// Hair
	ctx.fillStyle = cv.hairColor;
	switch (cv.hairStyle) {
		case "curly":
			ctx.beginPath();
			ctx.arc(x, y - bh - 5, 6, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = cv.skin;
			ctx.beginPath();
			ctx.arc(x, y - bh - 3, 4.5, 0, Math.PI);
			ctx.fill();
			break;
		case "bun":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 5, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x, y - bh - 10, 3, 0, Math.PI * 2);
			ctx.fill();
			break;
		case "long":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 6, Math.PI, Math.PI * 2);
			ctx.fill();
			roundRect(ctx, x - 6, y - bh - 5, 2, 10, 1);
			ctx.fill();
			roundRect(ctx, x + 4, y - bh - 5, 2, 10, 1);
			ctx.fill();
			break;
		case "ponytail":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 5, Math.PI, Math.PI * 2);
			ctx.fill();
			roundRect(ctx, x + 4, y - bh - 4, 3, 2, 1);
			ctx.fill();
			roundRect(ctx, x + 5, y - bh - 2, 2, 5, 1);
			ctx.fill();
			break;
		case "shaved":
			// Barely visible -- just head circle
			break;
		default:
			// short, buzz
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 5, Math.PI, Math.PI * 2);
			ctx.fill();
			break;
	}
}

// ---- Dog ----

function drawMinimalDog(
	ctx: Ctx,
	x: number,
	y: number,
	dv: DogVariant,
	_timePalette: TimePalette,
	mood: DogMoodState,
	energy: number,
): void {
	const bw = dv.bodyW;
	const bh = dv.bodyH;

	let bodyC = dv.bodyColor;
	if (mood === "disappointed") {
		bodyC = darken(bodyC, 0.15);
	} else if (mood === "normal" && energy < 0.3) {
		bodyC = darken(bodyC, 0.08);
	}

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.04)";
	ctx.beginPath();
	ctx.ellipse(x + bw / 2, y + bh + 1, bw / 2 + 2, 3, 0, 0, Math.PI * 2);
	ctx.fill();

	// Body
	ctx.fillStyle = bodyC;
	roundRect(ctx, x, y, bw, bh, 3);
	ctx.fill();

	// Spots
	if (dv.hasSpots) {
		ctx.fillStyle = dv.spotColor;
		ctx.beginPath();
		ctx.arc(x + bw * 0.35, y + bh * 0.4, 2, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + bw * 0.65, y + bh * 0.6, 1.5, 0, Math.PI * 2);
		ctx.fill();
	}

	// Ears -- mood-reactive
	ctx.fillStyle = dv.earColor;
	if (mood === "disappointed") {
		// Droopy -- lower, smaller
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.arc(x + 3, y + 2, 2, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x + bw - 3, y + 2, 2, 0, Math.PI * 2);
			ctx.fill();
		} else {
			roundRect(ctx, x - 1, y + 1, 2, 6, 1);
			ctx.fill();
			roundRect(ctx, x + bw - 1, y + 1, 2, 6, 1);
			ctx.fill();
		}
	} else if (
		mood === "excited" ||
		mood === "happyForYou" ||
		mood === "hopeful" ||
		mood === "interested"
	) {
		// Perky -- higher, larger
		const r = mood === "excited" ? 3 : 2.5;
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.arc(x + 3, y - 2, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x + bw - 3, y - 2, r, 0, Math.PI * 2);
			ctx.fill();
		} else {
			roundRect(ctx, x - 1, y - 3, 2, 6, 1);
			ctx.fill();
			roundRect(ctx, x + bw - 1, y - 3, 2, 6, 1);
			ctx.fill();
		}
	} else if (mood === "unimpressed" || mood === "sympathetic") {
		// Flat
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.arc(x + 3, y, 2, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x + bw - 3, y, 2, 0, Math.PI * 2);
			ctx.fill();
		} else {
			roundRect(ctx, x - 1, y, 2, 4, 1);
			ctx.fill();
			roundRect(ctx, x + bw - 1, y, 2, 4, 1);
			ctx.fill();
		}
	} else if (mood === "restless") {
		// Alternating height
		const offset = Math.sin(performance.now() / 150) * 1.5;
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.arc(x + 3, y - 1 + offset, 2.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x + bw - 3, y - 1 - offset, 2.5, 0, Math.PI * 2);
			ctx.fill();
		} else {
			roundRect(ctx, x - 1, y - 2 + offset, 2, 5, 1);
			ctx.fill();
			roundRect(ctx, x + bw - 1, y - 2 - offset, 2, 5, 1);
			ctx.fill();
		}
	} else {
		// Normal -- energy-based ear position
		const earY = energy > 0.6 ? y - 1 : energy < 0.3 ? y + 1 : y;
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.arc(x + 3, earY, 2.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x + bw - 3, earY, 2.5, 0, Math.PI * 2);
			ctx.fill();
		} else {
			roundRect(ctx, x - 1, earY, 2, 5, 1);
			ctx.fill();
			roundRect(ctx, x + bw - 1, earY, 2, 5, 1);
			ctx.fill();
		}
	}

	// Eyes -- mood-reactive
	ctx.fillStyle = "#333";
	const eyeY = y + Math.floor(bh * 0.3);
	const eyeXL = x + Math.floor(bw * 0.2);
	const eyeXR = x + Math.floor(bw * 0.65);
	if (mood === "disappointed") {
		// Sad -- narrow horizontal
		ctx.fillRect(eyeXL, eyeY + 1, 2.5, 1);
		ctx.fillRect(eyeXR, eyeY + 1, 2.5, 1);
	} else if (mood === "normal" && energy < 0.25) {
		// Tired -- half-closed
		ctx.fillRect(eyeXL, eyeY + 1, 2, 1);
		ctx.fillRect(eyeXR, eyeY + 1, 2, 1);
	} else {
		ctx.fillRect(eyeXL, eyeY, 2, 2);
		ctx.fillRect(eyeXR, eyeY, 2, 2);
	}

	// Nose
	ctx.fillStyle = dv.noseColor;
	ctx.fillRect(x + Math.floor(bw * 0.43), y + Math.floor(bh * 0.55), 2, 2);

	// Tail -- mood-reactive (minimal uses simple rounded lines)
	ctx.strokeStyle = bodyC;
	ctx.lineWidth = 2;
	ctx.lineCap = "round";
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
	ctx.lineCap = "butt";
}
