/**
 * Isometric pixel art style renderer (Style 4).
 * 3D boxes with parallelogram top faces. Diamond floor tiles.
 * Coordinate transforms map layout positions to isometric screen positions.
 */

import type { AnimationState } from "../../systems/animation";
import { darken, hueShift, lighten } from "../color";
import { applyTimeOverlay, isNightPalette } from "../palettes";
import type {
	CharacterVariant,
	DogMoodState,
	DogVariant,
	FloorDecorItem,
	FurnitureName,
	Rect,
	RoomDrawOptions,
	RoomLayout,
	RoomRenderer,
	TimePalette,
} from "../types";
import { drawWallDecorPixel } from "./pixel";

type Ctx = CanvasRenderingContext2D;

/** Creates an isometric pixel art renderer. */
export function createIsometricRenderer(): RoomRenderer {
	return {
		drawRoom(ctx: Ctx, layout: RoomLayout, options: RoomDrawOptions): void {
			drawIsoRoom(ctx, layout, options);
		},
		drawCharacter(
			ctx: Ctx,
			x: number,
			y: number,
			variants: CharacterVariant,
			_timePalette: TimePalette,
			_animState: AnimationState | null,
		): void {
			drawIsoChar(ctx, x, y, variants);
		},
		drawDog(
			ctx: Ctx,
			x: number,
			y: number,
			variants: DogVariant,
			_timePalette: TimePalette,
			mood: DogMoodState,
			energy: number,
		): void {
			drawIsoDog(ctx, x, y, variants, mood, energy);
		},
		highlightFurniture(
			ctx: Ctx,
			rect: Rect,
			layout: RoomLayout,
			fill?: string,
			stroke?: string,
		): void {
			drawIsoHighlight(ctx, rect, layout, fill, stroke);
		},
	};
}

// ---- Iso highlight ----

/** Highlight a furniture piece using iso-transformed coordinates. */
function drawIsoHighlight(
	ctx: Ctx,
	rect: Rect,
	layout: RoomLayout,
	fillColor = "rgba(94, 106, 210, 0.1)",
	strokeColor = "rgba(94, 106, 210, 0.5)",
): void {
	const { roomHeight, wallY, floorTop } = layout;
	const isoFloor = wallY > 0 ? 48 : 0;
	const iy =
		isoFloor +
		(rect.y - floorTop) * ((roomHeight - isoFloor) / (roomHeight - floorTop));
	const ix = rect.x;
	const iw = rect.w * 0.7;
	const ih = rect.h * 0.5;
	const depth = 8;
	const pad = 3;

	// Outline the iso box shape (front + top + right faces)
	ctx.fillStyle = fillColor;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = 1.5;

	ctx.beginPath();
	// Bottom-left of front face
	ctx.moveTo(ix - pad, iy + depth + pad);
	// Bottom-right of front face
	ctx.lineTo(ix + iw + pad, iy + depth + pad);
	// Right-bottom of right face
	ctx.lineTo(ix + iw + pad + ih * 0.4, iy + depth + pad - ih * 0.3);
	// Right-top of right face (top-right of top face)
	ctx.lineTo(ix + iw + pad + ih * 0.4, iy - pad - ih * 0.3);
	// Top-right of top face
	ctx.lineTo(ix + iw + ih * 0.4, iy - pad - ih * 0.3);
	// Top-left of top face
	ctx.lineTo(ix - pad + ih * 0.4, iy - pad - ih * 0.3);
	// Back to front top-left
	ctx.lineTo(ix - pad, iy - pad);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

// ---- Iso geometry primitives ----

/** Draw an isometric box: front face, top parallelogram, right face, outline. */
function isoBox(
	ctx: Ctx,
	x: number,
	y: number,
	w: number,
	h: number,
	depth: number,
	color: string,
): void {
	// Front face
	ctx.fillStyle = darken(color, 0.15);
	ctx.fillRect(x, y, w, depth);
	// Top face (parallelogram)
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + h * 0.4, y - h * 0.3);
	ctx.lineTo(x + w + h * 0.4, y - h * 0.3);
	ctx.lineTo(x + w, y);
	ctx.closePath();
	ctx.fill();
	// Right face
	ctx.fillStyle = darken(color, 0.25);
	ctx.beginPath();
	ctx.moveTo(x + w, y);
	ctx.lineTo(x + w + h * 0.4, y - h * 0.3);
	ctx.lineTo(x + w + h * 0.4, y - h * 0.3 + depth);
	ctx.lineTo(x + w, y + depth);
	ctx.closePath();
	ctx.fill();
	// Outline
	ctx.strokeStyle = darken(color, 0.4);
	ctx.lineWidth = 0.5;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + h * 0.4, y - h * 0.3);
	ctx.lineTo(x + w + h * 0.4, y - h * 0.3);
	ctx.lineTo(x + w, y);
	ctx.closePath();
	ctx.stroke();
	ctx.strokeRect(x, y, w, depth);
}

