/**
 * Checks that buildTimePalette produces correct night detection
 * for all themes across all time blocks.
 *
 * Parses theme colors directly from CSS files so it stays in sync.
 *
 * Run: bun scripts/check-theme-luminance.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hexToRgb } from "../src/rendering/color";
import { buildTimePalette, isNightPalette } from "../src/rendering/palettes";
import type { ThemeColors } from "../src/rendering/types";

const ROOT = join(import.meta.dir, "..");

/** Extracts --game-area-* values from a CSS block. */
function extractGameAreaColors(css: string): Partial<ThemeColors> {
	const get = (prop: string): string | undefined => {
		const re = new RegExp(`--game-area-${prop}:\\s*([^;]+);`);
		const m = css.match(re);
		return m?.[1]?.trim();
	};
	const result: Partial<ThemeColors> = {};
	const floor = get("floor");
	const wall = get("wall");
	const highlight = get("highlight");
	const highlightBorder = get("highlight-border");
	if (floor) result.floor = floor;
	if (wall) result.wall = wall;
	if (highlight) result.highlight = highlight;
	if (highlightBorder) result.highlightBorder = highlightBorder;
	return result;
}

/** Parses all themes from base.css and themes.css. */
function parseThemes(): Record<string, ThemeColors> {
	const baseCss = readFileSync(join(ROOT, "src/styles/base.css"), "utf-8");
	const themesCss = readFileSync(join(ROOT, "src/styles/themes.css"), "utf-8");

	// Extract :root defaults
	const rootMatch = baseCss.match(/:root\s*\{([^}]+)\}/s);
	const rootBlock = rootMatch?.[1] ?? "";
	const rootColors = extractGameAreaColors(rootBlock);
	const defaultTheme: ThemeColors = {
		floor: rootColors.floor ?? "#e8e4d9",
		wall: rootColors.wall ?? "#d4cfc4",
		highlight: rootColors.highlight ?? "rgba(94, 106, 210, 0.15)",
		highlightBorder: rootColors.highlightBorder ?? "rgba(94, 106, 210, 0.4)",
	};

	const themes: Record<string, ThemeColors> = { default: defaultTheme };

	// Extract each [data-theme="..."] block
	const themeRe = /\[data-theme="(\w+)"\]\s*\{([^}]+)\}/gs;
	let match: RegExpExecArray | null;
	while (true) {
		match = themeRe.exec(themesCss);
		if (!match) break;
		const name = match[1];
		const block = match[2];
		if (!name || !block) continue;
		const colors = extractGameAreaColors(block);
		themes[name] = {
			floor: colors.floor ?? defaultTheme.floor,
			wall: colors.wall ?? defaultTheme.wall,
			highlight: colors.highlight ?? defaultTheme.highlight,
			highlightBorder: colors.highlightBorder ?? defaultTheme.highlightBorder,
		};
	}

	return themes;
}

// ---

const themes = parseThemes();
const TIME_BLOCKS = ["morning", "afternoon", "evening", "night"];

function luminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex);
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

console.log(`Parsed ${Object.keys(themes).length} themes from CSS\n`);
console.log("Theme Luminance Report");
console.log("=".repeat(90));
console.log(
	"Theme".padEnd(10),
	"TimeBlock".padEnd(12),
	"Wall".padEnd(10),
	"Floor".padEnd(10),
	"Wall Lum".padEnd(10),
	"Floor Lum".padEnd(10),
	"Night?",
);
console.log("-".repeat(90));

let errors = 0;

for (const [name, theme] of Object.entries(themes)) {
	for (const timeBlock of TIME_BLOCKS) {
		const palette = buildTimePalette(timeBlock, false, theme);
		const wallLum = luminance(palette.wall);
		const floorLum = luminance(palette.floor);
		const night = isNightPalette(palette);

		const expectNight = timeBlock === "night";
		const ok = night === expectNight;
		const marker = ok ? "" : " *** WRONG ***";

		if (!ok) errors++;

		console.log(
			name.padEnd(10),
			timeBlock.padEnd(12),
			palette.wall.padEnd(10),
			palette.floor.padEnd(10),
			wallLum.toFixed(4).padEnd(10),
			floorLum.toFixed(4).padEnd(10),
			`${night}${marker}`,
		);
	}

	// Also check extended night
	const lateNight = buildTimePalette("night", true, theme);
	const lnWallLum = luminance(lateNight.wall);
	const lnFloorLum = luminance(lateNight.floor);
	const lnNight = isNightPalette(lateNight);
	const lnOk = lnNight === true;
	if (!lnOk) errors++;

	console.log(
		name.padEnd(10),
		"latenight".padEnd(12),
		lateNight.wall.padEnd(10),
		lateNight.floor.padEnd(10),
		lnWallLum.toFixed(4).padEnd(10),
		lnFloorLum.toFixed(4).padEnd(10),
		`${lnNight}${lnOk ? "" : " *** WRONG ***"}`,
	);

	console.log("");
}

console.log("=".repeat(90));
if (errors > 0) {
	console.log(`FAILED: ${errors} incorrect night detection(s)`);
	process.exit(1);
} else {
	console.log("All themes pass night detection correctly.");
}
