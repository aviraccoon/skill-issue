/**
 * Visual playground for previewing all art styles, seeds, and rendering options.
 * Accessible at #playground. Uses the actual rendering pipeline.
 */

import { ROOM_SCALE } from "../data/roomLayout";
import { TIME_BLOCKS } from "../data/timeBlocks";
import { FURNITURE_DEFS, generateSingleRoomLayout } from "../rendering/layout";
import { buildTimePalette } from "../rendering/palettes";
import { ART_STYLES, getRenderer, pickArtStyle } from "../rendering/styles";
import type {
	ArtStyleId,
	DogMoodState,
	FurnitureName,
	RoomLayout,
	ThemeColors,
} from "../rendering/types";
import { getItemVariants, getSeedPalette } from "../rendering/variants";
import { mulberry32 } from "../utils/random";
import { renderGameArea } from "./GameArea";

/** Time blocks plus extended night (not a real time block, but a rendering mode). */
const PLAYGROUND_TIME_BLOCKS = [...TIME_BLOCKS, "extendedNight"] as const;

/** All dog mood states. */
const DOG_MOODS: DogMoodState[] = [
	"normal",
	"excited",
	"disappointed",
	"hopeful",
	"happyForYou",
	"sympathetic",
	"unimpressed",
	"interested",
	"restless",
];

/** Furniture names derived from layout definitions. */
const FURNITURE_NAMES = Object.keys(FURNITURE_DEFS) as FurnitureName[];

/** Read theme colors from CSS variables (or use defaults). */
function getThemeColors(): ThemeColors {
	const style = getComputedStyle(document.documentElement);
	return {
		floor: style.getPropertyValue("--game-area-floor").trim() || "#e8e4d9",
		wall: style.getPropertyValue("--game-area-wall").trim() || "#d4cfc4",
		highlight:
			style.getPropertyValue("--game-area-highlight").trim() ||
			"rgba(94, 106, 210, 0.15)",
		highlightBorder: "rgba(94, 106, 210, 0.4)",
	};
}

interface PlaygroundState {
	seed: number;
	timeBlock: (typeof PLAYGROUND_TIME_BLOCKS)[number];
	highlightFurniture: FurnitureName | "none";
	dogMood: DogMoodState;
	dogEnergy: number;
	layout: RoomLayout;
}

/** Try to read the current run seed from localStorage. */
function getSavedSeed(): number | null {
	try {
		const raw = localStorage.getItem("skill-issue-save");
		if (!raw) return null;
		const data = JSON.parse(raw);
		return data?.runs?.main?.runSeed ?? data?.runs?.seeded?.runSeed ?? null;
	} catch {
		return null;
	}
}