/** Map a (u, v) in [0,1] to screen coords on the top face of a box. */
function topFacePoint(
	tx: number,
	ty: number,
	w: number,
	h: number,
	u: number,
	v: number,
): { x: number; y: number } {
	return { x: tx + u * w + v * h * 0.4, y: ty - v * h * 0.3 };
}

/** Fill a parallelogram region on a box's top face. */
function isoTopFill(
	ctx: Ctx,
	tx: number,
	ty: number,
	w: number,
	h: number,
	u: number,
	v: number,
	uw: number,
	vh: number,
	color: string,
): void {
	const p0 = topFacePoint(tx, ty, w, h, u, v);
	const p1 = topFacePoint(tx, ty, w, h, u + uw, v);
	const p2 = topFacePoint(tx, ty, w, h, u + uw, v + vh);
	const p3 = topFacePoint(tx, ty, w, h, u, v + vh);
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(p0.x, p0.y);
	ctx.lineTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.lineTo(p3.x, p3.y);
	ctx.closePath();
	ctx.fill();
}

/** Draw a small iso box sitting on a parent box's top face at (u, v). */
function isoBoxOnTop(
	ctx: Ctx,
	baseX: number,
	baseY: number,
	baseW: number,
	baseH: number,
	u: number,
	v: number,
	bw: number,
	bhFrac: number,
	depth: number,
	color: string,
): void {
	const p = topFacePoint(baseX, baseY, baseW, baseH, u, v);
	isoBox(ctx, p.x, p.y - depth, bw, bhFrac * baseH, depth, color);
}

// ---- Main room draw ----

function drawIsoRoom(
	ctx: Ctx,
	layout: RoomLayout,
	options: RoomDrawOptions,
): void {
	const { timePalette, seedPalette, variants } = options;
	const { roomWidth, roomHeight, wallY, floorTop } = layout;

	const isoFloor = wallY > 0 ? 48 : 0;

	/** Identity X mapping. */
	function isoX(lx: number): number {
		return lx;
	}
	/** Remap Y: floorTop -> isoFloor, roomHeight -> roomHeight. */
	function isoY(ly: number): number {
		return (
			isoFloor +
			(ly - floorTop) * ((roomHeight - isoFloor) / (roomHeight - floorTop))
		);
	}

	// Floor base
	ctx.fillStyle = timePalette.floor;
	ctx.fillRect(0, 0, roomWidth, roomHeight);

	// Diamond floor tiles
	const tileW = 16;
	const tileH = 8;
	for (let row = -2; row < roomHeight / tileH + 2; row++) {
		for (let col = -2; col < roomWidth / tileW + 2; col++) {
			const ox = col * tileW + (row % 2) * (tileW / 2);
			const oy = row * tileH;
			if (oy + tileH < isoFloor) continue;
			ctx.fillStyle = darken(
				timePalette.floor,
				(col + row) % 2 === 0 ? 0 : 0.03,
			);
			ctx.beginPath();
			ctx.moveTo(ox, oy + tileH / 2);
			ctx.lineTo(ox + tileW / 2, oy);
			ctx.lineTo(ox + tileW, oy + tileH / 2);
			ctx.lineTo(ox + tileW / 2, oy + tileH);
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = darken(timePalette.floor, 0.08);
			ctx.lineWidth = 0.3;
			ctx.stroke();
		}
	}

	// Wall (skip in top-down mode)
	if (wallY > 0) {
		ctx.fillStyle = timePalette.wall;
		ctx.fillRect(0, 0, roomWidth, isoFloor);
		ctx.fillStyle = darken(timePalette.wall, 0.15);
		ctx.fillRect(0, isoFloor - 3, roomWidth, 3);
	}

	// Wall decor -- reuse pixel style
	if (wallY > 0) {
		drawWallDecorPixel(ctx, layout.wallDecor, seedPalette);
	}

	const hue = seedPalette.hueShiftDeg;

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
		const ix = isoX(f.x);
		const iy = isoY(f.y);
		const iw = f.w * 0.7;
		const ih = f.h * 0.5;
		const c = seedPalette.colors[name] ?? "#888";

		switch (name) {
			case "bed":
				drawIsoBed(ctx, ix, iy, iw, ih, c, variants.bed);
				break;
			case "desk":
				drawIsoDesk(ctx, ix, iy, iw, ih, c, variants.desk, hue);
				break;
			case "couch":
				drawIsoCouch(ctx, ix, iy, iw, ih, c, variants.couch);
				break;
			case "kitchen":
				drawIsoKitchen(
					ctx,
					ix,
					iy,
					iw,
					ih,
					c,
					f,
					floorTop,
					variants.kitchen,
					hue,
				);
				break;
			case "bathroom":
				drawIsoBathroom(
					ctx,
					ix,
					iy,
					iw,
					ih,
					c,
					f,
					floorTop,
					variants.bathroom,
					hue,
				);
				break;
			case "door":
				drawIsoDoor(ctx, ix, iy, iw, ih, c, variants.door);
				break;
		}

		if (options.showLabels) {
			ctx.fillStyle = "#fff";
			ctx.font = "5px monospace";
			ctx.textAlign = "center";
			ctx.fillText(name, ix + iw / 2, iy + 6);
		}
	}

	// Floor decor as iso items
	drawIsoDecor(ctx, layout.decor, isoX, isoY, hue);

	applyTimeOverlay(ctx, timePalette, roomWidth, roomHeight);

	// Night glow from desk
	if (isNightPalette(timePalette)) {
		const desk = layout.furniture.desk;
		if (desk) {
			const gx = isoX(desk.x) + 20;
			const gy = isoY(desk.y);
			const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 35);
			grd.addColorStop(0, "rgba(255,240,180,0.2)");
			grd.addColorStop(1, "rgba(255,240,180,0)");
			ctx.fillStyle = grd;
			ctx.fillRect(0, 0, roomWidth, roomHeight);
		}
	}
}

