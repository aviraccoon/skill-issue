/**
 * Time-of-day color palettes and overlay effects.
 */

import { darken, hueShift, lighten } from "./color";
import type { RoomLayout, ThemeColors, TimePalette } from "./types";

/** Default theme colors (used when CSS vars aren't available). */
const DEFAULT_THEME: ThemeColors = {
	floor: "#e8e4d9",
	wall: "#d4cfc4",
	highlight: "rgba(94, 106, 210, 0.15)",
	highlightBorder: "rgba(94, 106, 210, 0.4)",
};

/**
 * Builds a time-of-day palette from theme base colors.
 * Time modifies the theme colors rather than replacing them.
 */
export function buildTimePalette(
	timeBlock: string,
	inExtendedNight: boolean,
	theme: ThemeColors = DEFAULT_THEME,
): TimePalette {
	if (inExtendedNight) {
		return {
			wall: darken(hueShift(theme.wall, 20), 0.8),
			floor: darken(hueShift(theme.floor, 20), 0.8),
			sky: "#060518",
			tint: [60, 60, 160, 0.18],
			night: true,
		};
	}
	switch (timeBlock) {
		case "morning":
			return {
				wall: lighten(theme.wall, 0.05),
				floor: lighten(theme.floor, 0.05),
				sky: "#87ceeb",
				tint: [255, 248, 230, 0.08],
				night: false,
			};
		case "afternoon":
			return {
				wall: theme.wall,
				floor: theme.floor,
				sky: "#a8c8e8",
				tint: [180, 180, 160, 0.06],
				night: false,
			};
		case "evening":
			return {
				wall: hueShift(darken(theme.wall, 0.05), 15),
				floor: hueShift(darken(theme.floor, 0.05), 15),
				sky: "#d4886a",
				tint: [255, 180, 100, 0.12],
				night: false,
			};
		case "night":
			return {
				wall: darken(hueShift(theme.wall, 20), 0.85),
				floor: darken(hueShift(theme.floor, 20), 0.85),
				sky: "#0a0820",
				tint: [80, 80, 180, 0.15],
				night: true,
			};
		default:
			return {
				wall: theme.wall,
				floor: theme.floor,
				sky: "#87ceeb",
				tint: [255, 248, 230, 0.08],
				night: false,
			};
	}
}

/** Applies a time-of-day color overlay. */
export function applyTimeOverlay(
	ctx: CanvasRenderingContext2D,
	palette: TimePalette,
	width: number,
	height: number,
): void {
	const [tr, tg, tb, ta] = palette.tint;
	ctx.fillStyle = `rgba(${tr},${tg},${tb},${ta})`;
	ctx.fillRect(0, 0, width, height);
}

/** Applies a night glow effect around the desk (monitor light). */
export function applyNightGlow(
	ctx: CanvasRenderingContext2D,
	layout: RoomLayout,
	palette: TimePalette,
	width: number,
	height: number,
): void {
	if (!isNightPalette(palette)) return;
	const desk = layout.furniture.desk;
	if (!desk) return;
	const grd = ctx.createRadialGradient(
		desk.x + 18,
		desk.y + 8,
		2,
		desk.x + 18,
		desk.y + 8,
		45,
	);
	grd.addColorStop(0, "rgba(255,240,180,0.2)");
	grd.addColorStop(1, "rgba(255,240,180,0)");
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, width, height);
}

/** Whether a palette represents a night scene. */
export function isNightPalette(palette: TimePalette): boolean {
	return palette.night;
}