/** Creates and mounts the rendering playground. */
export function mountPlayground(container: HTMLElement): void {
	const initialSeed = getSavedSeed() ?? Math.floor(Math.random() * 100000);

	const state: PlaygroundState = {
		seed: initialSeed,
		timeBlock: "afternoon",
		highlightFurniture: "none",
		dogMood: "normal",
		dogEnergy: 0.6,
		layout: generateSingleRoomLayout(mulberry32(initialSeed)),
	};

	container.replaceChildren();
	container.style.cssText =
		"max-width: none; margin: 0; padding: 1rem; font-family: var(--font, system-ui); color: var(--fg, #222);";

	// Header + back link
	const header = document.createElement("div");
	header.style.cssText =
		"display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem;";
	const title = document.createElement("h1");
	title.textContent = "Rendering Playground";
	title.style.cssText = "margin: 0; font-size: 1.1rem;";
	const backLink = document.createElement("a");
	backLink.textContent = "Back to game";
	backLink.href = location.pathname + location.search;
	backLink.style.cssText = "font-size: 0.8rem; color: var(--accent, #5566dd);";
	header.appendChild(title);
	header.appendChild(backLink);
	container.appendChild(header);

	// Two-column layout: controls | canvases
	// Mobile: stacked (controls on top)
	const columns = document.createElement("div");
	columns.style.cssText =
		"display: flex; flex-wrap: wrap; gap: 1rem; align-items: start;";
	container.appendChild(columns);

	// -- Controls column --
	const sidebar = document.createElement("div");
	sidebar.style.cssText = "min-width: 180px; max-width: 220px; flex-shrink: 0;";

	// Control helpers
	const inputStyle =
		"width: 100%; padding: 0.25rem 0.4rem; border: 1px solid var(--border, #ccc); border-radius: 3px; font-size: 0.8rem; background: var(--bg, #fff); color: var(--fg, #222); box-sizing: border-box;";

	function createControl(
		labelText: string,
		input: HTMLElement,
	): HTMLDivElement {
		const div = document.createElement("div");
		div.style.cssText = "margin-bottom: 0.5rem;";
		const lbl = document.createElement("label");
		lbl.textContent = labelText;
		lbl.style.cssText =
			"display: block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted, #666); margin-bottom: 0.15rem;";
		div.appendChild(lbl);
		div.appendChild(input);
		return div;
	}

	function createSelect(
		options: readonly string[],
		value: string,
	): HTMLSelectElement {
		const sel = document.createElement("select");
		sel.style.cssText = inputStyle;
		for (const opt of options) {
			const o = document.createElement("option");
			o.value = opt;
			o.textContent = opt;
			o.selected = opt === value;
			sel.appendChild(o);
		}
		return sel;
	}

	// Seed input + random button row
	const seedRow = document.createElement("div");
	seedRow.style.cssText = "display: flex; gap: 0.25rem; align-items: end;";
	const seedInput = document.createElement("input");
	seedInput.type = "number";
	seedInput.value = String(state.seed);
	seedInput.min = "0";
	seedInput.style.cssText = `${inputStyle} flex: 1;`;
	seedInput.addEventListener("input", () => {
		const val = Number.parseInt(seedInput.value, 10);
		if (!Number.isNaN(val) && val >= 0) {
			state.seed = val;
			regenerateLayout();
			render();
		}
	});
	const randomBtn = document.createElement("button");
	randomBtn.textContent = "Rand";
	randomBtn.style.cssText =
		"padding: 0.25rem 0.5rem; border: 1px solid var(--border, #ccc); border-radius: 3px; font-size: 0.75rem; cursor: pointer; background: var(--bg, #fff); color: var(--fg, #222); white-space: nowrap;";
	randomBtn.addEventListener("click", () => {
		state.seed = Math.floor(Math.random() * 100000);
		seedInput.value = String(state.seed);
		regenerateLayout();
		render();
	});
	seedRow.appendChild(seedInput);
	seedRow.appendChild(randomBtn);
	sidebar.appendChild(createControl("Seed", seedRow));

	// Time block
	const timeSelect = createSelect(PLAYGROUND_TIME_BLOCKS, state.timeBlock);
	timeSelect.addEventListener("change", () => {
		state.timeBlock =
			timeSelect.value as (typeof PLAYGROUND_TIME_BLOCKS)[number];
		render();
	});
	sidebar.appendChild(createControl("Time Block", timeSelect));

	// Highlight furniture
	const furnitureSelect = createSelect(
		["none", ...FURNITURE_NAMES],
		state.highlightFurniture,
	);
	furnitureSelect.addEventListener("change", () => {
		state.highlightFurniture = furnitureSelect.value as FurnitureName | "none";
		render();
	});
	sidebar.appendChild(createControl("Highlight", furnitureSelect));

	// Dog mood
	const moodSelect = createSelect(DOG_MOODS, state.dogMood);
	moodSelect.addEventListener("change", () => {
		state.dogMood = moodSelect.value as DogMoodState;
		render();
	});
	sidebar.appendChild(createControl("Dog Mood", moodSelect));

	// Dog energy slider
	const energyInput = document.createElement("input");
	energyInput.type = "range";
	energyInput.min = "0";
	energyInput.max = "100";
	energyInput.value = String(Math.round(state.dogEnergy * 100));
	energyInput.style.cssText = "width: 100%;";
	energyInput.addEventListener("input", () => {
		state.dogEnergy = Number.parseInt(energyInput.value, 10) / 100;
		render();
	});
	sidebar.appendChild(createControl("Energy", energyInput));

	// Seed info
	const infoLine = document.createElement("div");
	infoLine.style.cssText =
		"font-size: 0.7rem; color: var(--muted, #666); margin-top: 0.5rem; line-height: 1.4;";
	sidebar.appendChild(infoLine);

	columns.appendChild(sidebar);

	// -- Canvases column --
	const canvasGrid = document.createElement("div");
	canvasGrid.style.cssText =
		"flex: 1; display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; align-items: start; min-width: 0;";
	columns.appendChild(canvasGrid);

	const canvases: Record<ArtStyleId, HTMLCanvasElement> = {} as Record<
		ArtStyleId,
		HTMLCanvasElement
	>;

	for (const style of ART_STYLES) {
		const div = document.createElement("div");
		div.style.cssText = "text-align: center;";

		const label = document.createElement("div");
		label.textContent = style;
		label.style.cssText =
			"font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; text-transform: capitalize; color: var(--muted, #666);";
		div.appendChild(label);

		const canvas = document.createElement("canvas");
		canvas.width = state.layout.roomWidth * ROOM_SCALE;
		canvas.height = state.layout.roomHeight * ROOM_SCALE;
		canvas.style.cssText =
			"border: 2px solid var(--border, #ccc); border-radius: 4px; image-rendering: pixelated;";
		div.appendChild(canvas);

		canvases[style] = canvas;
		canvasGrid.appendChild(div);
	}

	function regenerateLayout(): void {
		state.layout = generateSingleRoomLayout(mulberry32(state.seed));
		for (const style of ART_STYLES) {
			const canvas = canvases[style];
			canvas.width = state.layout.roomWidth * ROOM_SCALE;
			canvas.height = state.layout.roomHeight * ROOM_SCALE;
		}
	}

	function render(): void {
		const seedPalette = getSeedPalette(mulberry32(state.seed + 1000));
		const variants = getItemVariants(mulberry32(state.seed + 2000));
		const themeColors = getThemeColors();

		const isExtendedNight = state.timeBlock === "extendedNight";
		const timeBlockName = isExtendedNight ? "night" : state.timeBlock;
		const timePalette = buildTimePalette(
			timeBlockName,
			isExtendedNight,
			themeColors,
		);

		const highlightRect =
			state.highlightFurniture !== "none"
				? state.layout.furniture[state.highlightFurniture]
				: undefined;

		// Update info line
		const detectedStyle = pickArtStyle(state.seed);
		infoLine.textContent = `Seed ${state.seed} \u2192 "${detectedStyle}" in-game\n${state.layout.roomWidth}\u00d7${state.layout.roomHeight} | Door: ${state.layout.doorSide}\nDecor: ${state.layout.decor.length} floor, ${state.layout.wallDecor.length} wall`;
		infoLine.style.whiteSpace = "pre-line";

		// Render all 5 canvases
		for (const style of ART_STYLES) {
			const canvas = canvases[style];
			const renderer = getRenderer(style);

			renderGameArea(canvas, {
				animationState: null,
				energy: state.dogEnergy,
				selectedTaskId: null,
				lastPhoneOutcome: null,
				lastPhoneTime: 0,
				lastTaskOutcome: null,
				lastTaskTime: 0,
				dogUrgency: "normal",
				layout: state.layout,
				renderer,
				timePalette,
				seedPalette,
				variants,
				themeColors,
				dogMoodOverride: state.dogMood,
			});

			// Draw furniture highlight on top if selected
			if (highlightRect) {
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.save();
					const scale = canvas.width / state.layout.roomWidth;
					ctx.scale(scale, scale);
					renderer.highlightFurniture(
						ctx,
						highlightRect,
						state.layout,
						themeColors.highlight,
						themeColors.highlightBorder,
					);
					ctx.restore();
				}
			}
		}
	}

	render();
}
