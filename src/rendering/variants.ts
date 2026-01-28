/**
 * Seed-based item variant generation.
 * Determines appearance details for all furniture, character, and dog.
 */

import { darken, hueShift } from "./color";
import type { ItemVariants, SeedPalette } from "./types";

/** Base furniture colors (before seed hue shift). */
const BASE_FURNITURE_COLORS: Record<string, string> = {
	bed: "#4a6fa5",
	desk: "#8b7355",
	couch: "#5d8a5d",
	kitchen: "#c9a959",
	bathroom: "#889898",
	door: "#6b4423",
};

/** Generates a seed-based color palette by hue-shifting base colors. */
export function getSeedPalette(rng: () => number): SeedPalette {
	const hueShiftDeg = rng() * 360;
	const colors: Record<string, string> = {};
	for (const [name, base] of Object.entries(BASE_FURNITURE_COLORS)) {
		colors[name] = hueShift(base, hueShiftDeg);
	}
	return { colors, hueShiftDeg };
}

/** Picks one from an array using RNG. */
function pick<T>(rng: () => number, arr: readonly T[]): T {
	return arr[Math.floor(rng() * arr.length)] as T;
}

/** Generates all item variants from seed RNG. */
export function getItemVariants(rng: () => number): ItemVariants {
	const skinTones = [
		"#e8a87c",
		"#d4956a",
		"#c27e4f",
		"#a0623a",
		"#7b4a2d",
		"#5c3820",
		"#f0c8a0",
		"#dbb08c",
	] as const;
	const hairColors = [
		"#4a3020",
		"#2a1a10",
		"#1a1a1a",
		"#8b6914",
		"#cc8833",
		"#aa4422",
		"#888888",
		"#ddc89a",
	] as const;
	const hairStyles = [
		"short",
		"buzz",
		"long",
		"ponytail",
		"bun",
		"curly",
		"shaved",
	] as const;
	const coatColors = [
		"#d4a574",
		"#8b6914",
		"#3a2a1a",
		"#e8d8c8",
		"#c87040",
		"#a09080",
		"#ddc89a",
		"#6b4423",
	] as const;
	const earColors = [
		"#8b6914",
		"#5a3a10",
		"#1a1a1a",
		"#c8b098",
		"#985830",
		"#706050",
		"#bbaa80",
		"#4a2a10",
	] as const;

	const height = 12 + Math.floor(rng() * 6);
	const buildOptions = ["thin", "medium", "stocky"] as const;
	const build = pick(rng, buildOptions);
	const buildW = build === "thin" ? 8 : build === "medium" ? 10 : 12;

	const coatIdx = Math.floor(rng() * coatColors.length);
	const dogSize = pick(rng, ["small", "medium", "large"] as const);

	return {
		bed: {
			style: pick(rng, ["single", "double", "futon", "bunk"] as const),
			blanketPattern: pick(rng, ["solid", "striped", "plaid", "dots"] as const),
			pillowCount: 1 + Math.floor(rng() * 3),
			messy: rng() < 0.35,
		},
		desk: {
			monitor: pick(rng, ["laptop", "desktop", "dual", "none"] as const),
			messy: rng() < 0.4,
			hasLamp: rng() < 0.5,
			hasPlant: rng() < 0.3,
			hasShelf: rng() < 0.5,
		},
		couch: {
			style: pick(rng, ["sofa", "loveseat", "sectional", "beanbag"] as const),
			cushions: 2 + Math.floor(rng() * 3),
			hasBlanket: rng() < 0.4,
		},
		kitchen: {
			style: pick(rng, ["stove", "counter", "mini", "full"] as const),
			hasMug: rng() < 0.5,
			hasPot: rng() < 0.4,
			dirty: rng() < 0.3,
			hasCabinets: rng() < 0.7,
		},
		bathroom: {
			style: pick(rng, ["tub", "shower", "combo", "minimal"] as const),
			hasMat: rng() < 0.5,
			hasTowel: rng() < 0.6,
			hasMirror: rng() < 0.7,
		},
		door: {
			style: pick(rng, ["plain", "panel", "arch", "dutch"] as const),
			hasWindow: rng() < 0.3,
			hasMat: rng() < 0.5,
		},
		character: {
			skin: pick(rng, skinTones),
			hairColor: pick(rng, hairColors),
			hairStyle: pick(rng, hairStyles),
			height,
			build,
			buildW,
			topColor: `hsl(${Math.floor(rng() * 360)}, ${30 + Math.floor(rng() * 40)}%, ${35 + Math.floor(rng() * 25)}%)`,
			pantsColor: `hsl(${Math.floor(rng() * 360)}, ${10 + Math.floor(rng() * 30)}%, ${25 + Math.floor(rng() * 20)}%)`,
			shoeColor: `hsl(${Math.floor(rng() * 360)}, ${5 + Math.floor(rng() * 15)}%, ${20 + Math.floor(rng() * 15)}%)`,
		},
		dog: {
			bodyColor: coatColors[coatIdx] as string,
			earColor: earColors[Math.min(coatIdx, earColors.length - 1)] as string,
			size: dogSize,
			bodyW: dogSize === "small" ? 12 : dogSize === "medium" ? 16 : 20,
			bodyH: dogSize === "small" ? 8 : dogSize === "medium" ? 10 : 12,
			earStyle: rng() < 0.5 ? "pointed" : "floppy",
			tailStyle: pick(rng, ["up", "curl", "down"] as const),
			hasSpots: rng() < 0.2,
			spotColor: darken(coatColors[coatIdx] as string, 0.2),
			noseColor: rng() < 0.3 ? "#8b4513" : "#333",
		},
	};
}