// ---- Furniture ----

function drawIsoBed(
	ctx: Ctx,
	ix: number,
	iy: number,
	iw: number,
	ih: number,
	c: string,
	v: { pillowCount: number; messy: boolean },
): void {
	// Mattress
	isoBox(ctx, ix, iy, iw, ih, 6, c);
	// Headboard
	isoBox(
		ctx,
		ix + ih * 0.35,
		iy - ih * 0.25 - 8,
		iw * 0.9,
		ih * 0.2,
		10,
		darken(c, 0.2),
	);
	// Pillows
	const pillowC = lighten(c, 0.3);
	const pw = iw * 0.22;
	for (let pi = 0; pi < v.pillowCount; pi++) {
		const pu = 0.05 + pi * (pw / iw + 0.03);
		isoBoxOnTop(ctx, ix, iy, iw, ih, pu, 0.5, pw, 0.35, 3, pillowC);
	}
	// Blanket strip
	isoTopFill(ctx, ix, iy, iw, ih, 0.02, 0.05, 0.96, 0.4, lighten(c, 0.1));
	if (v.messy) {
		ctx.fillStyle = lighten(c, 0.08);
		ctx.fillRect(ix + iw * 0.6, iy + 1, iw * 0.25, 4);
	}
}

function drawIsoDesk(
	ctx: Ctx,
	ix: number,
	iy: number,
	iw: number,
	ih: number,
	c: string,
	v: { monitor: string; hasLamp: boolean },
	hue: number,
): void {
	// Surface
	isoBox(ctx, ix, iy, iw, ih, 3, c);
	// Legs
	ctx.fillStyle = darken(c, 0.25);
	ctx.fillRect(ix + 1, iy + 3, 2, 8);
	ctx.fillRect(ix + iw - 3, iy + 3, 2, 8);
	// Monitor
	if (v.monitor === "laptop") {
		isoBoxOnTop(ctx, ix, iy, iw, ih, 0.2, 0.3, iw * 0.5, 0.4, 1, "#444");
		const sp = topFacePoint(ix, iy, iw, ih, 0.2, 0.6);
		isoBox(ctx, sp.x, sp.y - 9, iw * 0.5, ih * 0.15, 8, "#333");
		ctx.fillStyle = hueShift("#5577bb", hue);
		ctx.fillRect(sp.x + 1, sp.y - 8, iw * 0.5 - 2, 6);
	} else if (v.monitor === "desktop" || v.monitor === "dual") {
		const mw = v.monitor === "dual" ? iw * 0.6 : iw * 0.45;
		const sp = topFacePoint(ix, iy, iw, ih, 0.15, 0.5);
		isoBox(ctx, sp.x, sp.y - 10, mw, ih * 0.2, 9, "#333");
		ctx.fillStyle = hueShift("#5577bb", hue);
		ctx.fillRect(sp.x + 1, sp.y - 9, mw - 2, 7);
		ctx.fillStyle = "#444";
		ctx.fillRect(sp.x + mw * 0.4, sp.y - 1, mw * 0.2, 2);
	}
	// Lamp
	if (v.hasLamp) {
		const lp = topFacePoint(ix, iy, iw, ih, 0.85, 0.5);
		ctx.fillStyle = "#888";
		ctx.fillRect(lp.x, lp.y - 10, 2, 10);
		ctx.fillStyle = hueShift("#ddcc44", hue);
		ctx.fillRect(lp.x - 2, lp.y - 13, 6, 4);
	}
}

