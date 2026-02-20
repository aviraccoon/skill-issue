import { describe, expect, it } from "bun:test";
import { eventPool, getEventDefinition } from "../data/events";
import type { EventInstance } from "../state";
import {
	coordinateEventTiming,
	getProgressionTier,
	selectEventsForSeed,
} from "./eventSelection";
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

	it("selects obligation arcs as complete units", () => {
		const patterns = patternsWithCompletions(2); // tier 2
		for (let seed = 0; seed < 100; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			const ids = new Set(events.map((e) => e.id));

			// Dentist arc
			if (ids.has("dentist-reminder") || ids.has("dentist-missed")) {
				expect(ids.has("dentist-reminder")).toBe(true);
				expect(ids.has("dentist-missed")).toBe(true);
			}
			// Vet arc
			if (ids.has("vet-reminder") || ids.has("vet-missed")) {
				expect(ids.has("vet-reminder")).toBe(true);
				expect(ids.has("vet-missed")).toBe(true);
			}
			// Work deadline arc
			if (ids.has("work-reminder") || ids.has("work-missed")) {
				expect(ids.has("work-reminder")).toBe(true);
				expect(ids.has("work-missed")).toBe(true);
			}
		}
	});
});

describe("standalone major event cap", () => {
	const patterns = patternsWithCompletions(4); // tier 3 = all events available

	it("never selects more than 2 standalone major events", () => {
		for (let seed = 0; seed < 500; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			const standaloneMajors = events.filter((e) => {
				const def = getEventDefinition(e.id);
				return def?.type === "major" && !def.arcId;
			});
			expect(standaloneMajors.length).toBeLessThanOrEqual(2);
		}
	});

	it("does not remove arc major events (consequences)", () => {
		// Arc majors like delivery-deadline, neighbor-invite should survive the cap
		let sawArcMajor = false;
		for (let seed = 0; seed < 500; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			for (const e of events) {
				const def = getEventDefinition(e.id);
				if (def?.type === "major" && def.arcId) {
					sawArcMajor = true;
				}
			}
		}
		expect(sawArcMajor).toBe(true);
	});

	it("preserves selection determinism with cap applied", () => {
		for (let seed = 0; seed < 50; seed++) {
			const a = selectEventsForSeed(seed, patterns);
			const b = selectEventsForSeed(seed, patterns);
			expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
		}
	});
});

describe("assignObligationDays", () => {
	const patterns = patternsWithCompletions(2); // tier 2

	it("assigns obligationDay to notification events", () => {
		for (let seed = 0; seed < 50; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			for (const event of events) {
				const def = getEventDefinition(event.id);
				if (def?.obligation) {
					expect(event.obligationDay).toBeDefined();
					expect(event.scheduledDay).toBeDefined();
				}
			}
		}
	});

	it("obligation day is after notification day", () => {
		for (let seed = 0; seed < 50; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			for (const event of events) {
				const def = getEventDefinition(event.id);
				if (def?.obligation && event.obligationDay !== undefined) {
					expect(event.obligationDay).toBeGreaterThan(event.scheduledDay ?? -1);
				}
			}
		}
	});

	it("obligation day stays within weekdays (0-4)", () => {
		for (let seed = 0; seed < 100; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			for (const event of events) {
				if (event.obligationDay !== undefined) {
					expect(event.obligationDay).toBeGreaterThanOrEqual(0);
					expect(event.obligationDay).toBeLessThanOrEqual(4);
				}
			}
		}
	});

	it("sets consequence event scheduledDay to obligation day", () => {
		for (let seed = 0; seed < 50; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			for (const event of events) {
				const def = getEventDefinition(event.id);
				if (def?.obligation && event.obligationDay !== undefined) {
					// Find the consequence event (requires this notification)
					const consequence = events.find((e) => {
						const cDef = getEventDefinition(e.id);
						return cDef?.requires?.includes(event.id);
					});
					if (consequence) {
						expect(consequence.scheduledDay).toBe(event.obligationDay);
					}
				}
			}
		}
	});

	it("obligation notifications land on different days", () => {
		for (let seed = 0; seed < 200; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			const notificationDays: number[] = [];
			for (const event of events) {
				const def = getEventDefinition(event.id);
				if (def?.obligation && event.scheduledDay !== undefined) {
					notificationDays.push(event.scheduledDay);
				}
			}
			// All notification days should be unique
			const uniqueDays = new Set(notificationDays);
			expect(uniqueDays.size).toBe(notificationDays.length);
		}
	});
});

