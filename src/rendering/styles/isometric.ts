/**
 * Isometric style renderer.
 * 3D boxes with parallelogram top faces, diamond floor tiles.
 * Closure-based coordinate transforms shared across draw methods.
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
	SeedPalette,
	TimePalette,
	WallDecorItem,
} from "../types";

type Ctx = CanvasRenderingContext2D;

/** Iso furniture scale factors (layout -> iso screen). */
const ISO_W = 0.8;
const ISO_H = 0.6;

/** Creates an isometric renderer with shared coordinate transform state. */
export function createIsometricRenderer(): RoomRenderer {
	let isoFloor = 0;
	let floorTop = 0;
	let roomHeight = 160;

	/** Remap layout Y to iso screen Y. */
	function toIsoY(ly: number): number {
		return (
			isoFloor +
			(ly - floorTop) * ((roomHeight - isoFloor) / (roomHeight - floorTop))
		);
	}

	return {
		drawRoom(ctx: Ctx, layout: RoomLayout, options: RoomDrawOptions): void {
			isoFloor = layout.wallY > 0 ? 48 : 0;
			floorTop = layout.floorTop;
			roomHeight = layout.roomHeight;
			drawIsoRoom(ctx, layout, options, isoFloor, toIsoY);
		},
		drawCharacter(
			ctx: Ctx,
			x: number,
			y: number,
			variants: CharacterVariant,
			timePalette: TimePalette,
			_animState: AnimationState | null,
		): void {
			drawIsoChar(ctx, x, toIsoY(y), variants, timePalette);
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
			drawIsoDog(ctx, x, toIsoY(y), variants, timePalette, mood, energy);
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
	const iF = wallY > 0 ? 48 : 0;
	const iy =
		iF + (rect.y - floorTop) * ((roomHeight - iF) / (roomHeight - floorTop));
	const ix = rect.x;
	const iw = rect.w * ISO_W;
	const ih = rect.h * ISO_H;
	const depth = 8;
	const pad = 3;

	ctx.fillStyle = fillColor;
	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = 1.5;

	ctx.beginPath();
	ctx.moveTo(ix - pad, iy + depth + pad);
	ctx.lineTo(ix + iw + pad, iy + depth + pad);
	ctx.lineTo(ix + iw + pad + ih * 0.4, iy + depth + pad - ih * 0.3);
	ctx.lineTo(ix + iw + pad + ih * 0.4, iy - pad - ih * 0.3);
	ctx.lineTo(ix + iw + ih * 0.4, iy - pad - ih * 0.3);
	ctx.lineTo(ix - pad + ih * 0.4, iy - pad - ih * 0.3);
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

/** Draw a diamond (rhombus) matching iso floor tile perspective. */
function isoDiamond(
	ctx: Ctx,
	cx: number,
	cy: number,
	hw: number,
	hh: number,
): void {
	ctx.beginPath();
	ctx.moveTo(cx - hw, cy);
	ctx.lineTo(cx, cy - hh);
	ctx.lineTo(cx + hw, cy);
	ctx.lineTo(cx, cy + hh);
	ctx.closePath();
}

// ---- Main room draw ----

function drawIsoRoom(
	ctx: Ctx,
	layout: RoomLayout,
	options: RoomDrawOptions,
	isoFloor: number,
	isoY: (ly: number) => number,
): void {
	const { timePalette, seedPalette, variants } = options;
	const { roomWidth, roomHeight, wallY, floorTop } = layout;

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
				(col + row) % 2 === 0 ? 0 : 0.05,
			);
			isoDiamond(ctx, ox + tileW / 2, oy + tileH / 2, tileW / 2, tileH / 2);
			ctx.fill();
			ctx.strokeStyle = darken(timePalette.floor, 0.1);
			ctx.lineWidth = 0.4;
			ctx.stroke();
		}
	}

	// Wall
	if (wallY > 0) {
		// Slight gradient for depth
		const wallGrad = ctx.createLinearGradient(0, 0, 0, isoFloor);
		wallGrad.addColorStop(0, lighten(timePalette.wall, 0.03));
		wallGrad.addColorStop(1, timePalette.wall);
		ctx.fillStyle = wallGrad;
		ctx.fillRect(0, 0, roomWidth, isoFloor);
		// Baseboard
		ctx.fillStyle = darken(timePalette.wall, 0.2);
		ctx.fillRect(0, isoFloor - 4, roomWidth, 4);
		ctx.fillStyle = darken(timePalette.wall, 0.1);
		ctx.fillRect(0, isoFloor - 5, roomWidth, 1);
	}

	// Wall decor (remap Y to fit compressed iso wall)
	if (wallY > 0) {
		drawIsoWallDecor(ctx, layout.wallDecor, seedPalette, isoFloor, wallY);
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
		const ix = f.x;
		const iy = isoY(f.y);
		const iw = f.w * ISO_W;
		const ih = f.h * ISO_H;
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
			case "door": {
				// Anchor door bottom at isoFloor, use ISO_H-scaled height
				const doorIy = isoFloor - ih;
				drawIsoDoor(ctx, ix, doorIy, iw, ih, c, variants.door, layout.doorSide);
				break;
			}
		}

		if (options.showLabels) {
			ctx.fillStyle = "#fff";
			ctx.font = "5px monospace";
			ctx.textAlign = "center";
			ctx.fillText(name, ix + iw / 2, iy + 6);
		}
	}

	// Floor decor as iso items
	drawIsoDecor(ctx, layout.decor, isoY, hue);

	applyTimeOverlay(ctx, timePalette, roomWidth, roomHeight);

	// Night glow from desk
	if (isNightPalette(timePalette)) {
		const desk = layout.furniture.desk;
		if (desk) {
			const gx = desk.x + 20;
			const gy = isoY(desk.y);
			const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 40);
			grd.addColorStop(0, "rgba(255,240,180,0.25)");
			grd.addColorStop(1, "rgba(255,240,180,0)");
			ctx.fillStyle = grd;
			ctx.fillRect(0, 0, roomWidth, roomHeight);
		}
	}
}