function drawIsoCouch(
	ctx: Ctx,
	ix: number,
	iy: number,
	iw: number,
	ih: number,
	c: string,
	v: { style: string; cushions: number },
): void {
	if (v.style === "beanbag") {
		ctx.fillStyle = "rgba(0,0,0,0.08)";
		ctx.beginPath();
		ctx.ellipse(ix + iw / 2, iy + 4, iw / 2 + 2, 4, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = c;
		ctx.beginPath();
		ctx.ellipse(ix + iw / 2, iy - 2, iw / 2, 8, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = darken(c, 0.15);
		ctx.beginPath();
		ctx.ellipse(ix + iw / 2, iy + 1, iw / 2 - 1, 5, 0, Math.PI, Math.PI);
		ctx.fill();
		ctx.strokeStyle = darken(c, 0.3);
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.ellipse(ix + iw / 2, iy - 2, iw / 2, 8, 0, 0, Math.PI * 2);
		ctx.stroke();
	} else {
		// Seat cushion
		isoBox(ctx, ix, iy, iw, ih, 5, c);
		// Back rest
		isoBox(
			ctx,
			ix + ih * 0.35,
			iy - ih * 0.25 - 4,
			iw * 0.85,
			ih * 0.3,
			7,
			darken(c, 0.08),
		);
		// Arm rests
		const armC = darken(c, 0.12);
		isoBox(ctx, ix, iy - 3, iw * 0.08, ih * 0.4, 5, armC);
		isoBox(ctx, ix + iw - iw * 0.08, iy - 3, iw * 0.08, ih * 0.4, 5, armC);
		// Cushion lines
		const cushCount = v.cushions || 3;
		const cw = 0.9 / cushCount;
		ctx.strokeStyle = darken(c, 0.2);
		ctx.lineWidth = 0.5;
		for (let ci = 1; ci < cushCount; ci++) {
			const p0 = topFacePoint(ix, iy, iw, ih, 0.05 + ci * cw, 0.05);
			const p1 = topFacePoint(ix, iy, iw, ih, 0.05 + ci * cw, 0.85);
			ctx.beginPath();
			ctx.moveTo(p0.x, p0.y);
			ctx.lineTo(p1.x, p1.y);
			ctx.stroke();
		}
	}
}

function drawIsoKitchen(
	ctx: Ctx,
	ix: number,
	iy: number,
	iw: number,
	ih: number,
	c: string,
	f: Rect,
	floorTop: number,
	v: { hasCabinets: boolean; hasMug: boolean },
	hue: number,
): void {
	// Counter
	isoBox(ctx, ix, iy, iw, ih, 10, c);
	// Burners
	ctx.fillStyle = darken(c, 0.15);
	const b1 = topFacePoint(ix, iy, iw, ih, 0.25, 0.5);
	const b2 = topFacePoint(ix, iy, iw, ih, 0.6, 0.5);
	ctx.beginPath();
	ctx.ellipse(b1.x, b1.y, 5, 3, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = darken(c, 0.3);
	ctx.lineWidth = 0.5;
	ctx.beginPath();
	ctx.ellipse(b1.x, b1.y, 5, 3, 0, 0, Math.PI * 2);
	ctx.stroke();
	ctx.fillStyle = darken(c, 0.15);
	ctx.beginPath();
	ctx.ellipse(b2.x, b2.y, 4, 2.5, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = darken(c, 0.3);
	ctx.beginPath();
	ctx.ellipse(b2.x, b2.y, 4, 2.5, 0, 0, Math.PI * 2);
	ctx.stroke();
	// Upper cabinets
	if (f.y < floorTop + 10 && v.hasCabinets) {
		const cabC = darken(c, 0.1);
		isoBox(
			ctx,
			ix + ih * 0.3,
			iy - ih * 0.2 - 18,
			iw * 0.4,
			ih * 0.2,
			14,
			cabC,
		);
		isoBox(
			ctx,
			ix + ih * 0.3 + iw * 0.45,
			iy - ih * 0.2 - 18,
			iw * 0.35,
			ih * 0.2,
			14,
			cabC,
		);
		ctx.fillStyle = "#bbb";
		ctx.fillRect(ix + ih * 0.3 + iw * 0.18, iy - ih * 0.2 - 7, 2, 3);
		ctx.fillRect(ix + ih * 0.3 + iw * 0.6, iy - ih * 0.2 - 7, 2, 3);
	}
	// Mug
	if (v.hasMug) {
		const mp = topFacePoint(ix, iy, iw, ih, 0.82, 0.4);
		ctx.fillStyle = hueShift("#cc6644", hue);
		ctx.fillRect(mp.x - 2, mp.y - 5, 4, 5);
		ctx.beginPath();
		ctx.ellipse(mp.x, mp.y - 5, 2, 1, 0, 0, Math.PI * 2);
		ctx.fill();
	}
}

function drawIsoBathroom(
	ctx: Ctx,
	ix: number,
	iy: number,
	iw: number,
	ih: number,
	c: string,
	f: Rect,
	floorTop: number,
	v: { hasMat: boolean; hasMirror: boolean },
	hue: number,
): void {
	// Main floor box
	isoBox(ctx, ix, iy, iw, ih, 8, c);
	// Tub
	const tubC = lighten(c, 0.15);
	isoBox(ctx, ix + 1, iy - 2, iw * 0.55, ih * 0.7, 10, tubC);
	isoTopFill(
		ctx,
		ix + 1,
		iy - 2,
		iw * 0.55,
		ih * 0.7,
		0.08,
		0.1,
		0.84,
		0.8,
		darken(tubC, 0.12),
	);
	// Toilet
	const toiletC = "#dde";
	isoBox(ctx, ix + iw * 0.65, iy - 1, iw * 0.2, ih * 0.35, 5, toiletC);
	isoBox(
		ctx,
		ix + iw * 0.65 + ih * 0.35 * 0.35,
		iy - 1 - ih * 0.35 * 0.25 - 3,
		iw * 0.2,
		ih * 0.15,
		5,
		darken(toiletC, 0.05),
	);
	// Bath mat
	if (v.hasMat) {
		const matC = hueShift("#6688aa", hue);
		isoTopFill(ctx, ix, iy, iw, ih, 0.55, 0.05, 0.25, 0.5, matC);
	}
	// Mirror
	if (f.y < floorTop + 10 && v.hasMirror) {
		const mirX = ix + iw * 0.6;
		const mirY = iy - ih * 0.3 - 18;
		ctx.fillStyle = "#c8d8e8";
		ctx.fillRect(mirX, mirY, 12, 14);
		ctx.strokeStyle = "#999";
		ctx.lineWidth = 0.5;
		ctx.strokeRect(mirX, mirY, 12, 14);
		ctx.fillStyle = "rgba(255,255,255,0.25)";
		ctx.fillRect(mirX + 2, mirY + 2, 3, 10);
	}
}

function drawIsoDoor(
	ctx: Ctx,
	ix: number,
	iy: number,
	iw: number,
	ih: number,
	c: string,
	v: { hasWindow: boolean },
): void {
	// Frame
	isoBox(ctx, ix - 1, iy - 1, iw + 2, ih * 0.15, 15, darken(c, 0.15));
	// Panel
	isoBox(ctx, ix, iy, iw, ih * 0.1, 13, c);
	// Handle
	ctx.fillStyle = "#d4a040";
	ctx.fillRect(ix + 3, iy + 5, 2, 3);
	// Window
	if (v.hasWindow) {
		ctx.fillStyle = lighten(c, 0.3);
		ctx.fillRect(ix + iw * 0.2, iy - ih * 0.1 * 0.2, iw * 0.6, 5);
		ctx.strokeStyle = darken(c, 0.3);
		ctx.lineWidth = 0.5;
		ctx.strokeRect(ix + iw * 0.2, iy - ih * 0.1 * 0.2, iw * 0.6, 5);
	}
}

// ---- Floor decor as iso items ----

function drawIsoDecor(
	ctx: Ctx,
	decor: FloorDecorItem[],
	isoX: (lx: number) => number,
	isoY: (ly: number) => number,
	hue: number,
): void {
	for (const d of decor) {
		const s = d.size;
		const sx = isoX(d.x);
		const sy = isoY(d.y);

		switch (d.type) {
			case "book": {
				const c = hueShift("#8855aa", hue);
				isoBox(ctx, sx - s * 0.4, sy, s * 0.8, s * 0.4, 1.5, c);
				ctx.fillStyle = darken(c, 0.25);
				ctx.fillRect(sx - s * 0.4, sy - 1.5, 1.5, s * 0.4 * 0.5 + 1.5);
				break;
			}
			case "mug": {
				isoBox(ctx, sx - 2, sy - 1, 3, 2, 5, "#ddd");
				// Liquid top
				ctx.fillStyle = hueShift("#6b3a10", hue);
				ctx.beginPath();
				ctx.moveTo(sx - 2, sy - 6);
				ctx.lineTo(sx + 1, sy - 7);
				ctx.lineTo(sx + 3, sy - 6);
				ctx.lineTo(sx, sy - 5);
				ctx.closePath();
				ctx.fill();
				// Handle
				ctx.strokeStyle = "#ccc";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(sx + 3, sy - 3, 2, -Math.PI * 0.4, Math.PI * 0.4);
				ctx.stroke();
				break;
			}
			case "plant": {
				const potC = hueShift("#aa6644", hue);
				const leafC = hueShift("#55aa55", hue);
				isoBox(ctx, sx - 2, sy - 1, 4, 3, 3, potC);
				ctx.fillStyle = leafC;
				ctx.beginPath();
				ctx.arc(sx, sy - 6, 3.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = darken(leafC, 0.15);
				ctx.beginPath();
				ctx.arc(sx - 1.5, sy - 5.5, 1.5, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case "laundry": {
				const c1 = hueShift("#8899bb", hue);
				const c2 = hueShift("#aa6677", hue);
				isoBox(ctx, sx - s * 0.4, sy, s * 0.7, s * 0.4, 1.5, c1);
				isoBox(ctx, sx - s * 0.2, sy - 1, s * 0.5, s * 0.35, 2, c2);
				break;
			}
			case "shoe": {
				const c = hueShift("#5a4a3a", hue);
				isoBox(ctx, sx - s * 0.35, sy, s * 0.7, s * 0.25, 2, c);
				ctx.fillStyle = darken(c, 0.3);
				ctx.fillRect(sx - s * 0.35, sy + s * 0.25 * 0.5, s * 0.7, 1);
				break;
			}
			case "paper": {
				isoBox(ctx, sx - s * 0.35, sy, s * 0.65, s * 0.45, 0.5, "#e8e4dc");
				ctx.fillStyle = "#bbb";
				const tx = sx - s * 0.25;
				const ty = sy - 0.5;
				ctx.fillRect(tx, ty - s * 0.2, s * 0.3, 0.5);
				ctx.fillRect(tx, ty - s * 0.12, s * 0.35, 0.5);
				ctx.fillRect(tx, ty - s * 0.04, s * 0.2, 0.5);
				break;
			}
			case "bowl": {
				const c = hueShift("#8899aa", hue);
				isoBox(ctx, sx - s * 0.35, sy, s * 0.65, s * 0.4, 2, c);
				ctx.fillStyle = darken(c, 0.2);
				ctx.beginPath();
				const bx = sx - s * 0.2;
				const by = sy - 2;
				ctx.moveTo(bx, by);
				ctx.lineTo(bx + s * 0.35, by - s * 0.2);
				ctx.lineTo(bx + s * 0.35 + s * 0.2, by - s * 0.2 + s * 0.1);
				ctx.lineTo(bx + s * 0.2, by + s * 0.1);
				ctx.closePath();
				ctx.fill();
				break;
			}
			case "cushion": {
				const c = hueShift("#cc7755", hue);
				isoBox(ctx, sx - s * 0.32, sy, s * 0.55, s * 0.45, 2.5, c);
				ctx.strokeStyle = darken(c, 0.2);
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(sx - s * 0.05, sy - 2.5 - s * 0.1);
				ctx.lineTo(sx + s * 0.2, sy - 2.5);
				ctx.stroke();
				break;
			}
			case "bottle": {
				const c = hueShift("#44aa88", hue);
				isoBox(ctx, sx - 1.5, sy - 1, 3, 2, 5, c);
				isoBox(ctx, sx - 1, sy - 6, 2, 1.5, 1, darken(c, 0.3));
				ctx.fillStyle = "#eee";
				ctx.fillRect(sx - 1.5, sy - 3, 3, 2);
				break;
			}
			default:
				isoBox(
					ctx,
					sx - s / 3,
					sy - 1,
					s * 0.5,
					s * 0.3,
					2,
					hueShift("#999", hue),
				);
		}
	}
}

// ---- Character ----

function drawIsoChar(
	ctx: Ctx,
	x: number,
	y: number,
	cv: CharacterVariant,
): void {
	// The caller passes layout positions. For iso, we apply a vertical offset.
	const cy = y - 5;
	const hw = Math.floor(cv.buildW * 0.35);

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	ctx.beginPath();
	ctx.ellipse(x, cy + 2, hw + 2, 3, 0, 0, Math.PI * 2);
	ctx.fill();

	// Pants box
	isoBox(
		ctx,
		x - hw,
		cy - Math.floor(cv.height * 0.35),
		hw * 2,
		3,
		Math.floor(cv.height * 0.35),
		cv.pantsColor,
	);
	// Top box
	isoBox(
		ctx,
		x - hw,
		cy - cv.height,
		hw * 2,
		3,
		Math.ceil(cv.height * 0.65),
		cv.topColor,
	);
	// Head
	ctx.fillStyle = cv.skin;
	ctx.beginPath();
	ctx.arc(x, cy - cv.height - 4, 4, 0, Math.PI * 2);
	ctx.fill();
	// Hair
	ctx.fillStyle = cv.hairColor;
	switch (cv.hairStyle) {
		case "curly":
			ctx.beginPath();
			ctx.arc(x, cy - cv.height - 5, 5.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = cv.skin;
			ctx.beginPath();
			ctx.arc(x, cy - cv.height - 3, 3.5, 0, Math.PI);
			ctx.fill();
			break;
		case "bun":
			ctx.beginPath();
			ctx.arc(x, cy - cv.height - 6, 4, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x, cy - cv.height - 9, 2.5, 0, Math.PI * 2);
			ctx.fill();
			break;
		case "long":
			ctx.beginPath();
			ctx.arc(x, cy - cv.height - 5, 4.5, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.fillRect(x - 5, cy - cv.height - 4, 2, 8);
			ctx.fillRect(x + 3, cy - cv.height - 4, 2, 8);
			break;
		case "ponytail":
			ctx.beginPath();
			ctx.arc(x, cy - cv.height - 5, 4, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.fillRect(x + 3, cy - cv.height - 3, 2, 2);
			ctx.fillRect(x + 4, cy - cv.height - 1, 2, 4);
			break;
		case "shaved":
			break;
		default:
			// short, buzz
			ctx.beginPath();
			ctx.arc(x, cy - cv.height - 5, 4, Math.PI, Math.PI * 2);
			ctx.fill();
			break;
	}
}

// ---- Dog ----

function drawIsoDog(
	ctx: Ctx,
	x: number,
	y: number,
	dv: DogVariant,
	mood: DogMoodState,
	energy: number,
): void {
	const dy = y - 5;
	const bw = Math.floor(dv.bodyW * 0.7);
	const bh = Math.floor(dv.bodyH * 0.5);

	let bodyC = dv.bodyColor;
	if (mood === "disappointed") {
		bodyC = darken(bodyC, 0.15);
	} else if (mood === "normal" && energy < 0.3) {
		bodyC = darken(bodyC, 0.08);
	}

	// Shadow
	ctx.fillStyle = "rgba(0,0,0,0.07)";
	ctx.beginPath();
	ctx.ellipse(x + bw / 2, dy + 2, bw / 2 + 2, 3, 0, 0, Math.PI * 2);
	ctx.fill();

	// Body box
	isoBox(ctx, x, dy - bh, bw, bh * 0.6, bh, bodyC);

	// Head box
	const headX = x - Math.floor(bw * 0.3);
	const headW = Math.floor(bw * 0.45);
	const headH = bh * 0.4;
	const headDepth = Math.floor(bh * 0.8);
	isoBox(ctx, headX, dy - bh - 1, headW, headH, headDepth, darken(bodyC, 0.05));

	// Spots
	if (dv.hasSpots) {
		ctx.fillStyle = dv.spotColor;
		ctx.fillRect(x + Math.floor(bw * 0.3), dy - bh + 2, 2, 2);
		ctx.fillRect(x + Math.floor(bw * 0.6), dy - bh + 3, 2, 1);
	}

	// Ears -- mood-reactive
	ctx.fillStyle = dv.earColor;
	drawIsoDogEars(ctx, headX, headW, dy, bh, dv, mood, energy);

	// Eyes -- mood-reactive
	ctx.fillStyle = "#333";
	const eyeY = dy - bh + 1;
	if (mood === "disappointed") {
		// Sad -- narrow lines
		ctx.fillRect(headX + 2, eyeY + 1, 1.5, 0.5);
		ctx.fillRect(headX + Math.floor(bw * 0.3), eyeY + 1, 1.5, 0.5);
	} else if (mood === "normal" && energy < 0.25) {
		// Tired -- half-closed
		ctx.fillRect(headX + 2, eyeY + 1, 1, 0.5);
		ctx.fillRect(headX + Math.floor(bw * 0.3), eyeY + 1, 1, 0.5);
	} else {
		ctx.fillRect(headX + 2, eyeY, 1.5, 1.5);
		ctx.fillRect(headX + Math.floor(bw * 0.3), eyeY, 1.5, 1.5);
	}

	// Nose
	ctx.fillStyle = dv.noseColor;
	ctx.fillRect(headX + Math.floor(bw * 0.18), dy - bh + 3, 1.5, 1.5);

	// Tail -- mood-reactive
	drawIsoDogTail(ctx, x, dy, bw, bh, dv, bodyC, mood, energy);
}

// ---- Dog ears (iso) ----

function drawIsoDogEars(
	ctx: Ctx,
	headX: number,
	headW: number,
	dy: number,
	bh: number,
	dv: DogVariant,
	mood: DogMoodState,
	energy: number,
): void {
	const earW = 2;

	if (mood === "disappointed") {
		// Droopy -- lower, shorter
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, dy - bh, earW, 2);
			ctx.fillRect(headX + Math.floor(headW * 0.8), dy - bh, earW, 2);
		} else {
			ctx.fillRect(headX - 1, dy - bh + 1, earW, 3);
			ctx.fillRect(headX + Math.floor(headW * 0.85), dy - bh + 1, earW, 3);
		}
	} else if (
		mood === "excited" ||
		mood === "happyForYou" ||
		mood === "hopeful" ||
		mood === "interested"
	) {
		// Perky -- higher
		const h = mood === "excited" ? 5 : 4;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, dy - bh - h, earW, h);
			ctx.fillRect(headX + Math.floor(headW * 0.8), dy - bh - h, earW, h);
		} else {
			ctx.fillRect(headX - 1, dy - bh - 2, earW, 5);
			ctx.fillRect(headX + Math.floor(headW * 0.85), dy - bh - 2, earW, 5);
		}
	} else if (mood === "unimpressed" || mood === "sympathetic") {
		// Flat -- horizontal
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, dy - bh - 2, earW, 2);
			ctx.fillRect(headX + Math.floor(headW * 0.8), dy - bh - 2, earW, 2);
		} else {
			ctx.fillRect(headX - 1, dy - bh, earW, 3);
			ctx.fillRect(headX + Math.floor(headW * 0.85), dy - bh, earW, 3);
		}
	} else if (mood === "restless") {
		// Twitchy -- alternating height
		const offset = Math.sin(performance.now() / 150) * 1.5;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, dy - bh - 3 + offset, earW, 3);
			ctx.fillRect(
				headX + Math.floor(headW * 0.8),
				dy - bh - 3 - offset,
				earW,
				3,
			);
		} else {
			ctx.fillRect(headX - 1, dy - bh - 1 + offset, earW, 4);
			ctx.fillRect(
				headX + Math.floor(headW * 0.85),
				dy - bh - 1 - offset,
				earW,
				4,
			);
		}
	} else {
		// Normal -- energy-based
		const earH = energy > 0.6 ? 4 : energy < 0.3 ? 2 : 3;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, dy - bh - earH, earW, earH);
			ctx.fillRect(headX + Math.floor(headW * 0.8), dy - bh - earH, earW, earH);
		} else {
			ctx.fillRect(headX - 1, dy - bh, earW, earH + 1);
			ctx.fillRect(headX + Math.floor(headW * 0.85), dy - bh, earW, earH + 1);
		}
	}
}

