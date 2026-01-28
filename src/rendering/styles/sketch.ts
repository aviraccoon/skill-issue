/**
 * Hand-drawn sketch style renderer (Style 3).
 * Line art on paper texture with wobble effects.
 * Everything is drawn with strokes, no fills -- like a quick notebook sketch.
 */

import type { AnimationState } from "../../systems/animation";
import { mulberry32 } from "../../utils/random";
import { drawFurnitureHighlight } from "../color";
import { isNightPalette } from "../palettes";
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
	TimePalette,
	WallDecorItem,
} from "../types";

type Ctx = CanvasRenderingContext2D;
type Rng = () => number;

/** Creates a hand-drawn sketch renderer. */
export function createSketchRenderer(): RoomRenderer {
	return {
		drawRoom(ctx: Ctx, layout: RoomLayout, options: RoomDrawOptions): void {
			drawSketchRoom(ctx, layout, options);
		},
		drawCharacter(
			ctx: Ctx,
			x: number,
			y: number,
			variants: CharacterVariant,
			timePalette: TimePalette,
			_animState: AnimationState | null,
		): void {
			drawSketchChar(ctx, x, y, variants, timePalette);
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
			drawSketchDog(ctx, x, y, variants, timePalette, mood, energy);
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

// ---- Ink colors ----

function getInkColors(palette: TimePalette): { ink: string; lightInk: string } {
	const night = isNightPalette(palette);
	return {
		ink: night ? "#8888aa" : "#333",
		lightInk: night ? "#555577" : "#888",
	};
}

// ---- Wobble helpers ----

/** Draws a wobbly rectangle outline. */
function wobbleRect(
	ctx: Ctx,
	x: number,
	y: number,
	w: number,
	h: number,
	ink: string,
	rng: Rng,
): void {
	ctx.strokeStyle = ink;
	ctx.lineWidth = 1.2;
	ctx.beginPath();
	const p0: [number, number] = [x + rng() * 2, y + rng() * 2];
	const p1: [number, number] = [x + w + rng() * 2 - 1, y + rng() * 2];
	const p2: [number, number] = [x + w + rng() * 2 - 1, y + h + rng() * 2 - 1];
	const p3: [number, number] = [x + rng() * 2, y + h + rng() * 2 - 1];
	ctx.moveTo(p0[0], p0[1]);
	ctx.lineTo(p1[0], p1[1]);
	ctx.lineTo(p2[0], p2[1]);
	ctx.lineTo(p3[0], p3[1]);
	ctx.closePath();
	ctx.stroke();
}

// ---- Main room draw ----

function drawSketchRoom(
	ctx: Ctx,
	layout: RoomLayout,
	options: RoomDrawOptions,
): void {
	const { timePalette, variants } = options;
	const { roomWidth, roomHeight, wallY, floorTop } = layout;
	const { ink, lightInk } = getInkColors(timePalette);
	const night = isNightPalette(timePalette);
	const rng = mulberry32(42);

	// Paper background
	ctx.fillStyle = night ? "#2a283a" : "#f5f0e0";
	ctx.fillRect(0, 0, roomWidth, roomHeight);

	// Paper texture
	ctx.fillStyle = night ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
	for (let i = 0; i < 200; i++) {
		ctx.fillRect(rng() * roomWidth, rng() * roomHeight, 1, 1);
	}

	// Floor line
	ctx.strokeStyle = ink;
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let x = 0; x <= roomWidth; x += 3) {
		const wy = floorTop + (rng() - 0.5) * 1.5;
		if (x === 0) ctx.moveTo(x, wy);
		else ctx.lineTo(x, wy);
	}
	ctx.stroke();

	// Cross-hatch floor
	ctx.strokeStyle = lightInk;
	ctx.lineWidth = 0.3;
	for (let x = 0; x < roomWidth; x += 6) {
		for (let y = Math.floor(floorTop + 3); y < roomHeight; y += 6) {
			if (rng() < 0.5) {
				ctx.beginPath();
				ctx.moveTo(x + rng() * 2, y + rng() * 2);
				ctx.lineTo(x + 4 + rng() * 2, y + 4 + rng() * 2);
				ctx.stroke();
			}
		}
	}

	// Wall decor (skip in top-down mode)
	if (wallY > 0) {
		drawWallDecorSketch(ctx, layout.wallDecor, ink, lightInk, rng);
		drawWallExtensionsSketch(ctx, layout, ink, lightInk, variants, rng);
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

		switch (name) {
			case "bed":
				drawBedSketch(ctx, f, variants.bed, ink, lightInk, rng);
				break;
			case "desk":
				drawDeskSketch(ctx, f, variants.desk, ink, lightInk, rng);
				break;
			case "couch":
				drawCouchSketch(ctx, f, variants.couch, ink, lightInk, rng);
				break;
			case "kitchen":
				drawKitchenSketch(ctx, f, variants.kitchen, ink, lightInk, rng);
				break;
			case "bathroom":
				drawBathroomSketch(ctx, f, variants.bathroom, ink, lightInk, rng);
				break;
			case "door":
				drawDoorSketch(ctx, f, variants.door, ink, lightInk, rng);
				break;
		}

		if (options.showLabels) {
			ctx.fillStyle = ink;
			ctx.font = "italic 5px serif";
			ctx.textAlign = "center";
			ctx.fillText(name, f.x + f.w / 2, f.y + f.h / 2 + 2);
		}
	}

	// Floor decor
	drawDecorSketch(ctx, layout.decor, lightInk, rng);

	// Time overlay (stronger for sketch)
	const [tr, tg, tb, ta] = timePalette.tint;
	ctx.fillStyle = `rgba(${tr},${tg},${tb},${ta * 1.5})`;
	ctx.fillRect(0, 0, roomWidth, roomHeight);
}

// ---- Furniture ----

function drawBedSketch(
	ctx: Ctx,
	f: Rect,
	v: BedVariant,
	ink: string,
	lightInk: string,
	rng: Rng,
): void {
	wobbleRect(ctx, f.x, f.y, f.w, f.h, ink, rng);
	ctx.strokeStyle = lightInk;
	ctx.lineWidth = 0.8;
	// Pillow curves
	for (let pi = 0; pi < v.pillowCount; pi++) {
		ctx.beginPath();
		const px = f.x + 4 + pi * 14;
		ctx.moveTo(px, f.y + 4);
		ctx.quadraticCurveTo(px + 5, f.y + 2 + rng() * 3, px + 10, f.y + 5);
		ctx.stroke();
	}
	// Blanket lines
	for (let i = 0; i < 3; i++) {
		ctx.beginPath();
		ctx.moveTo(f.x + 3, f.y + 14 + i * 4);
		ctx.lineTo(f.x + f.w - 3 + rng() * 2, f.y + 14 + i * 4 + rng() * 2);
		ctx.stroke();
	}
	if (v.messy) {
		ctx.beginPath();
		ctx.moveTo(f.x + f.w - 5, f.y + f.h - 8);
		ctx.quadraticCurveTo(
			f.x + f.w + 3,
			f.y + f.h - 4,
			f.x + f.w - 2,
			f.y + f.h + 2,
		);
		ctx.stroke();
	}
}

function drawDeskSketch(
	ctx: Ctx,
	f: Rect,
	v: DeskVariant,
	ink: string,
	_lightInk: string,
	rng: Rng,
): void {
	wobbleRect(ctx, f.x, f.y, f.w, f.h, ink, rng);
	ctx.strokeStyle = ink;
	ctx.lineWidth = 0.8;
	if (v.monitor !== "none") {
		wobbleRect(ctx, f.x + 8, f.y + 2, 20, 13, ink, rng);
	}
	if (v.hasLamp) {
		ctx.beginPath();
		ctx.moveTo(f.x + f.w - 7, f.y + 10);
		ctx.lineTo(f.x + f.w - 7, f.y + 3);
		ctx.quadraticCurveTo(f.x + f.w - 10, f.y + 1, f.x + f.w - 4, f.y + 1);
		ctx.stroke();
	}
}

function drawCouchSketch(
	ctx: Ctx,
	f: Rect,
	v: CouchVariant,
	ink: string,
	_lightInk: string,
	rng: Rng,
): void {
	if (v.style === "beanbag") {
		ctx.strokeStyle = ink;
		ctx.lineWidth = 1.2;
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
		return;
	}
	wobbleRect(ctx, f.x, f.y, f.w, f.h, ink, rng);
}

function drawKitchenSketch(
	ctx: Ctx,
	f: Rect,
	v: KitchenVariant,
	ink: string,
	_lightInk: string,
	rng: Rng,
): void {
	wobbleRect(ctx, f.x, f.y, f.w, f.h, ink, rng);
	ctx.strokeStyle = ink;
	ctx.lineWidth = 0.8;
	// Burners
	ctx.beginPath();
	ctx.arc(f.x + 12, f.y + 12, 5 + rng(), 0, Math.PI * 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(f.x + 28, f.y + 12, 4 + rng(), 0, Math.PI * 2);
	ctx.stroke();
	if (v.hasMug) {
		ctx.beginPath();
		ctx.arc(f.x + f.w - 7, f.y + 7, 3, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(f.x + f.w - 5, f.y + 4);
		ctx.quadraticCurveTo(f.x + f.w - 3, f.y + 2, f.x + f.w - 5, f.y);
		ctx.stroke();
	}
}

function drawBathroomSketch(
	ctx: Ctx,
	f: Rect,
	_v: BathroomVariant,
	ink: string,
	_lightInk: string,
	_rng: Rng,
): void {
	ctx.strokeStyle = ink;
	ctx.lineWidth = 1.2;
	// Outer rect
	ctx.strokeRect(f.x + 0.5, f.y + 0.5, f.w - 1, f.h - 1);
	// Tub/shower shape
	ctx.lineWidth = 0.8;
	ctx.beginPath();
	ctx.ellipse(
		f.x + f.w * 0.3,
		f.y + f.h / 2,
		f.w * 0.25,
		f.h * 0.35,
		0,
		0,
		Math.PI * 2,
	);
	ctx.stroke();
	// Toilet sketch
	ctx.beginPath();
	ctx.arc(f.x + f.w - 8, f.y + f.h - 6, 4, 0, Math.PI * 2);
	ctx.stroke();
}

function drawDoorSketch(
	ctx: Ctx,
	f: Rect,
	v: DoorVariant,
	ink: string,
	_lightInk: string,
	rng: Rng,
): void {
	wobbleRect(ctx, f.x, f.y, f.w, f.h, ink, rng);
	ctx.strokeStyle = ink;
	ctx.lineWidth = 0.8;
	// Handle
	ctx.beginPath();
	ctx.arc(f.x + 4, f.y + f.h / 2, 2, 0, Math.PI * 2);
	ctx.stroke();
	if (v.hasWindow) {
		wobbleRect(ctx, f.x + 5, f.y + 6, f.w - 10, 10, ink, rng);
	}
}

// ---- Wall extensions ----

function drawWallExtensionsSketch(
	ctx: Ctx,
	layout: RoomLayout,
	ink: string,
	lightInk: string,
	variants: ItemVariants,
	rng: Rng,
): void {
	const { floorTop } = layout;

	// Kitchen cabinets
	const k = layout.furniture.kitchen;
	if (k && k.y < floorTop + 10 && variants.kitchen.hasCabinets) {
		ctx.strokeStyle = ink;
		ctx.lineWidth = 1;
		const cabY = k.y - 20;
		ctx.beginPath();
		ctx.moveTo(k.x + 2 + rng(), cabY + rng());
		ctx.lineTo(k.x + k.w * 0.4 + 2 + rng(), cabY + rng());
		ctx.lineTo(k.x + k.w * 0.4 + 2 + rng(), cabY + 18 + rng());
		ctx.lineTo(k.x + 2 + rng(), cabY + 18 + rng());
		ctx.closePath();
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(k.x + k.w * 0.5 + rng(), cabY + rng());
		ctx.lineTo(k.x + k.w * 0.9 + rng(), cabY + rng());
		ctx.lineTo(k.x + k.w * 0.9 + rng(), cabY + 18 + rng());
		ctx.lineTo(k.x + k.w * 0.5 + rng(), cabY + 18 + rng());
		ctx.closePath();
		ctx.stroke();
		// Handles
		ctx.strokeStyle = lightInk;
		ctx.lineWidth = 0.6;
		ctx.beginPath();
		ctx.moveTo(k.x + k.w * 0.2, cabY + 13);
		ctx.lineTo(k.x + k.w * 0.2, cabY + 16);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(k.x + k.w * 0.7, cabY + 13);
		ctx.lineTo(k.x + k.w * 0.7, cabY + 16);
		ctx.stroke();
	}

	// Desk shelf
	const d = layout.furniture.desk;
	if (d && d.y < floorTop + 10 && variants.desk.hasShelf) {
		ctx.strokeStyle = ink;
		ctx.lineWidth = 1;
		const sy = d.y - 12;
		ctx.beginPath();
		ctx.moveTo(d.x + 2 + rng(), sy + rng());
		ctx.lineTo(d.x + d.w - 4 + rng(), sy + rng());
		ctx.stroke();
		// Brackets
		ctx.strokeStyle = lightInk;
		ctx.lineWidth = 0.6;
		ctx.beginPath();
		ctx.moveTo(d.x + 4, sy);
		ctx.lineTo(d.x + 4, sy + 8);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(d.x + d.w - 6, sy);
		ctx.lineTo(d.x + d.w - 6, sy + 8);
		ctx.stroke();
		// Books on shelf
		ctx.strokeStyle = ink;
		ctx.lineWidth = 0.8;
		ctx.beginPath();
		ctx.moveTo(d.x + 6, sy - 5);
		ctx.lineTo(d.x + 11, sy - 5);
		ctx.lineTo(d.x + 11, sy);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(d.x + 13, sy - 6);
		ctx.lineTo(d.x + 17, sy - 6);
		ctx.lineTo(d.x + 17, sy);
		ctx.stroke();
	}

	// Bathroom mirror
	const b = layout.furniture.bathroom;
	if (b && b.y < floorTop + 10 && variants.bathroom.hasMirror) {
		ctx.strokeStyle = ink;
		ctx.lineWidth = 1;
		const mirW = Math.min(16, b.w * 0.4);
		const mirX = b.x + b.w - mirW - 8;
		ctx.beginPath();
		ctx.ellipse(mirX + mirW / 2, b.y - 9, mirW / 2, 7, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.strokeStyle = lightInk;
		ctx.lineWidth = 0.4;
		ctx.beginPath();
		ctx.moveTo(mirX + 3, b.y - 14);
		ctx.lineTo(mirX + 3, b.y - 4);
		ctx.stroke();
	}

	// Bed headboard
	const bed = layout.furniture.bed;
	if (bed && bed.y < floorTop + 10) {
		ctx.strokeStyle = ink;
		ctx.lineWidth = 1;
		const hbY = bed.y - 10;
		ctx.beginPath();
		ctx.moveTo(bed.x + 1 + rng(), hbY + rng());
		ctx.lineTo(bed.x + bed.w - 2 + rng(), hbY + rng());
		ctx.lineTo(bed.x + bed.w - 2 + rng(), hbY + 12 + rng());
		ctx.lineTo(bed.x + 1 + rng(), hbY + 12 + rng());
		ctx.closePath();
		ctx.stroke();
		// Vertical slats
		ctx.strokeStyle = lightInk;
		ctx.lineWidth = 0.6;
		for (let sx = bed.x + 6; sx < bed.x + bed.w - 5; sx += 8) {
			ctx.beginPath();
			ctx.moveTo(sx + rng(), hbY + 2);
			ctx.lineTo(sx + rng(), hbY + 10);
			ctx.stroke();
		}
	}
}

// ---- Wall decor ----

function drawWallDecorSketch(
	ctx: Ctx,
	wallDecor: WallDecorItem[],
	ink: string,
	lightInk: string,
	rng: Rng,
): void {
	for (const d of wallDecor) {
		ctx.save();
		ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
		ctx.rotate(d.rot);
		const hw = d.w / 2;
		const hh = d.h / 2;
		ctx.strokeStyle = ink;
		ctx.lineWidth = 1;

		switch (d.type) {
			case "poster":
			case "photo":
			case "calendar": {
				// Wobbly rectangle
				ctx.beginPath();
				const q0: [number, number] = [-hw + rng(), -hh + rng()];
				const q1: [number, number] = [hw - 1 + rng(), -hh + rng()];
				const q2: [number, number] = [hw - 1 + rng(), hh - 1 + rng()];
				const q3: [number, number] = [-hw + rng(), hh - 1 + rng()];
				ctx.moveTo(q0[0], q0[1]);
				ctx.lineTo(q1[0], q1[1]);
				ctx.lineTo(q2[0], q2[1]);
				ctx.lineTo(q3[0], q3[1]);
				ctx.closePath();
				ctx.stroke();
				if (d.type === "poster") {
					ctx.strokeStyle = lightInk;
					ctx.lineWidth = 0.5;
					for (let ly = -hh + 4; ly < hh - 2; ly += 3) {
						ctx.beginPath();
						ctx.moveTo(-hw + 3, ly + rng());
						ctx.lineTo(hw * 0.5, ly + rng());
						ctx.stroke();
					}
				}
				if (d.type === "calendar") {
					ctx.fillStyle = lightInk;
					ctx.lineWidth = 0.3;
					for (let gx = -hw + 2; gx < hw - 1; gx += 3) {
						for (let gy = -hh + 6; gy < hh - 1; gy += 3) {
							ctx.fillRect(gx, gy, 1, 1);
						}
					}
				}
				break;
			}
			case "shelf": {
				ctx.beginPath();
				ctx.moveTo(-hw + rng(), rng());
				ctx.lineTo(hw + rng() - 1, rng());
				ctx.stroke();
				// Brackets
				ctx.beginPath();
				ctx.moveTo(-hw + 4, 0);
				ctx.lineTo(-hw + 4, 6);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(hw - 4, 0);
				ctx.lineTo(hw - 4, 6);
				ctx.stroke();
				// Items on shelf
				ctx.strokeStyle = lightInk;
				ctx.lineWidth = 0.8;
				ctx.beginPath();
				ctx.moveTo(-hw + 3, -5);
				ctx.lineTo(-hw + 8, -5);
				ctx.lineTo(-hw + 8, 0);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(-hw + 10, -7);
				ctx.lineTo(-hw + 15, -7);
				ctx.lineTo(-hw + 15, 0);
				ctx.stroke();
				break;
			}
			case "clock": {
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.stroke();
				ctx.lineWidth = 0.8;
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(rng() * 0.5, -hw * 0.55);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.lineTo(hw * 0.35, rng() * 0.5);
				ctx.stroke();
				break;
			}
			case "mirror": {
				ctx.beginPath();
				ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
				ctx.stroke();
				ctx.strokeStyle = lightInk;
				ctx.lineWidth = 0.4;
				ctx.beginPath();
				ctx.moveTo(-hw + 3, -hh + 4);
				ctx.lineTo(-hw + 3, hh - 4);
				ctx.stroke();
				break;
			}
			case "coathook": {
				ctx.beginPath();
				ctx.moveTo(-hw + rng(), -hh + rng());
				ctx.lineTo(hw + rng() - 1, -hh + rng());
				ctx.stroke();
				for (let hx = -hw + 3; hx < hw - 2; hx += 6) {
					ctx.beginPath();
					ctx.moveTo(hx, -hh + 1);
					ctx.quadraticCurveTo(hx - 2, -hh + 7, hx + 1, -hh + 6);
					ctx.stroke();
				}
				break;
			}
			case "plant_hanging": {
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(0, -hh);
				ctx.lineTo(rng() * 0.5, -hh + 5);
				ctx.stroke();
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(-4, -hh + 5 + rng());
				ctx.lineTo(4, -hh + 5 + rng());
				ctx.lineTo(3, -hh + 11);
				ctx.lineTo(-3, -hh + 11);
				ctx.closePath();
				ctx.stroke();
				// Trailing leaves
				ctx.strokeStyle = lightInk;
				ctx.lineWidth = 0.8;
				ctx.beginPath();
				ctx.moveTo(-2, -hh + 11);
				ctx.quadraticCurveTo(-6, hh * 0.5, -4, hh);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(2, -hh + 11);
				ctx.quadraticCurveTo(5, hh * 0.3, 4, hh - 2);
				ctx.stroke();
				break;
			}
		}
		ctx.restore();
	}
}

// ---- Floor decor ----

function drawDecorSketch(
	ctx: Ctx,
	decor: FloorDecorItem[],
	lightInk: string,
	rng: Rng,
): void {
	const w = () => rng() - 0.5;
	for (const d of decor) {
		const s = d.size;
		ctx.save();
		ctx.translate(d.x, d.y);
		ctx.rotate(d.rot);
		ctx.strokeStyle = lightInk;
		ctx.lineWidth = 0.7;

		switch (d.type) {
			case "book": {
				const bx = -s / 2;
				const by = -s / 4;
				const bw = s;
				const bh = s / 2;
				ctx.beginPath();
				ctx.moveTo(bx + w(), by + w());
				ctx.lineTo(bx + bw + w(), by + w());
				ctx.lineTo(bx + bw + w(), by + bh + w());
				ctx.lineTo(bx + w(), by + bh + w());
				ctx.closePath();
				ctx.stroke();
				// Spine
				ctx.beginPath();
				ctx.moveTo(bx + bw * 0.12 + w(), by + w());
				ctx.lineTo(bx + bw * 0.12 + w(), by + bh + w());
				ctx.stroke();
				break;
			}
			case "mug": {
				ctx.beginPath();
				ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
				ctx.stroke();
				// Handle
				ctx.beginPath();
				ctx.arc(s * 0.3, 0, s * 0.18, -Math.PI * 0.5, Math.PI * 0.5);
				ctx.stroke();
				// Liquid line
				ctx.beginPath();
				ctx.moveTo(-s * 0.2 + w(), -s * 0.1 + w());
				ctx.lineTo(s * 0.2 + w(), -s * 0.1 + w());
				ctx.stroke();
				break;
			}
			case "plant": {
				// Pot trapezoid
				ctx.beginPath();
				ctx.moveTo(-s * 0.3 + w(), w());
				ctx.lineTo(s * 0.3 + w(), w());
				ctx.lineTo(s * 0.25 + w(), s * 0.4 + w());
				ctx.lineTo(-s * 0.25 + w(), s * 0.4 + w());
				ctx.closePath();
				ctx.stroke();
				// Stems and leaves
				ctx.beginPath();
				ctx.moveTo(0, 0);
				ctx.quadraticCurveTo(
					-s * 0.4 + w(),
					-s * 0.3,
					-s * 0.2 + w(),
					-s * 0.5,
				);
				ctx.moveTo(0, 0);
				ctx.quadraticCurveTo(
					s * 0.3 + w(),
					-s * 0.4,
					s * 0.15 + w(),
					-s * 0.55,
				);
				ctx.moveTo(0, 0);
				ctx.quadraticCurveTo(
					s * 0.1 + w(),
					-s * 0.5,
					-s * 0.05 + w(),
					-s * 0.6,
				);
				ctx.stroke();
				break;
			}
			case "laundry": {
				ctx.beginPath();
				ctx.moveTo(-s * 0.45 + w(), s * 0.2 + w());
				ctx.quadraticCurveTo(
					-s * 0.3 + w(),
					-s * 0.25 + w(),
					w(),
					-s * 0.2 + w(),
				);
				ctx.quadraticCurveTo(
					s * 0.35 + w(),
					-s * 0.3 + w(),
					s * 0.4 + w(),
					s * 0.15 + w(),
				);
				ctx.quadraticCurveTo(
					s * 0.1 + w(),
					s * 0.3 + w(),
					-s * 0.2 + w(),
					s * 0.25 + w(),
				);
				ctx.closePath();
				ctx.stroke();
				// Fold line
				ctx.beginPath();
				ctx.moveTo(-s * 0.2 + w(), -s * 0.05 + w());
				ctx.lineTo(s * 0.15 + w(), s * 0.05 + w());
				ctx.stroke();
				break;
			}
			case "shoe": {
				ctx.beginPath();
				ctx.moveTo(-s * 0.4 + w(), s * 0.15 + w());
				ctx.lineTo(-s * 0.4 + w(), -s * 0.05 + w());
				ctx.lineTo(-s * 0.1 + w(), -s * 0.12 + w());
				ctx.quadraticCurveTo(
					s * 0.2 + w(),
					-s * 0.15 + w(),
					s * 0.4 + w(),
					w(),
				);
				ctx.lineTo(s * 0.45 + w(), s * 0.15 + w());
				ctx.closePath();
				ctx.stroke();
				// Sole line
				ctx.beginPath();
				ctx.moveTo(-s * 0.4 + w(), s * 0.1 + w());
				ctx.lineTo(s * 0.4 + w(), s * 0.12 + w());
				ctx.stroke();
				break;
			}
			case "paper": {
				const px = -s * 0.38;
				const py = -s * 0.28;
				const pw = s * 0.7;
				const ph = s * 0.52;
				ctx.beginPath();
				ctx.moveTo(px + w(), py + w());
				ctx.lineTo(px + pw + w(), py + w());
				ctx.lineTo(px + pw + w(), py + ph + w());
				ctx.lineTo(px + w(), py + ph + w());
				ctx.closePath();
				ctx.stroke();
				// Text lines
				for (let i = 0; i < 3; i++) {
					ctx.beginPath();
					ctx.moveTo(px + s * 0.08 + w(), py + s * 0.1 + i * s * 0.12 + w());
					ctx.lineTo(
						px + pw - s * 0.08 - (i === 2 ? s * 0.12 : 0) + w(),
						py + s * 0.1 + i * s * 0.12 + w(),
					);
					ctx.stroke();
				}
				// Corner fold
				ctx.beginPath();
				ctx.moveTo(px + pw - s * 0.12 + w(), py + w());
				ctx.lineTo(px + pw + w(), py + s * 0.12 + w());
				ctx.stroke();
				break;
			}
			case "bowl": {
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.4, s * 0.26, 0, 0, Math.PI * 2);
				ctx.stroke();
				// Inner rim
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.25, s * 0.16, 0, 0, Math.PI * 2);
				ctx.stroke();
				break;
			}
			case "cushion": {
				ctx.beginPath();
				ctx.ellipse(0, 0, s * 0.38, s * 0.32, 0, 0, Math.PI * 2);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(-s * 0.25 + w(), w());
				ctx.lineTo(s * 0.25 + w(), w());
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(w(), -s * 0.22 + w());
				ctx.lineTo(w(), s * 0.22 + w());
				ctx.stroke();
				break;
			}
			case "bottle": {
				ctx.beginPath();
				ctx.moveTo(-s * 0.15 + w(), s * 0.32 + w());
				ctx.lineTo(-s * 0.15 + w(), -s * 0.12 + w());
				ctx.lineTo(-s * 0.08 + w(), -s * 0.15 + w());
				ctx.lineTo(-s * 0.08 + w(), -s * 0.32 + w());
				ctx.lineTo(s * 0.08 + w(), -s * 0.32 + w());
				ctx.lineTo(s * 0.08 + w(), -s * 0.15 + w());
				ctx.lineTo(s * 0.15 + w(), -s * 0.12 + w());
				ctx.lineTo(s * 0.15 + w(), s * 0.32 + w());
				ctx.closePath();
				ctx.stroke();
				// Cap
				ctx.beginPath();
				ctx.moveTo(-s * 0.1 + w(), -s * 0.32 + w());
				ctx.lineTo(-s * 0.1 + w(), -s * 0.38 + w());
				ctx.lineTo(s * 0.1 + w(), -s * 0.38 + w());
				ctx.lineTo(s * 0.1 + w(), -s * 0.32 + w());
				ctx.stroke();
				break;
			}
			default:
				ctx.strokeRect(-s / 3 + w(), -s / 4 + w(), s * 0.6, s * 0.5);
		}
		ctx.restore();
	}
}

// ---- Character ----

function drawSketchChar(
	ctx: Ctx,
	x: number,
	y: number,
	cv: CharacterVariant,
	palette: TimePalette,
): void {
	const { ink } = getInkColors(palette);
	const rng = mulberry32(77);
	const bh = cv.height;

	ctx.strokeStyle = ink;
	ctx.lineWidth = 1.2;

	// Head
	ctx.beginPath();
	ctx.arc(x, y - bh - 4, 5 + rng() * 0.5, 0, Math.PI * 2);
	ctx.stroke();

	// Body line
	ctx.beginPath();
	ctx.moveTo(x, y - bh + 1);
	ctx.lineTo(x + rng() - 0.5, y);
	ctx.stroke();

	// Arms
	const armSpread = cv.build === "stocky" ? 7 : cv.build === "thin" ? 5 : 6;
	ctx.beginPath();
	ctx.moveTo(x - armSpread, y - bh + 6 + rng());
	ctx.lineTo(x, y - bh + 2);
	ctx.lineTo(x + armSpread, y - bh + 6 + rng());
	ctx.stroke();

	// Legs
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x - 4, y + 6 + rng());
	ctx.moveTo(x, y);
	ctx.lineTo(x + 4, y + 6 + rng());
	ctx.stroke();

	// Eyes
	ctx.fillStyle = ink;
	ctx.fillRect(x - 2, y - bh - 5, 1, 1);
	ctx.fillRect(x + 2, y - bh - 5, 1, 1);

	// Hair
	ctx.strokeStyle = ink;
	ctx.lineWidth = 1;
	switch (cv.hairStyle) {
		case "curly":
			ctx.beginPath();
			ctx.arc(x, y - bh - 5, 6.5, 0, Math.PI * 2);
			ctx.stroke();
			break;
		case "long":
			ctx.beginPath();
			ctx.arc(x, y - bh - 5, 5, Math.PI, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x - 5, y - bh - 4);
			ctx.lineTo(x - 5 + rng(), y - bh + 5);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x + 5, y - bh - 4);
			ctx.lineTo(x + 5 + rng(), y - bh + 5);
			ctx.stroke();
			break;
		case "ponytail":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 5, Math.PI, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(x + 5, y - bh - 4);
			ctx.quadraticCurveTo(x + 8, y - bh - 2, x + 7, y - bh + 3);
			ctx.stroke();
			break;
		case "bun":
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 5, Math.PI, Math.PI * 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(x, y - bh - 11, 3, 0, Math.PI * 2);
			ctx.stroke();
			break;
		case "shaved":
			// Almost nothing -- just head circle already drawn
			break;
		default:
			// short, buzz
			ctx.beginPath();
			ctx.arc(x, y - bh - 6, 5, Math.PI, Math.PI * 2);
			ctx.stroke();
			break;
	}
}

// ---- Dog ----

function drawSketchDog(
	ctx: Ctx,
	x: number,
	y: number,
	dv: DogVariant,
	palette: TimePalette,
	mood: DogMoodState,
	energy: number,
): void {
	const { ink, lightInk } = getInkColors(palette);
	const rng = mulberry32(99);
	const brx = dv.bodyW / 2;
	const bry = dv.bodyH / 2;
	const dx = x + brx;
	const dy = y + bry;

	ctx.strokeStyle = ink;
	ctx.lineWidth = 1;

	// Body ellipse
	ctx.beginPath();
	ctx.ellipse(dx, dy, brx + rng() * 0.5, bry + rng() * 0.3, 0, 0, Math.PI * 2);
	ctx.stroke();

	// Head
	ctx.beginPath();
	ctx.ellipse(dx - brx - 2, dy - bry + 2, 4, 3.5, -0.2, 0, Math.PI * 2);
	ctx.stroke();

	// Ears -- mood-reactive
	const earX = dx - brx - 2;
	if (mood === "disappointed") {
		// Droopy ears
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.moveTo(earX - 3, dy - bry + 1);
			ctx.lineTo(earX - 4, dy - bry + 6);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 2, dy - bry + 1);
			ctx.lineTo(earX + 3, dy - bry + 6);
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry + 1);
			ctx.quadraticCurveTo(earX - 6, dy - bry + 4, earX - 5, dy - bry + 8);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 3, dy - bry + 1);
			ctx.quadraticCurveTo(earX + 5, dy - bry + 4, earX + 4, dy - bry + 8);
			ctx.stroke();
		}
	} else if (
		mood === "excited" ||
		mood === "happyForYou" ||
		mood === "hopeful" ||
		mood === "interested"
	) {
		// Perky ears -- taller triangles
		const h = mood === "excited" ? 7 : 5;
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry);
			ctx.lineTo(earX - 5, dy - bry - h);
			ctx.lineTo(earX - 1, dy - bry + 1);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 1, dy - bry);
			ctx.lineTo(earX + 2, dy - bry - h);
			ctx.lineTo(earX + 3, dy - bry + 1);
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry + 1);
			ctx.lineTo(earX - 5, dy - bry - h + 2);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 3, dy - bry + 1);
			ctx.lineTo(earX + 4, dy - bry - h + 2);
			ctx.stroke();
		}
	} else if (mood === "unimpressed" || mood === "sympathetic") {
		// Flattened -- short, horizontal
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry);
			ctx.lineTo(earX - 6, dy - bry - 1);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 1, dy - bry);
			ctx.lineTo(earX + 4, dy - bry - 1);
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry + 1);
			ctx.quadraticCurveTo(earX - 5, dy - bry + 2, earX - 5, dy - bry + 4);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 3, dy - bry + 1);
			ctx.quadraticCurveTo(earX + 4, dy - bry + 2, earX + 4, dy - bry + 4);
			ctx.stroke();
		}
	} else if (mood === "restless") {
		// Twitchy
		const twitch = Math.sin(performance.now() / 150) * 1.5;
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry);
			ctx.lineTo(earX - 5, dy - bry - 5 + twitch);
			ctx.lineTo(earX - 1, dy - bry + 1);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 1, dy - bry);
			ctx.lineTo(earX + 2, dy - bry - 5 - twitch);
			ctx.lineTo(earX + 3, dy - bry + 1);
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry + 1);
			ctx.quadraticCurveTo(
				earX - 6,
				dy - bry - 1 + twitch,
				earX - 5,
				dy - bry + 4,
			);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 3, dy - bry + 1);
			ctx.quadraticCurveTo(
				earX + 5,
				dy - bry - 1 - twitch,
				earX + 4,
				dy - bry + 4,
			);
			ctx.stroke();
		}
	} else {
		// Normal -- ear height varies with energy
		const h = energy > 0.6 ? 5 : energy < 0.3 ? 2 : 3;
		if (dv.earStyle === "pointed") {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry);
			ctx.lineTo(earX - 5, dy - bry - h);
			ctx.lineTo(earX - 1, dy - bry + 1);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 1, dy - bry);
			ctx.lineTo(earX + 2, dy - bry - h);
			ctx.lineTo(earX + 3, dy - bry + 1);
			ctx.stroke();
		} else {
			ctx.beginPath();
			ctx.moveTo(earX - 4, dy - bry + 1);
			ctx.quadraticCurveTo(earX - 6, dy - bry + 3, earX - 5, dy - bry + 6);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(earX + 3, dy - bry + 1);
			ctx.quadraticCurveTo(earX + 5, dy - bry + 3, earX + 4, dy - bry + 6);
			ctx.stroke();
		}
	}

	// Eyes -- mood-reactive
	ctx.fillStyle = ink;
	const eyeX = earX - 2;
	const eyeY = dy - bry + 3;
	if (mood === "disappointed") {
		// Sad -- horizontal lines
		ctx.fillRect(eyeX - 0.5, eyeY + 0.5, 2.5, 0.8);
	} else if (mood === "normal" && energy < 0.25) {
		// Very tired -- tiny dots
		ctx.fillRect(eyeX, eyeY + 0.5, 1.5, 0.8);
	} else {
		// Normal
		ctx.fillRect(eyeX, eyeY, 1.5, 1.5);
	}

	// Nose
	ctx.fillRect(earX - 3, dy - bry + 5, 1.5, 1);

	// Tail -- mood-reactive
	ctx.strokeStyle = ink;
	ctx.lineWidth = 1;
	const tailX = dx + brx;
	const tailBaseY = dy - 2;
	ctx.beginPath();
	ctx.moveTo(tailX, tailBaseY);

	if (mood === "disappointed") {
		ctx.quadraticCurveTo(tailX + 3, tailBaseY + 2, tailX + 4, tailBaseY + 6);
	} else if (mood === "excited") {
		const wag = Math.sin(performance.now() / 80) * 3;
		ctx.quadraticCurveTo(
			tailX + 4,
			tailBaseY - 4,
			tailX + 3,
			tailBaseY - 9 + wag,
		);
	} else if (mood === "happyForYou") {
		const wag = Math.sin(performance.now() / 150) * 2;
		ctx.quadraticCurveTo(
			tailX + 4,
			tailBaseY - 3,
			tailX + 3,
			tailBaseY - 7 + wag,
		);
	} else if (mood === "hopeful" || mood === "interested") {
		ctx.quadraticCurveTo(tailX + 4, tailBaseY - 3, tailX + 3, tailBaseY - 7);
	} else if (mood === "sympathetic") {
		ctx.quadraticCurveTo(tailX + 3, tailBaseY, tailX + 4, tailBaseY + 2);
	} else if (mood === "unimpressed") {
		ctx.quadraticCurveTo(tailX + 3, tailBaseY + 1, tailX + 4, tailBaseY + 3);
	} else if (mood === "restless") {
		const twitch = Math.sin(performance.now() / 120) * 2;
		ctx.quadraticCurveTo(
			tailX + 4,
			tailBaseY - 3,
			tailX + 3,
			tailBaseY - 6 + twitch,
		);
	} else {
		// Normal -- energy-based, uses seed tail style
		if (dv.tailStyle === "up") {
			const h = energy > 0.5 ? -9 : -5;
			ctx.quadraticCurveTo(tailX + 4, tailBaseY - 6, tailX + 3, tailBaseY + h);
		} else if (dv.tailStyle === "curl") {
			const curveY = energy > 0.5 ? -7 : -4;
			ctx.quadraticCurveTo(
				tailX + 5,
				tailBaseY - 4,
				tailX + 2,
				tailBaseY + curveY,
			);
		} else {
			const h = energy > 0.5 ? 1 : 4;
			ctx.quadraticCurveTo(tailX + 3, tailBaseY + 1, tailX + 3, tailBaseY + h);
		}
	}
	ctx.stroke();

	// Legs
	ctx.lineWidth = 0.8;
	ctx.beginPath();
	const legSpacing = dv.bodyW / 4;
	for (let li = 0; li < 4; li++) {
		const lx = dx - brx + 2 + li * legSpacing;
		ctx.moveTo(lx, dy + bry);
		ctx.lineTo(lx, dy + bry + 4);
	}
	ctx.stroke();

	// Spots
	if (dv.hasSpots) {
		ctx.strokeStyle = lightInk;
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.arc(dx - 2, dy + 1, 2, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(dx + 3, dy - 1, 1.5, 0, Math.PI * 2);
		ctx.stroke();
	}
}
