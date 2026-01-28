/**
 * Color utilities for room rendering.
 * Ported from the art direction mockup.
 */

/** Parses a hex color to [r, g, b] tuple. */
export function hexToRgb(hex: string): [number, number, number] {
	return [
		Number.parseInt(hex.slice(1, 3), 16),
		Number.parseInt(hex.slice(3, 5), 16),
		Number.parseInt(hex.slice(5, 7), 16),
	];
}

/** Converts r, g, b values to hex string. */
export function rgbToHex(r: number, g: number, b: number): string {
	return `#${[r, g, b]
		.map((c) =>
			Math.max(0, Math.min(255, Math.round(c)))
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;
}

/** Darkens a hex color by factor (0-1). */
export function darken(hex: string, f: number): string {
	const [r, g, b] = hexToRgb(hex);
	return rgbToHex(r * (1 - f), g * (1 - f), b * (1 - f));
}

/** Lightens a hex color by factor (0-1). */
export function lighten(hex: string, f: number): string {
	const [r, g, b] = hexToRgb(hex);
	return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

/** Shifts the hue of a hex color by degrees. */
export function hueShift(hex: string, degrees: number): string {
	const rgb = hexToRgb(hex);
	let r = rgb[0] / 255;
	let g = rgb[1] / 255;
	let b = rgb[2] / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h: number;
	let s: number;
	const l = (max + min) / 2;

	if (max === min) {
		h = 0;
		s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
		else if (max === g) h = ((b - r) / d + 2) / 6;
		else h = ((r - g) / d + 4) / 6;
	}

	h = (h + degrees / 360) % 1;
	if (h < 0) h += 1;

	function hue2rgb(p: number, q: number, t: number): number {
		let tt = t;
		if (tt < 0) tt += 1;
		if (tt > 1) tt -= 1;
		if (tt < 1 / 6) return p + (q - p) * 6 * tt;
		if (tt < 1 / 2) return q;
		if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
		return p;
	}

	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return rgbToHex(r * 255, g * 255, b * 255);
}

/** Default furniture highlight: rounded outline + subtle fill around a rect. */
export function drawFurnitureHighlight(
	ctx: CanvasRenderingContext2D,
	rect: { x: number; y: number; w: number; h: number },
	fillColor = "rgba(94, 106, 210, 0.12)",
	strokeColor = "rgba(94, 106, 210, 0.5)",
): void {
	const pad = 3;
	const x = rect.x - pad;
	const y = rect.y - pad;
	const w = rect.w + pad * 2;
	const h = rect.h + pad * 2;

	ctx.fillStyle = fillColor;
	roundRect(ctx, x, y, w, h, 4);
	ctx.fill();

	ctx.strokeStyle = strokeColor;
	ctx.lineWidth = 1.5;
	roundRect(ctx, x, y, w, h, 4);
	ctx.stroke();
}

/** Draws a rounded rectangle path (does not fill or stroke). */
export function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
): void {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}
