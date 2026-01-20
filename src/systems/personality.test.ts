import { describe, expect, test } from "bun:test";
import {
	describePersonality,
	getBaseTimeModifier,
	getFriendRescueEnergyEffect,
	getPersonalityFromSeed,
	getPersonalityTimeModifier,
	getSocialSuccessEnergyEffect,
	getSoloSuccessEnergyEffect,
	getStartingEnergyFromSeed,
	getStartingMomentumFromSeed,
	type Personality,
} from "./personality";

describe("getPersonalityFromSeed", () => {
	test("returns valid personality types", () => {
		const personality = getPersonalityFromSeed(12345);
		expect(["nightOwl", "earlyBird", "neutral"]).toContain(personality.time);
		expect(["socialBattery", "hermit", "neutral"]).toContain(
			personality.social,
		);
	});

	test("same seed gives same personality", () => {
		const p1 = getPersonalityFromSeed(42);
		const p2 = getPersonalityFromSeed(42);
		expect(p1).toEqual(p2);
	});

	test("different seeds can give different personalities", () => {
		const personalities = new Set<string>();
		for (let i = 0; i < 1000; i++) {
			const p = getPersonalityFromSeed(i);
			personalities.add(`${p.time}-${p.social}`);
		}
		// Should hit multiple combinations (9 possible: 3 time x 3 social)
		expect(personalities.size).toBeGreaterThan(1);
	});
});

describe("getPersonalityTimeModifier", () => {
	test("nightOwl gets penalty in morning (base value)", () => {
		const personality: Personality = { time: "nightOwl", social: "neutral" };
		expect(getBaseTimeModifier(personality, "morning")).toBe(0.9);
	});

	test("nightOwl gets big bonus at night (base value)", () => {
		const personality: Personality = { time: "nightOwl", social: "neutral" };
		expect(getBaseTimeModifier(personality, "night")).toBe(1.3);
	});

	test("earlyBird gets bonus in morning (base value)", () => {
		const personality: Personality = { time: "earlyBird", social: "neutral" };
		expect(getBaseTimeModifier(personality, "morning")).toBe(1.15);
	});

	test("earlyBird base night bonus smaller than nightOwl", () => {
		const earlyBird: Personality = { time: "earlyBird", social: "neutral" };
		const nightOwl: Personality = { time: "nightOwl", social: "neutral" };

		expect(getBaseTimeModifier(earlyBird, "night")).toBe(1.15);
		expect(getBaseTimeModifier(nightOwl, "night")).toBe(1.3);
	});

	test("neutral base modifiers", () => {
		const personality: Personality = { time: "neutral", social: "neutral" };
		expect(getBaseTimeModifier(personality, "morning")).toBe(1.1);
		expect(getBaseTimeModifier(personality, "afternoon")).toBe(0.9);
		expect(getBaseTimeModifier(personality, "evening")).toBe(1.0);
		expect(getBaseTimeModifier(personality, "night")).toBe(1.25);
	});

	test("seeded modifier varies within range", () => {
		const personality: Personality = { time: "nightOwl", social: "neutral" };
		// Night has base 1.30, variance 0.05, so range [1.25, 1.35]
		for (let i = 0; i < 50; i++) {
			const mod = getPersonalityTimeModifier(personality, "night", i * 1000);
			expect(mod).toBeGreaterThanOrEqual(1.25);
			expect(mod).toBeLessThanOrEqual(1.35);
		}
	});

	test("same seed gives same modifier", () => {
		const personality: Personality = { time: "nightOwl", social: "neutral" };
		const m1 = getPersonalityTimeModifier(personality, "night", 42);
		const m2 = getPersonalityTimeModifier(personality, "night", 42);
		expect(m1).toBe(m2);
	});
});

describe("getStartingEnergyFromSeed", () => {
	test("returns value in range 0.55-0.65", () => {
		for (let i = 0; i < 100; i++) {
			const energy = getStartingEnergyFromSeed(i * 12345);
			expect(energy).toBeGreaterThanOrEqual(0.55);
			expect(energy).toBeLessThanOrEqual(0.65);
		}
	});

	test("same seed gives same energy", () => {
		const e1 = getStartingEnergyFromSeed(42);
		const e2 = getStartingEnergyFromSeed(42);
		expect(e1).toBe(e2);
	});
});

describe("getStartingMomentumFromSeed", () => {
	test("returns value in range 0.45-0.55", () => {
		for (let i = 0; i < 100; i++) {
			const momentum = getStartingMomentumFromSeed(i * 12345);
			expect(momentum).toBeGreaterThanOrEqual(0.45);
			expect(momentum).toBeLessThanOrEqual(0.55);
		}
	});

	test("same seed gives same momentum", () => {
		const m1 = getStartingMomentumFromSeed(42);
		const m2 = getStartingMomentumFromSeed(42);
		expect(m1).toBe(m2);
	});
});

describe("social personality effects", () => {
	test("socialBattery gets extra energy from friend rescue", () => {
		const personality: Personality = {
			time: "neutral",
			social: "socialBattery",
		};
		expect(getFriendRescueEnergyEffect(personality)).toBe(0.12);
	});

	test("hermit pays energy for friend rescue", () => {
		const personality: Personality = { time: "neutral", social: "hermit" };
		expect(getFriendRescueEnergyEffect(personality)).toBe(-0.03);
	});

	test("neutral gets standard energy from friend rescue", () => {
		const personality: Personality = { time: "neutral", social: "neutral" };
		expect(getFriendRescueEnergyEffect(personality)).toBe(0.1);
	});

	test("socialBattery gets bonus from social success", () => {
		const personality: Personality = {
			time: "neutral",
			social: "socialBattery",
		};
		expect(getSocialSuccessEnergyEffect(personality)).toBe(0.03);
	});

	test("hermit pays energy for social success", () => {
		const personality: Personality = { time: "neutral", social: "hermit" };
		expect(getSocialSuccessEnergyEffect(personality)).toBe(-0.02);
	});

	test("hermit gets bonus from solo success", () => {
		const personality: Personality = { time: "neutral", social: "hermit" };
		expect(getSoloSuccessEnergyEffect(personality)).toBe(0.02);
	});

	test("socialBattery is neutral on solo success", () => {
		const personality: Personality = {
			time: "neutral",
			social: "socialBattery",
		};
		expect(getSoloSuccessEnergyEffect(personality)).toBe(0);
	});
});

describe("describePersonality", () => {
	test("describes nightOwl + hermit", () => {
		const personality: Personality = { time: "nightOwl", social: "hermit" };
		expect(describePersonality(personality)).toBe("Night Owl + Hermit");
	});

	test("describes earlyBird + socialBattery", () => {
		const personality: Personality = {
			time: "earlyBird",
			social: "socialBattery",
		};
		expect(describePersonality(personality)).toBe(
			"Early Bird + Social Battery",
		);
	});

	test("describes neutral + neutral", () => {
		const personality: Personality = { time: "neutral", social: "neutral" };
		expect(describePersonality(personality)).toBe(
			"Flexible Schedule + Social Neutral",
		);
	});
});