describe("coordinateEventTiming", () => {
	it("moves standalone dayStart away from obligation dayStart", () => {
		const events: EventInstance[] = [
			{
				id: "dentist-reminder",
				status: "pending",
				scheduledDay: 0,
				obligationDay: 2,
			},
			{ id: "dentist-missed", status: "pending", scheduledDay: 2 },
			// cold-apartment: standalone, dayStart, allowed Mon-Wed (0-2)
			{ id: "cold-apartment", status: "pending", scheduledDay: 0 },
		];

		coordinateEventTiming(events, 42);

		const coldApt = events.find((e) => e.id === "cold-apartment");
		expect(coldApt).toBeDefined();
		expect(coldApt?.scheduledDay).not.toBe(0);
		// Should be on one of its other allowed days (1 or 2)
		expect([1, 2]).toContain(coldApt?.scheduledDay ?? -1);
	});

	it("spreads two standalone dayStart events to different days", () => {
		const events: EventInstance[] = [
			// Both dayStart, both on Tuesday
			{ id: "cold-apartment", status: "pending", scheduledDay: 1 },
			{ id: "hot-water-out", status: "pending", scheduledDay: 1 },
		];

		coordinateEventTiming(events, 42);

		const coldApt = events.find((e) => e.id === "cold-apartment");
		const hotWater = events.find((e) => e.id === "hot-water-out");
		expect(coldApt?.scheduledDay).not.toBe(hotWater?.scheduledDay);
	});

	it("does not move events when no conflict exists", () => {
		const events: EventInstance[] = [
			{ id: "cold-apartment", status: "pending", scheduledDay: 0 },
			{ id: "hot-water-out", status: "pending", scheduledDay: 2 },
		];

		coordinateEventTiming(events, 42);

		expect(events.find((e) => e.id === "cold-apartment")?.scheduledDay).toBe(0);
		expect(events.find((e) => e.id === "hot-water-out")?.scheduledDay).toBe(2);
	});

	it("obligation events take priority over standalone events", () => {
		const events: EventInstance[] = [
			{
				id: "dentist-reminder",
				status: "pending",
				scheduledDay: 1,
				obligationDay: 3,
			},
			{ id: "dentist-missed", status: "pending", scheduledDay: 3 },
			{ id: "cold-apartment", status: "pending", scheduledDay: 1 },
		];

		coordinateEventTiming(events, 42);

		// Obligation stays in place
		expect(events.find((e) => e.id === "dentist-reminder")?.scheduledDay).toBe(
			1,
		);
		// Standalone moved
		expect(
			events.find((e) => e.id === "cold-apartment")?.scheduledDay,
		).not.toBe(1);
	});

	it("does not coordinate across different phases", () => {
		// dayStart and blockStart on same day is fine (different phase checks)
		const events: EventInstance[] = [
			{ id: "cold-apartment", status: "pending", scheduledDay: 1 }, // dayStart
			{ id: "rain", status: "pending", scheduledDay: 1 }, // blockStart
		];

		coordinateEventTiming(events, 42);

		// Both should keep their day -- different phases don't conflict
		expect(events.find((e) => e.id === "cold-apartment")?.scheduledDay).toBe(1);
		expect(events.find((e) => e.id === "rain")?.scheduledDay).toBe(1);
	});

	it("produces deterministic results", () => {
		const makeEvents = (): EventInstance[] => [
			{
				id: "dentist-reminder",
				status: "pending",
				scheduledDay: 0,
				obligationDay: 2,
			},
			{ id: "dentist-missed", status: "pending", scheduledDay: 2 },
			{ id: "cold-apartment", status: "pending", scheduledDay: 0 },
		];

		const a = makeEvents();
		const b = makeEvents();
		coordinateEventTiming(a, 42);
		coordinateEventTiming(b, 42);

		expect(a).toEqual(b);
	});

	it("no dayStart collisions across 200 seeds at tier 3", () => {
		const patterns = patternsWithCompletions(4);
		for (let seed = 0; seed < 200; seed++) {
			const events = selectEventsForSeed(seed, patterns);
			const dayStartDays = new Map<number, string[]>();

			for (const event of events) {
				if (event.scheduledDay === undefined) continue;
				const def = getEventDefinition(event.id);
				if (!def || def.timing.phase !== "dayStart") continue;

				const existing = dayStartDays.get(event.scheduledDay) ?? [];
				existing.push(event.id);
				dayStartDays.set(event.scheduledDay, existing);
			}

			for (const [, ids] of dayStartDays) {
				expect(ids.length).toBe(1);
			}
		}
	});
});