// ---- Dog tail (iso) ----

function drawIsoDogTail(
	ctx: Ctx,
	x: number,
	dy: number,
	bw: number,
	bh: number,
	dv: DogVariant,
	bodyC: string,
	mood: DogMoodState,
	energy: number,
): void {
	ctx.strokeStyle = bodyC;
	ctx.lineWidth = 1.5;
	const tailX = x + bw;
	const tailBaseY = dy - Math.floor(bh * 0.5);
	ctx.beginPath();
	ctx.moveTo(tailX, tailBaseY);

	if (mood === "disappointed") {
		ctx.lineTo(tailX + 4, tailBaseY + 4);
	} else if (mood === "excited") {
		const wag = Math.sin(performance.now() / 80) * 3;
		ctx.lineTo(tailX + 4, tailBaseY - bh - 3 + wag);
	} else if (mood === "happyForYou") {
		const wag = Math.sin(performance.now() / 150) * 2;
		ctx.lineTo(tailX + 4, tailBaseY - bh - 1 + wag);
	} else if (mood === "hopeful" || mood === "interested") {
		ctx.lineTo(tailX + 4, tailBaseY - bh - 3);
	} else if (mood === "sympathetic") {
		ctx.lineTo(tailX + 4, tailBaseY + 1);
	} else if (mood === "unimpressed") {
		ctx.lineTo(tailX + 4, tailBaseY + 2);
	} else if (mood === "restless") {
		const twitch = Math.sin(performance.now() / 120) * 2;
		ctx.lineTo(tailX + 4, tailBaseY - bh - 2 + twitch);
	} else {
		// Normal -- seed-based + energy
		if (dv.tailStyle === "up") {
			ctx.lineTo(tailX + 4, tailBaseY - bh - (energy > 0.5 ? 3 : 0));
		} else if (dv.tailStyle === "curl") {
			ctx.quadraticCurveTo(
				tailX + 5,
				tailBaseY - bh - 2,
				tailX + 3,
				tailBaseY - bh - (energy > 0.5 ? 5 : 2),
			);
		} else {
			ctx.lineTo(
				tailX + 4,
				tailBaseY - Math.floor(bh * 0.3) + (energy > 0.5 ? 0 : 2),
			);
		}
	}
	ctx.stroke();
}
