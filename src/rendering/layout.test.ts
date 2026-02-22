import { describe, expect, test } from "bun:test";
import { mulberry32 } from "../utils/random";
import { generateSingleRoomLayout } from "./layout";
import type { FurnitureName, Rect } from "./types";

const PAD = 3;
const ROOM_EDGE = 6;
const SEEDS = 500;

function rectsOverlap(a: Rect, b: Rect): boolean {
	return (
		a.x < b.x + b.w + PAD &&
		a.x + a.w + PAD > b.x &&
		a.y < b.y + b.h + PAD &&
		a.y + a.h + PAD > b.y
	);
}

function layoutForSeed(seed: number) {
	return generateSingleRoomLayout(mulberry32(seed));
}

describe("generateSingleRoomLayout", () => {
	test("door side is roughly 50/50 across seeds", () => {
		let left = 0;
		for (let seed = 1; seed <= SEEDS; seed++) {
			if (layoutForSeed(seed).doorSide === "left") left++;
		}
		// Expect within 40-60% range
		expect(left / SEEDS).toBeGreaterThan(0.4);
		expect(left / SEEDS).toBeLessThan(0.6);
	});

	test("door is flush against the correct wall", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const layout = layoutForSeed(seed);
			const door = layout.furniture.door;
			expect(door).toBeDefined();
			if (!door) continue;
			if (layout.doorSide === "left") {
				expect(door.x).toBe(2);
			} else {
				expect(door.x).toBe(layout.roomWidth - door.w - 2);
			}
		}
	});

	test("door bottom is anchored at floorTop", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const layout = layoutForSeed(seed);
			const door = layout.furniture.door;
			if (!door) continue;
			expect(door.y + door.h).toBeCloseTo(layout.floorTop, 5);
		}
	});

	test("no furniture overlaps (with collision padding)", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const layout = layoutForSeed(seed);
			const entries = Object.entries(layout.furniture).filter(
				(e): e is [string, Rect] => e[1] !== undefined,
			);
			for (let i = 0; i < entries.length; i++) {
				const entryI = entries[i];
				if (!entryI) continue;
				for (let j = i + 1; j < entries.length; j++) {
					const entryJ = entries[j];
					if (!entryJ) continue;
					expect(rectsOverlap(entryI[1], entryJ[1])).toBe(false);
				}
			}
		}
	});

	test("non-door furniture respects room edge margins", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const layout = layoutForSeed(seed);
			const rw = layout.roomWidth;
			const rh = layout.roomHeight;
			for (const [name, rect] of Object.entries(layout.furniture)) {
				if (!rect || name === "door") continue;
				expect(rect.x).toBeGreaterThanOrEqual(ROOM_EDGE);
				expect(rect.x + rect.w).toBeLessThanOrEqual(rw - ROOM_EDGE);
				expect(rect.y + rect.h).toBeLessThanOrEqual(rh - ROOM_EDGE);
			}
		}
	});

	test("no furniture blocks the door clearance zone", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const layout = layoutForSeed(seed);
			const door = layout.furniture.door;
			if (!door) continue;
			const clearance: Rect = {
				x: door.x,
				y: layout.floorTop,
				w: door.w,
				h: 30,
			};
			for (const [name, rect] of Object.entries(layout.furniture)) {
				if (!rect || name === "door") continue;
				expect(rectsOverlap(rect, clearance)).toBe(false);
			}
		}
	});

	test("all expected furniture pieces are placed", () => {
		const expected: FurnitureName[] = [
			"door",
			"bed",
			"kitchen",
			"bathroom",
			"desk",
			"couch",
		];
		for (let seed = 1; seed <= SEEDS; seed++) {
			const layout = layoutForSeed(seed);
			for (const name of expected) {
				expect(layout.furniture[name]).toBeDefined();
			}
		}
	});

	test("character and dog are on the floor", () => {
		for (let seed = 1; seed <= SEEDS; seed++) {
			const layout = layoutForSeed(seed);
			expect(layout.charPos.y).toBeGreaterThanOrEqual(layout.floorTop);
			expect(layout.dogPos.y).toBeGreaterThanOrEqual(layout.floorTop);
			expect(layout.charPos.x).toBeGreaterThan(0);
			expect(layout.charPos.x).toBeLessThan(layout.roomWidth);
		}
	});

	test("layouts are deterministic (same seed = same layout)", () => {
		for (const seed of [1, 42, 999]) {
			const a = layoutForSeed(seed);
			const b = layoutForSeed(seed);
			expect(a.furniture).toEqual(b.furniture);
			expect(a.charPos).toEqual(b.charPos);
			expect(a.dogPos).toEqual(b.dogPos);
			expect(a.doorSide).toBe(b.doorSide);
		}
	});

	test("different seeds produce different layouts", () => {
		const a = layoutForSeed(1);
		const b = layoutForSeed(2);
		const aPositions = JSON.stringify(a.furniture);
		const bPositions = JSON.stringify(b.furniture);
		expect(aPositions).not.toBe(bPositions);
	});
});