// ---- Wall decor (iso-native) ----

/** Draw wall-mounted decor items with iso-consistent depth shadows. */
function drawIsoWallDecor(
	ctx: Ctx,
	wallDecor: WallDecorItem[],
	seedPal: SeedPalette,
	isoFloor: number,
	wallY: number,
): void {
	const hue = seedPal.hueShiftDeg;
	// Wall decor coords target [0, wallY] but iso wall only extends to isoFloor
	const wallScale = wallY > 0 ? isoFloor / wallY : 1;
	for (const d of wallDecor) {
		ctx.save();
		const remappedY = d.y * wallScale;
		ctx.translate(d.x + d.w / 2, remappedY + d.h / 2);
		ctx.rotate(d.rot);
		const hw = d.w / 2;
		const hh = d.h / 2;

		// Shadow offset for wall-mounted depth
		const sx = 1.5;
		const sy = 1.5;

		switch (d.type) {
			case "poster": {
				const posterColor = hueShift("#cc5544", hue);
				// Shadow
				ctx.fillStyle = "rgba(0,0,0,0.12)";
				ctx.fillRect(-hw + sx, -hh + sy, d.w, d.h);
				// Background
				ctx.fillStyle = posterColor;
				ctx.fillRect(-hw, -hh, d.w, d.h);
				ctx.strokeStyle = darken(posterColor, 0.3);
				ctx.lineWidth = 0.8;
				ctx.strokeRect(-hw, -hh, d.w, d.h);
				// Header stripe
				ctx.fillStyle = lighten(posterColor, 0.3);
				ctx.fillRect(-hw + 2, -hh + 2, d.w - 4, d.h * 0.3);
				// Text lines
				ctx.fillStyle = darken(posterColor, 0.1);
				for (let ly = -hh + d.h * 0.45; ly < hh - 3; ly += 3) {
					ctx.fillRect(-hw + 3, ly, d.w * 0.7, 1.5);
				}
				break;
			}
			case "shelf": {
				const shelfColor = hueShift("#8b7355", hue);
				// Shelf as small iso box
				ctx.fillStyle = "rgba(0,0,0,0.1)";
				ctx.fillRect(-hw + sx, -hh + sy, d.w, d.h);
				ctx.fillStyle = shelfColor;
				ctx.fillRect(-hw, -hh, d.w, d.h);
				// Top face (parallelogram to match iso)
				ctx.fillStyle = lighten(shelfColor, 0.1);
				ctx.beginPath();
				ctx.moveTo(-hw, -hh);
				ctx.lineTo(-hw + 3, -hh - 2);
				ctx.lineTo(hw + 3, -hh - 2);
				ctx.lineTo(hw, -hh);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = darken(shelfColor, 0.3);
				ctx.lineWidth = 0.8;
				ctx.strokeRect(-hw, -hh, d.w, d.h);
				// Items on shelf
				ctx.fillStyle = hueShift("#44aa88", hue);
				ctx.fillRect(-hw + 2, -hh - 5, 4, 5);
				ctx.fillStyle = hueShift("#aa4488", hue);
				ctx.fillRect(-hw + 8, -hh - 7, 5, 7);
				ctx.fillStyle = "#ddd";
				ctx.fillRect(-hw + 15, -hh - 4, 3, 4);
				// Brackets
				ctx.fillStyle = darken(shelfColor, 0.2);
				ctx.fillRect(-hw + 3, 0, 2, 6);
				ctx.fillRect(hw - 5, 0, 2, 6);
				break;
			}
			case "clock": {
				// Shadow
				ctx.fillStyle = "rgba(0,0,0,0.1)";
				ctx.beginPath();
				ctx.arc(sx, sy, hw, 0, Math.PI * 2);
				ctx.fill();
				// Face
				ctx.fillStyle = "#ddd";
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "#777";
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.arc(0, 0, hw, 0, Math.PI * 2);
				ctx.stroke();
				// Hands
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
				// Center dot
				ctx.fillStyle = "#333";
				ctx.beginPath();
				ctx.arc(0, 0, 1, 0, Math.PI * 2);
				ctx.fill();
				break;
			}
			case "mirror": {
				// Shadow
				ctx.fillStyle = "rgba(0,0,0,0.1)";
				ctx.fillRect(-hw + sx, -hh + sy, d.w, d.h);
				// Glass
				ctx.fillStyle = "#b8c8d8";
				ctx.fillRect(-hw, -hh, d.w, d.h);
				// Frame
				ctx.strokeStyle = "#888";
				ctx.lineWidth = 1.2;
				ctx.strokeRect(-hw, -hh, d.w, d.h);
				// Highlight
				ctx.fillStyle = "rgba(255,255,255,0.3)";
				ctx.fillRect(-hw + 2, -hh + 2, 3, d.h - 4);
				break;
			}
			case "photo": {
				const frameColor = hueShift("#6b4423", hue);
				// Shadow
				ctx.fillStyle = "rgba(0,0,0,0.1)";
				ctx.fillRect(-hw + sx, -hh + sy, d.w, d.h);
				// Frame
				ctx.fillStyle = frameColor;
				ctx.fillRect(-hw, -hh, d.w, d.h);
				// Matte
				ctx.fillStyle = "#ddd";
				ctx.fillRect(-hw + 2, -hh + 2, d.w - 4, d.h - 4);
				// Sky area
				ctx.fillStyle = hueShift("#88bbdd", hue);
				ctx.fillRect(-hw + 3, -hh + 3, d.w - 6, (d.h - 6) * 0.6);
				// Ground area
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
				// Rail shadow
				ctx.fillStyle = "rgba(0,0,0,0.08)";
				ctx.fillRect(-hw + sx, -hh + sy, d.w, 3);
				// Rail
				ctx.fillStyle = darken("#8b7355", 0.1);
				ctx.fillRect(-hw, -hh, d.w, 3);
				// Hooks
				for (let hx = -hw + 3; hx < hw - 2; hx += 6) {
					ctx.fillStyle = "#999";
					ctx.fillRect(hx, -hh + 3, 2, 4);
					ctx.fillRect(hx - 1, -hh + 6, 4, 2);
				}
				break;
			}
			case "calendar": {
				// Shadow
				ctx.fillStyle = "rgba(0,0,0,0.1)";
				ctx.fillRect(-hw + sx, -hh + sy, d.w, d.h);
				// Background
				ctx.fillStyle = "#eee";
				ctx.fillRect(-hw, -hh, d.w, d.h);
				// Red header
				ctx.fillStyle = hueShift("#cc3333", hue);
				ctx.fillRect(-hw, -hh, d.w, 4);
				ctx.strokeStyle = "#999";
				ctx.lineWidth = 0.8;
				ctx.strokeRect(-hw, -hh, d.w, d.h);
				// Day grid
				ctx.fillStyle = "#888";
				for (let gx = -hw + 2; gx < hw - 1; gx += 3)
					for (let gy = -hh + 6; gy < hh - 1; gy += 3)
						ctx.fillRect(gx, gy, 1.5, 1.5);
				break;
			}
			case "plant_hanging": {
				const potColor = hueShift("#aa6644", hue);
				// String
				ctx.strokeStyle = "#888";
				ctx.lineWidth = 0.5;
				ctx.beginPath();
				ctx.moveTo(0, -hh);
				ctx.lineTo(0, -hh + 4);
				ctx.stroke();
				// Pot shadow
				ctx.fillStyle = "rgba(0,0,0,0.08)";
				ctx.fillRect(-4 + sx, -hh + 4 + sy, 8, 6);
				// Pot
				ctx.fillStyle = potColor;
				ctx.fillRect(-4, -hh + 4, 8, 6);
				// Trailing leaves
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
		// Diamond shadow
		ctx.fillStyle = "rgba(0,0,0,0.08)";
		isoDiamond(ctx, ix + iw / 2, iy + 4, iw / 2 + 2, 4);
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
		// Shadow
		ctx.fillStyle = "rgba(0,0,0,0.1)";
		ctx.fillRect(mirX + 1.5, mirY + 1.5, 12, 14);
		ctx.fillStyle = "#c8d8e8";
		ctx.fillRect(mirX, mirY, 12, 14);
		ctx.strokeStyle = "#999";
		ctx.lineWidth = 0.8;
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
	doorSide: "left" | "right",
): void {
	const thick = 5; // iso thickness (door is thin)
	// Frame
	isoBox(ctx, ix - 1, iy - 1, iw + 2, thick + 1, ih + 2, darken(c, 0.15));
	// Panel
	isoBox(ctx, ix, iy, iw, thick, ih, c);
	// Handle at ~60% down
	const handleX = doorSide === "left" ? ix + iw - 5 : ix + 3;
	ctx.fillStyle = "#d4a040";
	ctx.fillRect(handleX, iy + Math.floor(ih * 0.6), 2, 3);
	// Window in upper portion
	if (v.hasWindow) {
		const winY = iy + Math.floor(ih * 0.15);
		const winH = Math.floor(ih * 0.2);
		ctx.fillStyle = lighten(c, 0.3);
		ctx.fillRect(ix + iw * 0.2, winY, iw * 0.6, winH);
		ctx.strokeStyle = darken(c, 0.3);
		ctx.lineWidth = 0.5;
		ctx.strokeRect(ix + iw * 0.2, winY, iw * 0.6, winH);
	}
}

// ---- Floor decor as iso items ----

function drawIsoDecor(
	ctx: Ctx,
	decor: FloorDecorItem[],
	isoY: (ly: number) => number,
	hue: number,
): void {
	for (const d of decor) {
		const s = d.size;
		const sx = d.x;
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

/** Draw character as a 3/4 overhead iso figure. */
function drawIsoChar(
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
	const hw = Math.floor(cv.buildW * 0.45);
	const bh = Math.floor(cv.height * 1.2);
	const legH = Math.floor(bh * 0.3);
	const torsoDepth = Math.floor(bh * 0.45);
	const headR = 5;

	// Diamond shadow (2:1 ratio matching floor tiles)
	ctx.fillStyle = "rgba(0,0,0,0.1)";
	isoDiamond(ctx, x, y + 2, hw + 4, Math.floor((hw + 4) / 2));
	ctx.fill();

	// Shoes
	ctx.fillStyle = shoeC;
	ctx.fillRect(x - hw, y - 2, hw - 1, 2);
	ctx.fillRect(x + 2, y - 2, hw - 1, 2);

	// Legs (two columns, slight iso spread)
	ctx.fillStyle = pantsC;
	const legW = Math.max(2, hw - 1);
	ctx.fillRect(x - hw, y - legH, legW, legH - 2);
	ctx.fillRect(x + 2, y - legH, legW, legH - 2);

	// Torso (manual faces so front face uses the actual shirt color)
	const torsoY = y - legH;
	const torsoX = x - hw;
	const torsoW = hw * 2;
	const isoDepth = Math.floor(hw * 0.8);
	// Front face -- the dominant visible area at this scale
	ctx.fillStyle = topC;
	ctx.fillRect(torsoX, torsoY - torsoDepth, torsoW, torsoDepth);
	// Top face (parallelogram)
	ctx.fillStyle = lighten(topC, 0.1);
	ctx.beginPath();
	ctx.moveTo(torsoX, torsoY - torsoDepth);
	ctx.lineTo(torsoX + isoDepth * 0.4, torsoY - torsoDepth - isoDepth * 0.3);
	ctx.lineTo(
		torsoX + torsoW + isoDepth * 0.4,
		torsoY - torsoDepth - isoDepth * 0.3,
	);
	ctx.lineTo(torsoX + torsoW, torsoY - torsoDepth);
	ctx.closePath();
	ctx.fill();
	// Right face
	ctx.fillStyle = darken(topC, 0.15);
	ctx.beginPath();
	ctx.moveTo(torsoX + torsoW, torsoY - torsoDepth);
	ctx.lineTo(
		torsoX + torsoW + isoDepth * 0.4,
		torsoY - torsoDepth - isoDepth * 0.3,
	);
	ctx.lineTo(torsoX + torsoW + isoDepth * 0.4, torsoY - isoDepth * 0.3);
	ctx.lineTo(torsoX + torsoW, torsoY);
	ctx.closePath();
	ctx.fill();

	// Arms
	const armW = cv.build === "stocky" ? 3 : 2;
	const armLen = Math.floor(torsoDepth * 0.65);
	ctx.fillStyle = topC;
	ctx.fillRect(x - hw - armW, torsoY - torsoDepth + 2, armW, armLen);
	ctx.fillRect(x + hw, torsoY - torsoDepth + 2, armW, armLen);
	// Hands
	ctx.fillStyle = skin;
	ctx.fillRect(x - hw - armW, torsoY - torsoDepth + 2 + armLen, armW, 2);
	ctx.fillRect(x + hw, torsoY - torsoDepth + 2 + armLen, armW, 2);

	// Head
	const headY = torsoY - torsoDepth - headR - 1;
	ctx.fillStyle = skin;
	ctx.beginPath();
	ctx.arc(x, headY, headR, 0, Math.PI * 2);
	ctx.fill();

	// Eyes
	ctx.fillStyle = "#333";
	ctx.fillRect(x - 2, headY - 1, 1, 1);
	ctx.fillRect(x + 1, headY - 1, 1, 1);

	// Hair
	const hairC = night ? darken(cv.hairColor, 0.2) : cv.hairColor;
	ctx.fillStyle = hairC;
	switch (cv.hairStyle) {
		case "curly":
			ctx.beginPath();
			ctx.arc(x, headY - 1, headR + 1.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = skin;
			ctx.beginPath();
			ctx.arc(x, headY + 1, headR - 0.5, 0, Math.PI);
			ctx.fill();
			break;
		case "bun":
			ctx.beginPath();
			ctx.arc(x, headY - 2, headR, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.beginPath();
			ctx.arc(x, headY - headR - 2, 2.5, 0, Math.PI * 2);
			ctx.fill();
			break;
		case "long":
			ctx.beginPath();
			ctx.arc(x, headY - 1, headR + 0.5, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.fillRect(x - headR - 1, headY, 2, 8);
			ctx.fillRect(x + headR - 1, headY, 2, 8);
			break;
		case "ponytail":
			ctx.beginPath();
			ctx.arc(x, headY - 1, headR, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.fillRect(x + headR - 1, headY + 1, 2, 2);
			ctx.fillRect(x + headR, headY + 3, 2, 4);
			break;
		case "shaved":
			ctx.fillStyle = darken(skin, 0.08);
			ctx.beginPath();
			ctx.arc(x, headY - 1, headR - 0.5, Math.PI, Math.PI * 2);
			ctx.fill();
			break;
		case "buzz":
			ctx.beginPath();
			ctx.arc(x, headY - 1, headR, Math.PI, Math.PI * 2);
			ctx.fill();
			break;
		default:
			// short
			ctx.beginPath();
			ctx.arc(x, headY - 1, headR, Math.PI, Math.PI * 2);
			ctx.fill();
			ctx.fillRect(x - headR, headY - 1, 2, 3);
			break;
	}
}

// ---- Dog ----

/** Draw dog as an iso figure with legs and mood-reactive features. */
function drawIsoDog(
	ctx: Ctx,
	x: number,
	y: number,
	dv: DogVariant,
	palette: TimePalette,
	mood: DogMoodState,
	energy: number,
): void {
	const night = isNightPalette(palette);
	const bw = Math.floor(dv.bodyW * 0.85);
	const bh = Math.floor(dv.bodyH * 0.65);
	const legH = Math.max(3, Math.floor(bh * 0.35));

	let bodyC = night ? darken(dv.bodyColor, 0.2) : dv.bodyColor;
	const earC = night ? darken(dv.earColor, 0.2) : dv.earColor;
	if (mood === "disappointed") {
		bodyC = darken(bodyC, 0.15);
	} else if (mood === "normal" && energy < 0.3) {
		bodyC = darken(bodyC, 0.08);
	}

	// Diamond shadow
	ctx.fillStyle = "rgba(0,0,0,0.08)";
	isoDiamond(ctx, x + bw / 2, y + 2, bw / 2 + 3, Math.floor(bw / 4) + 2);
	ctx.fill();

	// Legs (4 columns below body)
	ctx.fillStyle = darken(bodyC, 0.1);
	const lw = Math.max(2, Math.floor(bw * 0.13));
	// Back legs
	ctx.fillRect(x + 1, y - legH, lw, legH);
	ctx.fillRect(x + lw + 2, y - legH, lw, legH);
	// Front legs
	ctx.fillRect(x + bw - lw * 2 - 2, y - legH, lw, legH);
	ctx.fillRect(x + bw - lw - 1, y - legH, lw, legH);

	// Body box (raised above legs)
	const bodyY = y - legH;
	isoBox(ctx, x, bodyY - bh, bw, bh * 0.6, bh, bodyC);

	// Spots
	if (dv.hasSpots) {
		ctx.fillStyle = night ? darken(dv.spotColor, 0.2) : dv.spotColor;
		ctx.fillRect(x + Math.floor(bw * 0.3), bodyY - bh + 2, 2, 2);
		ctx.fillRect(x + Math.floor(bw * 0.6), bodyY - bh + 3, 2, 1);
	}

	// Head box
	const headX = x - Math.floor(bw * 0.3);
	const headW = Math.floor(bw * 0.45);
	const headH = bh * 0.4;
	const headDepth = Math.floor(bh * 0.8);
	isoBox(
		ctx,
		headX,
		bodyY - bh - 1,
		headW,
		headH,
		headDepth,
		darken(bodyC, 0.05),
	);

	// Ears -- mood-reactive
	ctx.fillStyle = earC;
	drawIsoDogEars(ctx, headX, headW, bodyY, bh, dv, mood, energy);

	// Eyes -- mood-reactive
	ctx.fillStyle = "#333";
	const eyeY = bodyY - bh + 1;
	if (mood === "disappointed") {
		ctx.fillRect(headX + 2, eyeY + 1, 1.5, 0.5);
		ctx.fillRect(headX + Math.floor(bw * 0.3), eyeY + 1, 1.5, 0.5);
	} else if (mood === "normal" && energy < 0.25) {
		ctx.fillRect(headX + 2, eyeY + 1, 1, 0.5);
		ctx.fillRect(headX + Math.floor(bw * 0.3), eyeY + 1, 1, 0.5);
	} else {
		ctx.fillRect(headX + 2, eyeY, 1.5, 1.5);
		ctx.fillRect(headX + Math.floor(bw * 0.3), eyeY, 1.5, 1.5);
	}

	// Nose
	ctx.fillStyle = dv.noseColor;
	ctx.fillRect(headX + Math.floor(bw * 0.18), bodyY - bh + 3, 1.5, 1.5);

	// Tail -- mood-reactive
	drawIsoDogTail(ctx, x, bodyY, bw, bh, dv, bodyC, mood, energy);
}

// ---- Dog ears (iso) ----

function drawIsoDogEars(
	ctx: Ctx,
	headX: number,
	headW: number,
	bodyY: number,
	bh: number,
	dv: DogVariant,
	mood: DogMoodState,
	energy: number,
): void {
	const earW = 2;

	if (mood === "disappointed") {
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, bodyY - bh, earW, 2);
			ctx.fillRect(headX + Math.floor(headW * 0.8), bodyY - bh, earW, 2);
		} else {
			ctx.fillRect(headX - 1, bodyY - bh + 1, earW, 3);
			ctx.fillRect(headX + Math.floor(headW * 0.85), bodyY - bh + 1, earW, 3);
		}
	} else if (
		mood === "excited" ||
		mood === "happyForYou" ||
		mood === "hopeful" ||
		mood === "interested"
	) {
		const h = mood === "excited" ? 5 : 4;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, bodyY - bh - h, earW, h);
			ctx.fillRect(headX + Math.floor(headW * 0.8), bodyY - bh - h, earW, h);
		} else {
			ctx.fillRect(headX - 1, bodyY - bh - 2, earW, 5);
			ctx.fillRect(headX + Math.floor(headW * 0.85), bodyY - bh - 2, earW, 5);
		}
	} else if (mood === "unimpressed" || mood === "sympathetic") {
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, bodyY - bh - 2, earW, 2);
			ctx.fillRect(headX + Math.floor(headW * 0.8), bodyY - bh - 2, earW, 2);
		} else {
			ctx.fillRect(headX - 1, bodyY - bh, earW, 3);
			ctx.fillRect(headX + Math.floor(headW * 0.85), bodyY - bh, earW, 3);
		}
	} else if (mood === "restless") {
		const offset = Math.sin(performance.now() / 150) * 1.5;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, bodyY - bh - 3 + offset, earW, 3);
			ctx.fillRect(
				headX + Math.floor(headW * 0.8),
				bodyY - bh - 3 - offset,
				earW,
				3,
			);
		} else {
			ctx.fillRect(headX - 1, bodyY - bh - 1 + offset, earW, 4);
			ctx.fillRect(
				headX + Math.floor(headW * 0.85),
				bodyY - bh - 1 - offset,
				earW,
				4,
			);
		}
	} else {
		const earH = energy > 0.6 ? 4 : energy < 0.3 ? 2 : 3;
		if (dv.earStyle === "pointed") {
			ctx.fillRect(headX, bodyY - bh - earH, earW, earH);
			ctx.fillRect(
				headX + Math.floor(headW * 0.8),
				bodyY - bh - earH,
				earW,
				earH,
			);
		} else {
			ctx.fillRect(headX - 1, bodyY - bh, earW, earH + 1);
			ctx.fillRect(
				headX + Math.floor(headW * 0.85),
				bodyY - bh,
				earW,
				earH + 1,
			);
		}
	}
}

// ---- Dog tail (iso) ----

function drawIsoDogTail(
	ctx: Ctx,
	x: number,
	bodyY: number,
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
	const tailBaseY = bodyY - Math.floor(bh * 0.5);
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
