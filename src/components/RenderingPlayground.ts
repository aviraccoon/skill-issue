/**
 * Visual playground for previewing all art styles, seeds, and rendering options.
 * Accessible at #playground. Uses the actual rendering pipeline.
 */

import { ROOM_SCALE } from "../data/roomLayout";
import { TIME_BLOCKS } from "../data/timeBlocks";
import { cssColorToHex } from "../rendering/color";
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
import { mulberry32, type NonEmptyArray } from "../utils/random";
import { renderGameArea } from "./GameArea";
import { DEFAULT_THEME, THEMES, type Theme } from "./ThemeSwitcher";

/** Time blocks plus extended night (not a real time block, but a rendering mode). */
const PLAYGROUND_TIME_BLOCKS = [...TIME_BLOCKS, "extendedNight"] as const;

/** All dog mood states. */
const DOG_MOODS = [
	"normal",
	"excited",
	"disappointed",
	"hopeful",
	"happyForYou",
	"sympathetic",
	"unimpressed",
	"interested",
	"restless",
] as const satisfies readonly DogMoodState[];

/** Furniture names derived from layout definitions. */
const FURNITURE_NAMES = Object.keys(FURNITURE_DEFS) as FurnitureName[];

/** Read theme colors from CSS variables (or use defaults). */
function getThemeColors(): ThemeColors {
	const style = getComputedStyle(document.documentElement);
	const floor = style.getPropertyValue("--game-area-floor").trim();
	const wall = style.getPropertyValue("--game-area-wall").trim();
	return {
		floor: cssColorToHex(floor, "#e8e4d9"),
		wall: cssColorToHex(wall, "#d4cfc4"),
		highlight:
			style.getPropertyValue("--game-area-highlight").trim() ||
			"rgba(94, 106, 210, 0.15)",
		highlightBorder: "rgba(94, 106, 210, 0.4)",
	};
}

type PlaygroundMode = "styles" | "themes";

interface PlaygroundState {
	seed: number;
	mode: PlaygroundMode;
	timeBlock: (typeof PLAYGROUND_TIME_BLOCKS)[number];
	selectedTheme: Theme;
	selectedStyle: ArtStyleId;
	highlightFurniture: FurnitureName | "none";
	dogMood: DogMoodState;
	dogEnergy: number;
	layout: RoomLayout;
}

/**
 * Read theme colors, label color, and resolved page background for a specific
 * theme + time block. Temporarily swaps `data-theme` and `data-time` so the
 * actual CSS rules compute the values. Synchronous JS prevents browser repaint.
 */
