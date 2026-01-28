/**
 * Art style registry. Maps style IDs to renderers.
 */

import type { ArtStyleId, RoomRenderer } from "../types";
import { createFlatRenderer } from "./flat";
import { createIsometricRenderer } from "./isometric";
import { createMinimalRenderer } from "./minimal";
import { createPixelRenderer } from "./pixel";
import { createSketchRenderer } from "./sketch";

/** Pick an art style from a seed. */
export function pickArtStyle(seed: number): ArtStyleId {
	const styles: ArtStyleId[] = [
		"pixel",
		"minimal",
		"sketch",
		"isometric",
		"flat",
	];
	return styles[seed % styles.length] as ArtStyleId;
}

/** Get the renderer for an art style. */
export function getRenderer(style: ArtStyleId): RoomRenderer {
	switch (style) {
		case "sketch":
			return createSketchRenderer();
		case "minimal":
			return createMinimalRenderer();
		case "flat":
			return createFlatRenderer();
		case "isometric":
			return createIsometricRenderer();
		case "pixel":
			return createPixelRenderer();
	}
}
