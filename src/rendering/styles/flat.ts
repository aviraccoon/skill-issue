/**
 * Flat illustration style renderer (Style 5).
 * Bold outlines, solid fills, strong shadows. Illustrative and graphic.
 */

import type { AnimationState } from "../../systems/animation";
import { mulberry32 } from "../../utils/random";
import {
	darken,
	drawFurnitureHighlight,
	hueShift,
	lighten,
	roundRect,
} from "../color";
import { applyNightGlow, applyTimeOverlay, isNightPalette } from "../palettes";
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

/** Creates a flat illustration renderer. */
export function createFlatRenderer(): RoomRenderer {
	return {
		drawRoom(ctx: Ctx, layout: RoomLayout, options: RoomDrawOptions): void {
			drawFlatRoom(ctx, layout, options);
		},
		drawCharacter(
			ctx: Ctx,
			x: number,
			y: number,
			variants: CharacterVariant,
			timePalette: TimePalette,
			_animState: AnimationState | null,
		): void {
			drawFlatChar(ctx, x, y, variants, timePalette);
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
			drawFlatDog(ctx, x, y, variants, timePalette, mood, energy);
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

// ---- Helpers ----

/** Apply night darkening to a color. */
function nc(color: string, night: boolean, amount = 0.3): string {
	return night ? darken(color, amount) : color;
}

/** Hue-shift + optional night darkening. */
function flatColor(
	base: string,
	hue: number,
	night: boolean,
	nightAmount = 0.3,
): string {
	const c = hueShift(base, hue);
	return night ? darken(c, nightAmount) : c;
}

/** Outline color: darkened by 35%. */
function outlineColor(c: string): string {
	return darken(c, 0.35);
}

// ---- Main room draw ----

function drawFlatRoom(
	ctx: Ctx,
	layout: RoomLayout,
	options: RoomDrawOptions,
): void {
	const { timePalette, seedPalette, variants } = options;
	const { roomWidth, roomHeight, wallY, floorTop } = layout;
	const night = isNightPalette(timePalette);

	// Background
	ctx.fillStyle = night ? "#1a1830" : "#e8e0d0";
	ctx.fillRect(0, 0, roomWidth, roomHeight);

	// Wall
	ctx.fillStyle = timePalette.wall;
	ctx.fillRect(0, 0, roomWidth, wallY);

	// Floor
	const floorColor = night ? "#262040" : "#d8c8a8";
	ctx.fillStyle = floorColor;
	ctx.fillRect(0, floorTop, roomWidth, roomHeight - floorTop);

	// Baseboard
	ctx.fillStyle = darken(timePalette.wall, 0.15);
	ctx.fillRect(0, wallY, roomWidth, floorTop - wallY);
	ctx.strokeStyle = darken(floorColor, 0.2);
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(0, floorTop);
	ctx.lineTo(roomWidth, floorTop);
	ctx.stroke();

	// Rug
	drawRug(ctx, layout, seedPalette, night);

	// Wall decor (skip in top-down mode)
	if (wallY > 0) {
		drawWallDecorFlat(ctx, layout.wallDecor, seedPalette, night);
		drawWallExtensionsFlat(ctx, layout, seedPalette, variants, night);
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
		const fc = nc(seedPalette.colors[name] ?? "#888", night);
		const oc = outlineColor(fc);

		// Shadow
		ctx.fillStyle = "rgba(0,0,0,0.12)";
		roundRect(ctx, f.x + 2, f.y + 3, f.w, f.h, 3);
		ctx.fill();

		// Base shape
		ctx.fillStyle = fc;
		roundRect(ctx, f.x, f.y, f.w, f.h, 3);
		ctx.fill();
		ctx.strokeStyle = oc;
		ctx.lineWidth = 2;
		roundRect(ctx, f.x, f.y, f.w, f.h, 3);
		ctx.stroke();

		switch (name) {
			case "bed":
				drawBedFlat(ctx, f, fc, oc, variants.bed, night);
				break;
			case "desk":
				drawDeskFlat(ctx, f, variants.desk, seedPalette, night);
				break;
			case "kitchen":
				drawKitchenFlat(ctx, f, oc, variants.kitchen);
				break;
			case "couch":
				if (variants.couch.style === "beanbag") {
					ctx.fillStyle = fc;
					ctx.beginPath();
					ctx.ellipse(
						f.x + f.w / 2,
						f.y + f.h / 2,
						f.w / 2 - 3,
						f.h / 2 - 2,
						0,
						0,
						Math.PI * 2,
					);
					ctx.fill();
					ctx.strokeStyle = oc;
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.ellipse(
						f.x + f.w / 2,
						f.y + f.h / 2,
						f.w / 2 - 3,
						f.h / 2 - 2,
						0,
						0,
						Math.PI * 2,
					);
					ctx.stroke();
				}
				break;
			case "door":
				drawDoorFlat(ctx, f, oc, variants.door, night);
				break;
		}

		if (options.showLabels) {
			ctx.fillStyle = night ? "#ccc" : "#333";
			ctx.font = "bold 5px sans-serif";
			ctx.textAlign = "center";
			ctx.fillText(name, f.x + f.w / 2, f.y + f.h / 2 + 2);
		}
	}

	// Floor decor
	drawDecorFlat(ctx, layout.decor, seedPalette, night);

	applyTimeOverlay(ctx, timePalette, roomWidth, roomHeight);
	applyNightGlow(ctx, layout, timePalette, roomWidth, roomHeight);
}

// ---- Rug ----

function drawRug(
	ctx: Ctx,
	layout: RoomLayout,
	seedPal: SeedPalette,
	night: boolean,
): void {
	const rugColors: [string, string, string, string, string] = [
		"#aa6655",
		"#5566aa",
		"#55aa66",
		"#aa8844",
		"#8855aa",
	];
	const anchorX = layout.charPos.x;
	const anchorY = layout.charPos.y;
	const rugRng = mulberry32(Math.round(anchorX * 100));
	const rugColor = flatColor(
		rugColors[Math.floor(rugRng() * rugColors.length)] ?? "#aa6655",
		seedPal.hueShiftDeg,
		night,
	);
	const rugX = Math.max(10, Math.min(layout.roomWidth - 90, anchorX - 40));
	const rugY = Math.max(
		layout.floorTop + 8,
		Math.min(layout.roomHeight - 48, anchorY - 15),
	);
	ctx.fillStyle = rugColor;
	roundRect(ctx, rugX, rugY, 80, 40, 3);
	ctx.fill();
	ctx.fillStyle = lighten(rugColor, 0.2);
	roundRect(ctx, rugX + 6, rugY + 5, 68, 30, 2);
	ctx.fill();
	ctx.fillStyle = rugColor;
	roundRect(ctx, rugX + 14, rugY + 10, 52, 20, 1);
	ctx.fill();
}

// ---- Furniture details ----

function drawBedFlat(
	ctx: Ctx,
	f: Rect,
	fc: string,
	oc: string,
	v: BedVariant,
	night: boolean,
): void {
	ctx.fillStyle = night ? "#888898" : "#e8e8f0";
	for (let pi = 0; pi < v.pillowCount; pi++) {
		roundRect(ctx, f.x + 3 + pi * 13, f.y + 3, 12, 8, 2);
		ctx.fill();
		ctx.strokeStyle = oc;
		ctx.lineWidth = 1;
		roundRect(ctx, f.x + 3 + pi * 13, f.y + 3, 12, 8, 2);
		ctx.stroke();
	}
	ctx.fillStyle = lighten(fc, 0.15);
	roundRect(ctx, f.x + 2, f.y + 13, f.w - 4, f.h - 15, 2);
	ctx.fill();
}

function drawDeskFlat(
	ctx: Ctx,
	f: Rect,
	v: DeskVariant,
	seedPal: SeedPalette,
	night: boolean,
): void {
	const screenColor = hueShift(
		night ? "#3355aa" : "#5577cc",
		seedPal.hueShiftDeg,
	);
	if (v.monitor === "laptop") {
		ctx.fillStyle = "#444";
		roundRect(ctx, f.x + 7, f.y + 10, 22, 3, 1);
		ctx.fill();
		ctx.fillStyle = "#222";
		roundRect(ctx, f.x + 7, f.y + 2, 22, 9, 2);
		ctx.fill();
		ctx.fillStyle = screenColor;
		roundRect(ctx, f.x + 8, f.y + 3, 20, 7, 1);
		ctx.fill();
	} else if (v.monitor !== "none") {
		ctx.fillStyle = "#222";
		roundRect(ctx, f.x + 7, f.y + 2, 22, 14, 2);
		ctx.fill();
		ctx.fillStyle = screenColor;
		roundRect(ctx, f.x + 8, f.y + 3, 20, 12, 1);
		ctx.fill();
	}
}

function drawKitchenFlat(
	ctx: Ctx,
	f: Rect,
	oc: string,
	_v: KitchenVariant,
): void {
	ctx.strokeStyle = oc;
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.arc(f.x + 14, f.y + 12, 6, 0, Math.PI * 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(f.x + 32, f.y + 12, 5, 0, Math.PI * 2);
	ctx.stroke();
}

function drawDoorFlat(
	ctx: Ctx,
	f: Rect,
	oc: string,
	v: { hasWindow: boolean },
	night: boolean,
): void {
	// Knob
	ctx.fillStyle = "#e0a020";
	ctx.beginPath();
	ctx.arc(f.x + 4, f.y + f.h / 2, 3, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = "#a07010";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.arc(f.x + 4, f.y + f.h / 2, 3, 0, Math.PI * 2);
	ctx.stroke();
	if (v.hasWindow) {
		ctx.fillStyle = night ? "#224" : "#87ceeb";
		roundRect(ctx, f.x + 4, f.y + 6, f.w - 8, 10, 2);
		ctx.fill();
		ctx.strokeStyle = oc;
		ctx.lineWidth = 1;
		roundRect(ctx, f.x + 4, f.y + 6, f.w - 8, 10, 2);
		ctx.stroke();
	}
}

// ---- Wall extensions ----

function drawWallExtensionsFlat(
	ctx: Ctx,
	layout: RoomLayout,
	seedPal: SeedPalette,
	variants: ItemVariants,
	night: boolean,
): void {
	const { floorTop } = layout;

	// Kitchen cabinets
	const k = layout.furniture.kitchen;
	if (k && k.y < floorTop + 10 && variants.kitchen.hasCabinets) {
		const cabColor = nc(darken(seedPal.colors.kitchen ?? "#888", 0.08), night);
		const oc = outlineColor(cabColor);
		ctx.fillStyle = cabColor;
		roundRect(ctx, k.x + 2, k.y - 20, k.w * 0.4, 18, 2);
		ctx.fill();
		roundRect(ctx, k.x + k.w * 0.5, k.y - 20, k.w * 0.4, 18, 2);
		ctx.fill();
		ctx.strokeStyle = oc;
		ctx.lineWidth = 2;
		roundRect(ctx, k.x + 2, k.y - 20, k.w * 0.4, 18, 2);
		ctx.stroke();
		roundRect(ctx, k.x + k.w * 0.5, k.y - 20, k.w * 0.4, 18, 2);
		ctx.stroke();
		// Handles
		ctx.fillStyle = "#bbb";
		ctx.fillRect(k.x + k.w * 0.2 - 1, k.y - 7, 2, 3);
		ctx.fillRect(k.x + k.w * 0.7 - 1, k.y - 7, 2, 3);
	}

	// Desk shelf
	const d = layout.furniture.desk;
	if (d && d.y < floorTop + 10 && variants.desk.hasShelf) {
		const shC = nc(darken(seedPal.colors.desk ?? "#888", 0.05), night, 0.25);
		const oc = outlineColor(shC);
		ctx.fillStyle = shC;
		roundRect(ctx, d.x + 2, d.y - 12, d.w - 4, 3, 1);
		ctx.fill();
		ctx.strokeStyle = oc;
		ctx.lineWidth = 1.5;
		roundRect(ctx, d.x + 2, d.y - 12, d.w - 4, 3, 1);
		ctx.stroke();
		// Books
		ctx.fillStyle = hueShift("#8844aa", seedPal.hueShiftDeg);
		roundRect(ctx, d.x + 6, d.y - 16, 5, 4, 1);
		ctx.fill();
		ctx.strokeStyle = darken(hueShift("#8844aa", seedPal.hueShiftDeg), 0.3);
		ctx.lineWidth = 1;
		roundRect(ctx, d.x + 6, d.y - 16, 5, 4, 1);
		ctx.stroke();
		ctx.fillStyle = hueShift("#aa6644", seedPal.hueShiftDeg);
		roundRect(ctx, d.x + 14, d.y - 17, 4, 5, 1);
		ctx.fill();
		// Brackets
		ctx.fillStyle = oc;
		ctx.fillRect(d.x + 4, d.y - 9, 2, 8);
		ctx.fillRect(d.x + d.w - 6, d.y - 9, 2, 8);
	}

	// Bathroom mirror
	const b = layout.furniture.bathroom;
	if (b && b.y < floorTop + 10 && variants.bathroom.hasMirror) {
		const mirW = Math.min(16, b.w * 0.4);
		const mirX = b.x + b.w - mirW - 8;
		ctx.fillStyle = night ? "#8898a8" : "#c8d8e8";
		roundRect(ctx, mirX, b.y - 16, mirW, 14, 2);
		ctx.fill();
		ctx.strokeStyle = "#777";
		ctx.lineWidth = 1.5;
		roundRect(ctx, mirX, b.y - 16, mirW, 14, 2);
		ctx.stroke();
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.fillRect(mirX + 2, b.y - 14, 3, 10);
	}

	// Bed headboard
	const bed = layout.furniture.bed;
	if (bed && bed.y < floorTop + 10) {
		const hbC = nc(darken(seedPal.colors.bed ?? "#888", 0.2), night, 0.4);
		const oc = darken(hbC, 0.3);
		ctx.fillStyle = hbC;
		roundRect(ctx, bed.x + 1, bed.y - 10, bed.w - 2, 12, 2);
		ctx.fill();
		ctx.strokeStyle = oc;
		ctx.lineWidth = 2;
		roundRect(ctx, bed.x + 1, bed.y - 10, bed.w - 2, 12, 2);
		ctx.stroke();
	}
}

// ---- Wall decor ----

function drawWallDecorFlat(
	ctx: Ctx,
	wallDecor: WallDecorItem[],
	seedPal: SeedPalette,
	night: boolean,
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
				const c = flatColor("#cc5544", hue, night);
				const oc = outlineColor(c);
				ctx.fillStyle = c;
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.fill();
				ctx.strokeStyle = oc;
				ctx.lineWidth = 2;
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.stroke();
				ctx.fillStyle = lighten(c, 0.2);
				roundRect(ctx, -hw + 2, -hh + 2, d.w - 4, d.h * 0.3, 1);
				ctx.fill();
				break;
			}
			case "shelf": {
				const c = night ? "#4a3a2a" : "#8b7355";
				const oc = outlineColor(c);
				ctx.fillStyle = c;
				roundRect(ctx, -hw, -hh, d.w, d.h, 1);
				ctx.fill();
				ctx.strokeStyle = oc;
				ctx.lineWidth = 2;
				roundRect(ctx, -hw, -hh, d.w, d.h, 1);
				ctx.stroke();
				// Items
				ctx.fillStyle = hueShift("#44aa88", hue);
				roundRect(ctx, -hw + 2, -hh - 5, 5, 5, 1);
				ctx.fill();
				ctx.strokeStyle = darken(hueShift("#44aa88", hue), 0.35);
				ctx.lineWidth = 1;
				roundRect(ctx, -hw + 2, -hh - 5, 5, 5, 1);
				ctx.stroke();
				ctx.fillStyle = hueShift("#aa4488", hue);
				roundRect(ctx, -hw + 9, -hh - 7, 5, 7, 1);
				ctx.fill();
				// Brackets
				ctx.fillStyle = oc;
				ctx.fillRect(-hw + 3, 0, 2, 6);
				ctx.fillRect(hw - 5, 0, 2, 6);
				break;
			}
			case "clock": {
				ctx.fillStyle = night ? "#888898" : "#e8e8e8";
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "#555";
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.stroke();
				ctx.strokeStyle = "#333";
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(0, -hw * 0.55);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(hw * 0.35, 0);
				ctx.stroke();
				break;
			}
			case "mirror": {
				ctx.fillStyle = night ? "#8898a8" : "#b8c8d8";
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.fill();
				ctx.strokeStyle = "#777";
				ctx.lineWidth = 2;
				roundRect(ctx, -hw, -hh, d.w, d.h, 2);
				ctx.stroke();
				ctx.fillStyle = "rgba(255,255,255,0.2)";
				roundRect(ctx, -hw + 2, -hh + 2, d.w * 0.25, d.h - 4, 1);
				ctx.fill();
				break;
			}
			case "photo": {
				const fc = hueShift("#6b4423", hue);
				ctx.fillStyle = fc;
				roundRect(ctx, -hw, -hh, d.w, d.h, 1);
				ctx.fill();
				ctx.strokeStyle = outlineColor(fc);
				ctx.lineWidth = 2;
				roundRect(ctx, -hw, -hh, d.w, d.h, 1);
				ctx.stroke();
				ctx.fillStyle = "#ddd";
				ctx.fillRect(-hw + 3, -hh + 3, d.w - 6, d.h - 6);
				break;
			}
			case "coathook": {
				const barC = night ? "#4a3a2a" : "#8b7355";
				ctx.fillStyle = barC;
				roundRect(ctx, -hw, -hh, d.w, 3, 1);
				ctx.fill();
				ctx.strokeStyle = outlineColor(barC);
				ctx.lineWidth = 1.5;
				roundRect(ctx, -hw, -hh, d.w, 3, 1);
				ctx.stroke();
				ctx.fillStyle = "#888";
				for (let hx = -hw + 3; hx < hw - 2; hx += 6) {
					ctx.fillRect(hx, -hh + 3, 2, 4);
					ctx.fillRect(hx - 1, -hh + 6, 4, 2);
				}
				break;
			}
			case "calendar": {
				ctx.fillStyle = night ? "#aaaaaa" : "#eee";
				roundRect(ctx, -hw, -hh, d.w, d.h, 1);
				ctx.fill();
				ctx.fillStyle = hueShift("#cc3333", hue);
				roundRect(ctx, -hw, -hh, d.w, 4, 1);
				ctx.fill();
				ctx.strokeStyle = "#777";
				ctx.lineWidth = 1.5;
				roundRect(ctx, -hw, -hh, d.w, d.h, 1);
				ctx.stroke();
				break;
			}
			case "plant_hanging": {
				const potC = flatColor("#aa6644", hue, night);
				ctx.fillStyle = "#888";
				ctx.fillRect(-0.5, -hh, 1, 4);
				ctx.fillStyle = potC;
				roundRect(ctx, -4, -hh + 4, 8, 6, 2);
				ctx.fill();
				ctx.strokeStyle = outlineColor(potC);
				ctx.lineWidth = 1.5;
				roundRect(ctx, -4, -hh + 4, 8, 6, 2);
				ctx.stroke();
				const leafC = night ? "#2a6a2a" : hueShift("#44aa44", hue);
				ctx.fillStyle = leafC;
				ctx.beginPath();
				ctx.ellipse(-3, hh - 4, 4, 8, -0.2, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.ellipse(3, hh - 2, 3, 7, 0.2, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = darken(leafC, 0.3);
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.ellipse(-3, hh - 4, 4, 8, -0.2, 0, Math.PI * 2);
				ctx.stroke();
				ctx.beginPath();
				ctx.ellipse(3, hh - 2, 3, 7, 0.2, 0, Math.PI * 2);
				ctx.stroke();
				break;
			}
		}
		ctx.restore();
	}
}

// ---- Floor decor ----

function drawDecorFlat(
	ctx: Ctx,
	decor: FloorDecorItem[],
	seedPal: SeedPalette,
	night: boolean,
): void {
	const hue = seedPal.hueShiftDeg;

	/** Hue-shift + night darken for decor. */
	function fc(base: string): string {
		return flatColor(base, hue, night);
	}

	/** Stroke color from a flat-colored base. */
	function fs(base: string): string {
		return darken(fc(base), 0.4);
	}

	for (const d of decor) {
		ctx.save();
		ctx.translate(d.x, d.y);
		ctx.rotate(d.rot);
		const s = d.size;
		ctx.lineWidth = 1.5;

		switch (d.type) {
			case "book": {
				const c = fc("#7744aa");
				ctx.fillStyle = c;
				ctx.strokeStyle = fs("#7744aa");
				ctx.fillRect(-s / 2, -s / 4, s, s / 2);
				ctx.strokeRect(-s / 2, -s / 4, s, s / 2);
				// Spine
				ctx.fillStyle = darken(c, 0.2);
				ctx.fillRect(-s / 2, -s / 4, s * 0.14, s / 2);
				ctx.strokeRect(-s / 2, -s / 4, s * 0.14, s / 2);
				// Pages
				ctx.fillStyle = night ? "#888" : "#ece4d4";
				ctx.fillRect(-s / 2 + s * 0.14, -s / 4 + 1.5, s * 0.08, s / 2 - 3);
				break;
			}
			case "mug": {
				const c = night ? "#888" : "#e0d8d0";
				ctx.fillStyle = c;
				ctx.strokeStyle = darken(c, 0.4);
				roundRect(ctx, -s * 0.3, -s * 0.35, s * 0.6, s * 0.7, 2);
				ctx.fill();
				ctx.stroke();
				// Handle
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(s * 0.3, -s * 0.05, s * 0.18, -Math.PI * 0.5, Math.PI * 0.5);
				ctx.stroke();
				ctx.lineWidth = 1.5;
				// Liquid
				ctx.fillStyle = fc("#8b4513");
				roundRect(ctx, -s * 0.24, -s * 0.28, s * 0.48, s * 0.22, 1);
				ctx.fill();
				break;
			}
			case "plant": {
				const potC = fc("#8b5533");
				const leafC = fc("#44aa44");
				// Pot
				ctx.fillStyle = potC;
				ctx.strokeStyle = darken(potC, 0.4);
				roundRect(ctx, -s * 0.3, 0, s * 0.6, s * 0.4, 2);
				ctx.fill();
				ctx.stroke();
				// Rim
				ctx.fillRect(-s * 0.34, -0.5, s * 0.68, s * 0.08);
				ctx.strokeRect(-s * 0.34, -0.5, s * 0.68, s * 0.08);
				// Leaves
				ctx.fillStyle = leafC;
				ctx.strokeStyle = darken(leafC, 0.4);
				ctx.beginPath();
				ctx.arc(0, -s * 0.15, s * 0.32, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(-s * 0.2, -s * 0.02, s * 0.18, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.beginPath();
				ctx.arc(s * 0.2, -s * 0.02, s * 0.18, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				break;
			}
			case "laundry": {
				const c1 = fc("#7788bb");
				const c2 = fc("#aa6677");
				ctx.fillStyle = c1;
				ctx.strokeStyle = darken(c1, 0.4);
				roundRect(ctx, -s * 0.45, -s * 0.05, s * 0.9, s * 0.45, 3);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = c2;
				ctx.strokeStyle = darken(c2, 0.4);
				roundRect(ctx, -s * 0.35, -s * 0.25, s * 0.6, s * 0.35, 3);
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = c1;
				ctx.strokeStyle = darken(c1, 0.4);
				roundRect(ctx, -s * 0.42, 0, s * 0.22, s * 0.28, 2);
				ctx.fill();
				ctx.stroke();
				break;
			}
			case "shoe": {
				const c = fc("#444");
				// Sole
				ctx.fillStyle = darken(c, 0.3);
				ctx.strokeStyle = darken(c, 0.5);
				roundRect(ctx, -s * 0.45, s * 0.06, s * 0.9, s * 0.14, 1);
				ctx.fill();
				ctx.stroke();
				// Upper + toe
				ctx.fillStyle = c;
				ctx.strokeStyle = darken(fc("#444"), 0.4);
				ctx.beginPath();
				ctx.moveTo(-s * 0.4, s * 0.1);
				ctx.lineTo(-s * 0.4, -s * 0.08);
				ctx.lineTo(-s * 0.1, -s * 0.14);
				ctx.quadraticCurveTo(s * 0.3, -s * 0.16, s * 0.42, 0);
				ctx.lineTo(s * 0.42, s * 0.1);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
				// Opening
				ctx.fillStyle = darken(c, 0.35);
				ctx.fillRect(-s * 0.38, -s * 0.08, s * 0.26, s * 0.08);
				break;
			}
			case "paper": {
				const c = night ? "#777" : "#eee";
				// Bottom sheet
				ctx.fillStyle = darken(c, 0.08);
				ctx.strokeStyle = darken(c, 0.3);
				ctx.fillRect(-s * 0.32, -s * 0.22, s * 0.6, s * 0.48);
				ctx.strokeRect(-s * 0.32, -s * 0.22, s * 0.6, s * 0.48);
				// Top sheet
				ctx.fillStyle = c;
				ctx.fillRect(-s * 0.38, -s * 0.28, s * 0.7, s * 0.52);
				ctx.strokeRect(-s * 0.38, -s * 0.28, s * 0.7, s * 0.52);
				// Text lines
				ctx.strokeStyle = darken(c, 0.25);
				ctx.lineWidth = 1;
				for (let i = 0; i < 3; i++) {
					const lw = s * (0.4 - (i === 2 ? 0.12 : 0));
					ctx.beginPath();
					ctx.moveTo(-s * 0.28, -s * 0.18 + i * s * 0.12);
					ctx.lineTo(-s * 0.28 + lw, -s * 0.18 + i * s * 0.12);
					ctx.stroke();
				}
				ctx.lineWidth = 1.5;
				// Corner fold
				ctx.fillStyle = darken(c, 0.1);
				ctx.beginPath();
				ctx.moveTo(s * 0.32, -s * 0.28);
				ctx.lineTo(s * 0.18, -s * 0.28);
				ctx.lineTo(s * 0.32, -s * 0.14);
				ctx.closePath();
				ctx.fill();
				ctx.stroke();
				break;
			}
			case "bowl": {
				const c = fc("#ddc89a");
				ctx.fillStyle = c;
				ctx.strokeStyle = darken(c, 0.4);
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.42, s * 0.28, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				// Inner
				ctx.fillStyle = darken(c, 0.18);
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.28, s * 0.18, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = darken(c, 0.3);
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.28, s * 0.18, 0, 0, Math.PI * 2);
				ctx.stroke();
				break;
			}
			case "cushion": {
				const c = fc("#cc7755");
				ctx.fillStyle = c;
				ctx.strokeStyle = darken(c, 0.4);
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.38, s * 0.32, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				// Seam cross
				ctx.strokeStyle = darken(c, 0.25);
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(-s * 0.28, 0);
				ctx.lineTo(s * 0.28, 0);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, -s * 0.24);
				ctx.lineTo(0, s * 0.24);
				ctx.stroke();
				ctx.lineWidth = 1.5;
				// Button
				ctx.fillStyle = darken(c, 0.3);
				ctx.strokeStyle = darken(c, 0.5);
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				break;
			}
			case "bottle": {
				const c = fc("#55aa88");
				ctx.fillStyle = c;
				ctx.strokeStyle = darken(c, 0.4);
				// Body
				roundRect(ctx, -s * 0.16, -s * 0.15, s * 0.32, s * 0.5, 2);
				ctx.fill();
				ctx.stroke();
				// Neck
				roundRect(ctx, -s * 0.09, -s * 0.32, s * 0.18, s * 0.2, 1);
				ctx.fill();
				ctx.stroke();
				// Cap
				ctx.fillStyle = darken(c, 0.3);
				roundRect(ctx, -s * 0.1, -s * 0.38, s * 0.2, s * 0.08, 1);
				ctx.fill();
				ctx.stroke();
				// Label
				ctx.fillStyle = night ? "#888" : "#eee";
				ctx.strokeStyle = darken(c, 0.2);
				ctx.fillRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.14);
				ctx.strokeRect(-s * 0.13, -s * 0.02, s * 0.26, s * 0.14);
				break;
			}
			default: {
				const c = fc("#888");
				ctx.fillStyle = c;
				ctx.strokeStyle = darken(c, 0.4);
				ctx.fillRect(-s / 2, -s / 3, s, s * 0.6);
				ctx.strokeRect(-s / 2, -s / 3, s, s * 0.6);
			}
		}
		ctx.restore();
	}
}

// ---- Character ----

function drawFlatChar(
	ctx: Ctx,
	x: number,
	y: number,
	cv: CharacterVariant,
	timePalette: TimePalette,
): void {
	const night = isNightPalette(timePalette);
	const co = night ? "#222" : "#2a2020";
	const hw = Math.floor(cv.buildW / 2) + 1;
	const bh = cv.height;
	const topC = nc(cv.topColor, night);
	const pantsC = nc(cv.pantsColor, night, 0.2);
	const skin = nc(cv.skin, night, 0.15);

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	ctx.beginPath();
	ctx.ellipse(x, y + 3, hw + 2, 3, 0, 0, Math.PI * 2);
	ctx.fill();

	// Body top
	ctx.fillStyle = topC;
	roundRect(ctx, x - hw, y - bh, hw * 2, Math.floor(bh * 0.65), 3);
	ctx.fill();
	ctx.strokeStyle = co;
	ctx.lineWidth = 2;
	roundRect(ctx, x - hw, y - bh, hw * 2, Math.floor(bh * 0.65), 3);
	ctx.stroke();

	// Pants
	ctx.fillStyle = pantsC;
	roundRect(
		ctx,
		x - hw,
		y - bh + Math.floor(bh * 0.65),
		hw * 2,
		Math.ceil(bh * 0.35),
		2,
	);
	ctx.fill();
	ctx.strokeStyle = co;
	ctx.lineWidth = 1.5;
	roundRect(
		ctx,
		x - hw,
		y - bh + Math.floor(bh * 0.65),
		hw * 2,
		Math.ceil(bh * 0.35),
		2,
	);
	ctx.stroke();

	// Shoes
	ctx.fillStyle = nc(cv.shoeColor, night, 0.2);
	roundRect(ctx, x - hw, y, hw - 1, 3, 1);
	ctx.fill();
	roundRect(ctx, x + 1, y, hw - 1, 3, 1);
	ctx.fill();

	// Head
	ctx.fillStyle = skin;
	ctx.beginPath();
	ctx.arc(x, y - bh - 4, 6, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = co;
	ctx.lineWidth = 1.5;
	ctx.stroke();

	// Eyes
	ctx.fillStyle = "#222";
	ctx.fillRect(x - 3, y - bh - 5, 2, 2);
	ctx.fillRect(x + 1, y - bh - 5, 2, 2);

	// Hair
	const hairC = nc(cv.hairColor, night, 0.2);
	ctx.fillStyle = hairC;
	switch (cv.hairStyle) {
		case "curly":
			ctx.beginPath();
			ctx.arc(x, y - bh - 5, 7.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = co;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.fillStyle = skin;
			ctx.beginPath();
			ctx.arc(x, y - bh - 3, 5, 0, Math.PI);
			ctx.fill();
			break;
		case "bun":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 6, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x, y - bh - 12, 3.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = co;
			ctx.lineWidth = 1.5;
			ctx.stroke();
			break;
		case "long":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 6.5, Math.PI, Math.PI * 2);
			ctx.fill();
			roundRect(ctx, x - 7, y - bh - 5, 3, 12, 1);
			ctx.fill();
			roundRect(ctx, x + 4, y - bh - 5, 3, 12, 1);
			ctx.fill();
			break;
		case "ponytail":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 6, Math.PI, Math.PI * 2);
			ctx.fill();
			roundRect(ctx, x + 5, y - bh - 3, 3, 2, 1);
			ctx.fill();
			roundRect(ctx, x + 6, y - bh - 1, 2, 6, 1);
			ctx.fill();
			break;
		case "shaved":
			break;
		default:
			// short, buzz
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 6, Math.PI, Math.PI * 2);
			ctx.fill();
			break;
	}
}

// ---- Dog ----

function drawFlatDog(
	ctx: Ctx,
	x: number,
	y: number,
	dv: DogVariant,
	timePalette: TimePalette,
	mood: DogMoodState,
	energy: number,
): void {
	const night = isNightPalette(timePalette);
	const bw = dv.bodyW;
	const bh = dv.bodyH;

	let bodyC = nc(dv.bodyColor, night, 0.2);
	if (mood === "disappointed") {
		bodyC = darken(bodyC, 0.15);
	} else if (mood === "normal" && energy < 0.3) {
		bodyC = darken(bodyC, 0.08);
	}
	const outC = darken(bodyC, 0.35);
	const earC = nc(dv.earColor, night, 0.2);

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.08)";
	ctx.beginPath();
	ctx.ellipse(x + bw / 2, y + bh + 2, bw / 2 + 2, 3, 0, 0, Math.PI * 2);
	ctx.fill();

	// Body
	ctx.fillStyle = bodyC;
	roundRect(ctx, x, y, bw, bh, 3);
	ctx.fill();
	ctx.strokeStyle = outC;
	ctx.lineWidth = 1.5;
	roundRect(ctx, x, y, bw, bh, 3);
	ctx.stroke();

	// Spots
	if (dv.hasSpots) {
		ctx.fillStyle = dv.spotColor;
		ctx.beginPath();
		ctx.arc(x + bw * 0.35, y + bh * 0.4, 2.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + bw * 0.65, y + bh * 0.6, 2, 0, Math.PI * 2);
		ctx.fill();
	}

	// Ears -- mood-reactive (flat uses triangles for pointed, rounded rects for floppy)
	drawFlatDogEars(ctx, x, y, bw, dv, earC, outC, mood, energy);

	// Eyes -- mood-reactive
	ctx.fillStyle = "#222";
	const eyeY = y + Math.floor(bh * 0.3);
	const eyeXL = x + Math.floor(bw * 0.2);
	const eyeXR = x + Math.floor(bw * 0.65);
	if (mood === "disappointed") {
		ctx.fillRect(eyeXL, eyeY + 1, 2.5, 1);
		ctx.fillRect(eyeXR, eyeY + 1, 2.5, 1);
	} else if (mood === "normal" && energy < 0.25) {
		ctx.fillRect(eyeXL, eyeY + 1, 2, 1);
		ctx.fillRect(eyeXR, eyeY + 1, 2, 1);
	} else {
		ctx.fillRect(eyeXL, eyeY, 2, 2);
		ctx.fillRect(eyeXR, eyeY, 2, 2);
	}

	// Nose
	ctx.fillStyle = dv.noseColor;
	ctx.fillRect(x + Math.floor(bw * 0.43), y + Math.floor(bh * 0.55), 2, 2);

	// Tail -- mood-reactive
	drawFlatDogTail(ctx, x, y, bw, bh, dv, bodyC, outC, mood, energy);
}

// ---- Dog ears ----

function drawFlatDogEars(
	ctx: Ctx,
	x: number,
	y: number,
	bw: number,
	dv: DogVariant,
	earC: string,
	outC: string,
	mood: DogMoodState,
	energy: number,
): void {
	ctx.fillStyle = earC;

	if (mood === "disappointed") {
		// Droopy
		if (dv.earStyle === "pointed") {
			drawPointedEar(ctx, x + 2, y + 2, x + 4, y + 3, x + 6, y + 2, outC);
			drawPointedEar(
				ctx,
				x + bw - 6,
				y + 2,
				x + bw - 4,
				y + 3,
				x + bw - 2,
				y + 2,
				outC,
			);
		} else {
			drawFloppyEar(ctx, x - 1, y + 2, 3, 7, outC);
			drawFloppyEar(ctx, x + bw - 2, y + 2, 3, 7, outC);
		}
	} else if (
		mood === "excited" ||
		mood === "happyForYou" ||
		mood === "hopeful" ||
		mood === "interested"
	) {
		// Perky
		const tipH = mood === "excited" ? -6 : -5;
		if (dv.earStyle === "pointed") {
			drawPointedEar(ctx, x + 2, y, x + 4, y + tipH, x + 6, y, outC);
			drawPointedEar(
				ctx,
				x + bw - 6,
				y,
				x + bw - 4,
				y + tipH,
				x + bw - 2,
				y,
				outC,
			);
		} else {
			drawFloppyEar(ctx, x - 1, y - 3, 3, 6, outC);
			drawFloppyEar(ctx, x + bw - 2, y - 3, 3, 6, outC);
		}
	} else if (mood === "unimpressed" || mood === "sympathetic") {
		// Flat
		if (dv.earStyle === "pointed") {
			drawPointedEar(ctx, x + 2, y, x + 4, y - 3, x + 6, y, outC);
			drawPointedEar(
				ctx,
				x + bw - 6,
				y,
				x + bw - 4,
				y - 3,
				x + bw - 2,
				y,
				outC,
			);
		} else {
			drawFloppyEar(ctx, x - 1, y, 3, 5, outC);
			drawFloppyEar(ctx, x + bw - 2, y, 3, 5, outC);
		}
	} else if (mood === "restless") {
		// Alternating
		const offset = Math.sin(performance.now() / 150) * 1.5;
		if (dv.earStyle === "pointed") {
			drawPointedEar(ctx, x + 2, y, x + 4, y - 4 + offset, x + 6, y, outC);
			drawPointedEar(
				ctx,
				x + bw - 6,
				y,
				x + bw - 4,
				y - 4 - offset,
				x + bw - 2,
				y,
				outC,
			);
		} else {
			drawFloppyEar(ctx, x - 1, y - 2 + offset, 3, 5, outC);
			drawFloppyEar(ctx, x + bw - 2, y - 2 - offset, 3, 5, outC);
		}
	} else {
		// Normal -- energy-based
		const earY = energy > 0.6 ? y - 1 : energy < 0.3 ? y + 1 : y;
		if (dv.earStyle === "pointed") {
			drawPointedEar(ctx, x + 2, earY, x + 4, earY - 5, x + 6, earY, outC);
			drawPointedEar(
				ctx,
				x + bw - 6,
				earY,
				x + bw - 4,
				earY - 5,
				x + bw - 2,
				earY,
				outC,
			);
		} else {
			drawFloppyEar(ctx, x - 1, earY, 3, 6, outC);
			drawFloppyEar(ctx, x + bw - 2, earY, 3, 6, outC);
		}
	}
}

/** Draw a pointed ear triangle with outline. */
function drawPointedEar(
	ctx: Ctx,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number,
	outC: string,
): void {
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.lineTo(x3, y3);
	ctx.fill();
	ctx.strokeStyle = outC;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.lineTo(x3, y3);
	ctx.stroke();
}

/** Draw a floppy ear rect with outline. */
function drawFloppyEar(
	ctx: Ctx,
	ex: number,
	ey: number,
	ew: number,
	eh: number,
	outC: string,
): void {
	roundRect(ctx, ex, ey, ew, eh, 1);
	ctx.fill();
	ctx.strokeStyle = outC;
	ctx.lineWidth = 1;
	roundRect(ctx, ex, ey, ew, eh, 1);
	ctx.stroke();
}

// ---- Dog tail ----

function drawFlatDogTail(
	ctx: Ctx,
	x: number,
	y: number,
	bw: number,
	bh: number,
	dv: DogVariant,
	bodyC: string,
	outC: string,
	mood: DogMoodState,
	energy: number,
): void {
	ctx.strokeStyle = bodyC;
	ctx.lineWidth = 2.5;
	const tailX = x + bw;
	const tailBaseY = y + Math.floor(bh * 0.4);
	ctx.beginPath();
	ctx.moveTo(tailX, tailBaseY);

	if (mood === "disappointed") {
		ctx.quadraticCurveTo(
			tailX + 4,
			tailBaseY + bh,
			tailX + 3,
			tailBaseY + bh + 3,
		);
	} else if (mood === "excited") {
		const wag = Math.sin(performance.now() / 80) * 4;
		ctx.quadraticCurveTo(
			tailX + 5,
			tailBaseY - 3,
			tailX + 4,
			tailBaseY - 8 + wag,
		);
	} else if (mood === "happyForYou") {
		const wag = Math.sin(performance.now() / 150) * 3;
		ctx.quadraticCurveTo(
			tailX + 5,
			tailBaseY - 2,
			tailX + 4,
			tailBaseY - 6 + wag,
		);
	} else if (mood === "hopeful" || mood === "interested") {
		ctx.quadraticCurveTo(tailX + 5, tailBaseY - 3, tailX + 4, tailBaseY - 6);
	} else if (mood === "sympathetic") {
		ctx.quadraticCurveTo(tailX + 4, tailBaseY + 2, tailX + 3, tailBaseY + 2);
	} else if (mood === "unimpressed") {
		ctx.quadraticCurveTo(tailX + 4, tailBaseY + 3, tailX + 3, tailBaseY + 4);
	} else if (mood === "restless") {
		const twitch = Math.sin(performance.now() / 120) * 3;
		ctx.quadraticCurveTo(
			tailX + 5,
			tailBaseY - 2,
			tailX + 4,
			tailBaseY - 5 + twitch,
		);
	} else {
		// Normal -- seed tail style + energy
		if (dv.tailStyle === "up") {
			const tipY = energy > 0.5 ? tailBaseY - 6 : tailBaseY - 3;
			ctx.quadraticCurveTo(tailX + 5, tailBaseY - 3, tailX + 4, tipY);
		} else if (dv.tailStyle === "curl") {
			const curveY = energy > 0.5 ? tailBaseY - 7 : tailBaseY - 4;
			ctx.quadraticCurveTo(tailX + 6, tailBaseY - 2, tailX + 3, curveY);
		} else {
			const tipY = energy > 0.5 ? tailBaseY + 2 : tailBaseY + 5;
			ctx.quadraticCurveTo(tailX + 4, tailBaseY + bh, tailX + 3, tipY);
		}
	}
	ctx.stroke();

	// Outline the tail too
	ctx.strokeStyle = outC;
	ctx.lineWidth = 0.5;
	ctx.stroke();
}