function getThemeVarsFor(
	theme: Theme,
	timeBlock: string,
): { colors: ThemeColors; muted: string; pageBg: string } {
	const root = document.documentElement;
	const app = document.getElementById("app");
	const prevTheme = root.dataset.theme;
	const prevTime = app?.dataset.time;

	root.dataset.theme = theme;
	if (app) app.dataset.time = timeBlock;

	const colors = getThemeColors();
	const rootStyle = getComputedStyle(root);
	const muted = rootStyle.getPropertyValue("--muted").trim() || "#666";
	const pageBg = getComputedStyle(document.body).backgroundColor;

	if (prevTheme) {
		root.dataset.theme = prevTheme;
	} else {
		delete root.dataset.theme;
	}
	if (app) {
		if (prevTime) {
			app.dataset.time = prevTime;
		} else {
			delete app.dataset.time;
		}
	}

	return { colors, muted, pageBg };
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
		mode: "styles",
		timeBlock: "afternoon",
		selectedTheme:
			(document.documentElement.dataset.theme as Theme) || DEFAULT_THEME,
		selectedStyle: pickArtStyle(initialSeed),
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
			scheduleRender();
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
		scheduleRender();
	});
	seedRow.appendChild(seedInput);
	seedRow.appendChild(randomBtn);
	sidebar.appendChild(createControl("Seed", seedRow));

	// Time block
	const timeSelect = createSelect(PLAYGROUND_TIME_BLOCKS, state.timeBlock);
	timeSelect.addEventListener("change", () => {
		state.timeBlock =
			timeSelect.value as (typeof PLAYGROUND_TIME_BLOCKS)[number];
		scheduleRender();
	});
	sidebar.appendChild(createControl("Time Block", timeSelect));

	// Mode toggle
	const modeSelect = createSelect(["styles", "themes"], state.mode);
	modeSelect.addEventListener("change", () => {
		state.mode = modeSelect.value as PlaygroundMode;
		updateModeVisibility();
		rebuildCanvases();
		scheduleRender();
	});
	sidebar.appendChild(createControl("Compare", modeSelect));

	// Theme (visible in "styles" mode)
	const themeSelect = createSelect(THEMES, state.selectedTheme);
	themeSelect.addEventListener("change", () => {
		state.selectedTheme = themeSelect.value as Theme;
		applyTheme(state.selectedTheme);
		scheduleRender();
	});
	const themeControl = createControl("Theme", themeSelect);
	sidebar.appendChild(themeControl);

	// Art style (visible in "themes" mode)
	const styleSelect = createSelect(ART_STYLES, state.selectedStyle);
	styleSelect.addEventListener("change", () => {
		state.selectedStyle = styleSelect.value as ArtStyleId;
		scheduleRender();
	});
	const styleControl = createControl("Art Style", styleSelect);
	sidebar.appendChild(styleControl);

	/** Show/hide controls based on current mode. */
	function updateModeVisibility(): void {
		themeControl.style.display = state.mode === "styles" ? "" : "none";
		styleControl.style.display = state.mode === "themes" ? "" : "none";
	}

	/** Apply a theme to the document (for "styles" mode and page appearance). */
	function applyTheme(theme: Theme): void {
		document.documentElement.dataset.theme = theme;
	}

	updateModeVisibility();
	applyTheme(state.selectedTheme);

	// Highlight furniture
	const furnitureSelect = createSelect(
		["none", ...FURNITURE_NAMES],
		state.highlightFurniture,
	);
	furnitureSelect.addEventListener("change", () => {
		state.highlightFurniture = furnitureSelect.value as FurnitureName | "none";
		scheduleRender();
	});
	sidebar.appendChild(createControl("Highlight", furnitureSelect));

	// Dog mood
	const moodSelect = createSelect(DOG_MOODS, state.dogMood);
	moodSelect.addEventListener("change", () => {
		state.dogMood = moodSelect.value as DogMoodState;
		scheduleRender();
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
		scheduleRender();
	});
	sidebar.appendChild(createControl("Energy", energyInput));

	// Randomize all
	function pickRandom<T>(arr: NonEmptyArray<T>): T {
		return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
	}

	const randomizeAllBtn = document.createElement("button");
	randomizeAllBtn.textContent = "Randomize all";
	randomizeAllBtn.style.cssText =
		"width: 100%; padding: 0.35rem 0.5rem; border: 1px solid var(--border, #ccc); border-radius: 3px; font-size: 0.8rem; cursor: pointer; background: var(--bg, #fff); color: var(--fg, #222); margin-bottom: 0.5rem;";
	randomizeAllBtn.addEventListener("click", () => {
		state.timeBlock = pickRandom(PLAYGROUND_TIME_BLOCKS);
		state.selectedTheme = pickRandom(THEMES);
		state.selectedStyle = pickRandom(ART_STYLES);
		state.highlightFurniture = pickRandom(["none", ...FURNITURE_NAMES]);
		state.dogMood = pickRandom(DOG_MOODS);
		state.dogEnergy = Math.random();

		// Sync controls
		timeSelect.value = state.timeBlock;
		themeSelect.value = state.selectedTheme;
		styleSelect.value = state.selectedStyle;
		furnitureSelect.value = state.highlightFurniture;
		moodSelect.value = state.dogMood;
		energyInput.value = String(Math.round(state.dogEnergy * 100));

		applyTheme(state.selectedTheme);
		scheduleRender();
	});
	sidebar.appendChild(randomizeAllBtn);

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

	/** Active canvases and their wrappers, keyed by label (style name or theme name). */
	let entries: Map<
		string,
		{ canvas: HTMLCanvasElement; wrapper: HTMLElement }
	> = new Map();

	/** Rebuild the canvas grid for the current mode. */
	function rebuildCanvases(): void {
		canvasGrid.replaceChildren();
		entries = new Map();

		const keys =
			state.mode === "styles"
				? (ART_STYLES as readonly string[])
				: (THEMES as readonly string[]);

		for (const key of keys) {
			const wrapper = document.createElement("div");
			wrapper.style.cssText =
				state.mode === "themes"
					? "text-align: center; padding: 12px; border-radius: 6px;"
					: "text-align: center;";

			const label = document.createElement("div");
			label.textContent = key;
			label.style.cssText =
				"font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; text-transform: capitalize;";
			wrapper.appendChild(label);

			const canvas = document.createElement("canvas");
			canvas.width = state.layout.roomWidth * ROOM_SCALE;
			canvas.height = state.layout.roomHeight * ROOM_SCALE;
			canvas.style.cssText =
				"border: 2px solid var(--border, #ccc); border-radius: 4px; image-rendering: pixelated;";
			wrapper.appendChild(canvas);

			entries.set(key, { canvas, wrapper });
			canvasGrid.appendChild(wrapper);
		}
	}

	function regenerateLayout(): void {
		state.layout = generateSingleRoomLayout(mulberry32(state.seed));
		for (const { canvas } of entries.values()) {
			canvas.width = state.layout.roomWidth * ROOM_SCALE;
			canvas.height = state.layout.roomHeight * ROOM_SCALE;
		}
	}

	/** Shared render props (everything except renderer and theme-dependent palettes). */
	function baseRenderProps() {
		return {
			animationState: null,
			energy: state.dogEnergy,
			selectedTaskId: null,
			lastPhoneOutcome: null,
			lastPhoneTime: 0,
			lastTaskOutcome: null,
			lastTaskTime: 0,
			dogUrgency: "normal" as const,
			layout: state.layout,
			seedPalette: getSeedPalette(mulberry32(state.seed + 1000)),
			variants: getItemVariants(mulberry32(state.seed + 2000)),
			dogMoodOverride: state.dogMood,
		};
	}

	/** Render a single canvas with the given renderer and theme colors. */
	function renderCanvas(
		canvas: HTMLCanvasElement,
		renderer: ReturnType<typeof getRenderer>,
		themeColors: ThemeColors,
		props: ReturnType<typeof baseRenderProps>,
	): void {
		const isExtendedNight = state.timeBlock === "extendedNight";
		const timeBlockName = isExtendedNight ? "night" : state.timeBlock;
		const timePalette = buildTimePalette(
			timeBlockName,
			isExtendedNight,
			themeColors,
		);

		renderGameArea(canvas, {
			...props,
			renderer,
			timePalette,
			themeColors,
		});

		// Draw furniture highlight on top if selected
		const highlightRect =
			state.highlightFurniture !== "none"
				? state.layout.furniture[state.highlightFurniture]
				: undefined;

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

	function render(): void {
		// Update info line
		const detectedStyle = pickArtStyle(state.seed);
		infoLine.textContent = `Seed ${state.seed} \u2192 "${detectedStyle}" in-game\n${state.layout.roomWidth}\u00d7${state.layout.roomHeight} | Door: ${state.layout.doorSide}\nDecor: ${state.layout.decor.length} floor, ${state.layout.wallDecor.length} wall`;
		infoLine.style.whiteSpace = "pre-line";

		const props = baseRenderProps();

		if (state.mode === "styles") {
			// One theme, all art styles
			const themeColors = getThemeColors();
			for (const style of ART_STYLES) {
				const entry = entries.get(style);
				if (entry) {
					renderCanvas(entry.canvas, getRenderer(style), themeColors, props);
				}
			}
		} else {
			// One art style, all themes
			const renderer = getRenderer(state.selectedStyle);
			const timeBlockName =
				state.timeBlock === "extendedNight" ? "night" : state.timeBlock;

			for (const theme of THEMES) {
				const entry = entries.get(theme);
				if (entry) {
					const { colors, muted, pageBg } = getThemeVarsFor(
						theme,
						timeBlockName,
					);
					entry.wrapper.style.backgroundColor = pageBg;
					entry.wrapper.style.color = muted;
					renderCanvas(entry.canvas, renderer, colors, props);
				}
			}
		}
	}

	/**
	 * Schedules a render on the next animation frame. Coalesces rapid calls
	 * (e.g. spamming randomize) so the browser flushes style changes before
	 * we read computed values.
	 */
	let rafId = 0;
	function scheduleRender(): void {
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(render);
	}

	rebuildCanvases();
	render();
}
