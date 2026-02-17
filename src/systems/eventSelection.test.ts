import { describe, expect, it } from "bun:test";
import { eventPool } from "../data/events";
import { getProgressionTier, selectEventsForSeed } from "./eventSelection";
import type { CompletedRun, PatternsData } from "./persistence";

/** Creates a minimal PatternsData with a given number of main-mode completions. */
function patternsWithCompletions(
	mainCount: number,
	seededCount = 0,
): PatternsData {
	const history: CompletedRun[] = [];
	for (let i = 0; i < mainCount; i++) {
		history.push(fakeCompletedRun("main"));
	}
	for (let i = 0; i < seededCount; i++) {
		history.push(fakeCompletedRun("seeded"));
	}
	return { unlocked: mainCount > 0, history };
}

function fakeCompletedRun(mode: "main" | "seeded"): CompletedRun {
	return {
		seed: 1,
		personality: { time: "neutral", social: "neutral" },
		gameMode: mode,
		completedAt: Date.now(),
		stats: {
			tasks: { attempted: 10, succeeded: 5 },
			byTimeBlock: {
				morning: { attempted: 3, succeeded: 2 },
				afternoon: { attempted: 3, succeeded: 1 },
				evening: { attempted: 2, succeeded: 1 },
				night: { attempted: 2, succeeded: 1 },
			},
			phoneChecks: 3,
			allNighters: 0,
			friendRescues: { triggered: 1, accepted: 1 },
			variantsUsed: [],
		},
	};
}

const emptyPatterns: PatternsData = { unlocked: false, history: [] };

describe("getProgressionTier", () => {
	it("returns tier 0 with no completions", () => {
		expect(getProgressionTier(emptyPatterns)).toBe(0);
	});

	it("returns tier 1 with 1 main-mode completion", () => {
		expect(getProgressionTier(patternsWithCompletions(1))).toBe(1);
	});

	it("returns tier 2 with 2-3 main-mode completions", () => {
		expect(getProgressionTier(patternsWithCompletions(2))).toBe(2);
		expect(getProgressionTier(patternsWithCompletions(3))).toBe(2);
	});

	it("returns tier 3 with 4+ main-mode completions", () => {
		expect(getProgressionTier(patternsWithCompletions(4))).toBe(3);
		expect(getProgressionTier(patternsWithCompletions(10))).toBe(3);
	});

	it("ignores seeded-mode completions for tier calculation", () => {
		// 0 main + 5 seeded = tier 0
		expect(getProgressionTier(patternsWithCompletions(0, 5))).toBe(0);
		// 1 main + 5 seeded = tier 1 (only the main counts)
		expect(getProgressionTier(patternsWithCompletions(1, 5))).toBe(1);
	});

	it("treats legacy runs (no gameMode) as main-mode", () => {
		const patterns: PatternsData = {
			unlocked: true,
			history: [
				{
					seed: 1,
					personality: { time: "neutral", social: "neutral" },
					completedAt: Date.now(),
					// no gameMode field -- legacy save
					stats: {
						tasks: { attempted: 10, succeeded: 5 },
						byTimeBlock: {
							morning: { attempted: 3, succeeded: 2 },
							afternoon: { attempted: 3, succeeded: 1 },
							evening: { attempted: 2, succeeded: 1 },
							night: { attempted: 2, succeeded: 1 },
						},
						phoneChecks: 0,
						allNighters: 0,
						friendRescues: { triggered: 0, accepted: 0 },
						variantsUsed: [],
					},
				} as CompletedRun,
			],
		};
		expect(getProgressionTier(patterns)).toBe(1);
	});
});

describe("selectEventsForSeed", () => {
	it("returns deterministic results for the same seed", () => {
		const a = selectEventsForSeed(42, emptyPatterns);
		const b = selectEventsForSeed(42, emptyPatterns);
		expect(a).toEqual(b);
	});

	it("produces different selections for different seeds", () => {
		const selections = new Set<string>();
		for (let seed = 0; seed < 50; seed++) {
			const events = selectEventsForSeed(seed, emptyPatterns, true);
			const ids = events
				.map((e) => e.id)
				.sort()
				.join(",");
			selections.add(ids);
		}
		// With 25 events in the pool, different seeds should produce variety
		expect(selections.size).toBeGreaterThan(1);
	});

	it("only selects tier 0 events with no completions", () => {
		for (let seed = 0; seed < 50; seed++) {
			const events = selectEventsForSeed(seed, emptyPatterns);
			for (const event of events) {
				const def = eventPool.find((e) => e.id === event.id);
				expect(def?.tier).toBe(0);
			}
		}
	});

	it("can select higher-tier events with progression", () => {
		const patternsT1 = patternsWithCompletions(1);
		let hasHigherTier = false;
		for (let seed = 0; seed < 100; seed++) {
			const events = selectEventsForSeed(seed, patternsT1);
			for (const event of events) {
				const def = eventPool.find((e) => e.id === event.id);
				if (def && def.tier > 0) hasHigherTier = true;
			}
		}
		expect(hasHigherTier).toBe(true);
	});

	it("selects from all tiers when bypassProgression is true", () => {
		let hasHigherTier = false;
		for (let seed = 0; seed < 100; seed++) {
			const events = selectEventsForSeed(seed, emptyPatterns, true);
			for (const event of events) {
				const def = eventPool.find((e) => e.id === event.id);
				if (def && def.tier > 0) hasHigherTier = true;
			}
		}
		expect(hasHigherTier).toBe(true);
	});

	it("returns all events in pending status", () => {
		const events = selectEventsForSeed(42, emptyPatterns, true);
		for (const event of events) {
			expect(event.status).toBe("pending");
		}
	});

	it("selects arc events as complete units", () => {
		// When any arc event is selected, all events in that arc should be present
		for (let seed = 0; seed < 100; seed++) {
			const events = selectEventsForSeed(seed, emptyPatterns, true);
			const ids = new Set(events.map((e) => e.id));

			// Check leak arc: if any leak event is present, all should be
			const leakIds = [
				"leak-drip",
				"leak-found",
				"leak-fixed",
				"leak-worse",
			] as const;
			const hasAnyLeak = leakIds.some((id) => ids.has(id));
			if (hasAnyLeak) {
				for (const id of leakIds) {
					expect(ids.has(id)).toBe(true);
				}
			}

			// Check delivery arc
			const deliveryIds = ["missed-delivery", "delivery-deadline"] as const;
			const hasAnyDelivery = deliveryIds.some((id) => ids.has(id));
			if (hasAnyDelivery) {
				for (const id of deliveryIds) {
					expect(ids.has(id)).toBe(true);
				}
			}
		}
	});

	it("never selects more units than exist per tier", () => {
		for (let seed = 0; seed < 200; seed++) {
			const events = selectEventsForSeed(seed, emptyPatterns, true);
			// Count per tier (counting arc events as a single unit)
			const unitsByTier = new Map<number, Set<string>>();
			for (const event of events) {
				const def = eventPool.find((e) => e.id === event.id);
				if (def) {
					const unitKey = def.arcId ?? def.id;
					const set = unitsByTier.get(def.tier);
					if (set) {
						set.add(unitKey);
					} else {
						unitsByTier.set(def.tier, new Set([unitKey]));
					}
				}
			}
			for (const [tier, unitKeys] of unitsByTier) {
				// Count available units for this tier
				const tierEvents = eventPool.filter((e) => e.tier === tier);
				const arcIds = new Set(
					tierEvents.filter((e) => e.arcId).map((e) => e.arcId),
				);
				const standaloneCount = tierEvents.filter((e) => !e.arcId).length;
				const totalUnits = arcIds.size + standaloneCount;
				expect(unitKeys.size).toBeLessThanOrEqual(totalUnits);
			}
		}
	});
});
