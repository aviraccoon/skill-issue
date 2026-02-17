import { createStateFromSeed, simulate } from "../engine";
import { formatPercent } from "../stats";
import {
	createStrategy,
	getStrategyNames,
	isValidStrategy,
	type StrategyName,
} from "../strategies";
import type { CliArgs } from "../types";

/**
 * Runs strategy comparison.
 */
export function runCompare(args: CliArgs): void {
	// Use specified strategies or default to all
	const rawNames =
		args.strategies.length > 0 ? args.strategies : getStrategyNames();

	// Validate and narrow strategy names
	const strategyNames: StrategyName[] = [];
	for (const name of rawNames) {
		if (!isValidStrategy(name)) {
			console.error(`Unknown strategy: ${name}`);
			console.error(`Available: ${getStrategyNames().join(", ")}`);
			process.exit(1);
		}
		strategyNames.push(name);
	}

	if (args.runs === 1) {
		// Single seed comparison - detailed view
		const seed = args.seed ?? Math.floor(Math.random() * 2147483647);
		const initialState = createStateFromSeed(seed);

		console.log(
			`Seed: ${seed} (${initialState.personality.time} + ${initialState.personality.social})`,
		);
		console.log(
			`Starting: Energy ${formatPercent(initialState.energy)} | Momentum ${formatPercent(initialState.momentum)}`,
		);
		console.log("");

		// Table header
		const nameWidth = Math.max(...strategyNames.map((s) => s.length), 8);
		console.log(
			`${"Strategy".padEnd(nameWidth)}  Energy   Momentum  All-nighters  Phone  Events  Unlocks`,
		);
		console.log("-".repeat(nameWidth + 60));

		// Run each strategy (fresh instance per seed)
		for (const name of strategyNames) {
			const strategy = createStrategy(name);
			const result = simulate(seed, strategy);
			const energy = formatPercent(result.stats.energy.end).padStart(6);
			const momentum = formatPercent(result.stats.momentum.end).padStart(6);
			const allNighters = String(result.stats.allNighters).padStart(5);
			const phone = String(result.stats.phoneChecks).padStart(5);
			const events = String(
				result.events.filter((e) => e.status !== "pending").length,
			).padStart(5);
			const unlocks =
				result.stats.variantsUnlocked.length > 0
					? result.stats.variantsUnlocked.join(",")
					: "-";

			console.log(
				`${name.padEnd(nameWidth)}  ${energy}   ${momentum}  ${allNighters}         ${phone}  ${events}  ${unlocks}`,
			);
		}
	} else {
		// Multi-seed comparison - aggregate view
		console.log(
			`Comparing ${args.runs} seeds across ${strategyNames.length} strategies...`,
		);
		console.log("");

		const resultsByStrategy: Record<
			string,
			{
				energy: number;
				momentum: number;
				allNighters: number;
				phone: number;
				events: number;
				variantUnlocks: Record<string, number>;
			}
		> = {};

		for (const name of strategyNames) {
			resultsByStrategy[name] = {
				energy: 0,
				momentum: 0,
				allNighters: 0,
				phone: 0,
				events: 0,
				variantUnlocks: {},
			};
		}

		// Generate seeds
		const seeds: number[] = [];
		for (let i = 0; i < args.runs; i++) {
			seeds.push(
				args.seed !== null
					? args.seed + i
					: Math.floor(Math.random() * 2147483647),
			);
		}

		// Run each strategy on all seeds (fresh instance per seed)
		for (const name of strategyNames) {
			for (const seed of seeds) {
				const strategy = createStrategy(name);
				const result = simulate(seed, strategy);
				const stats = resultsByStrategy[name];
				if (stats) {
					stats.energy += result.stats.energy.end;
					stats.momentum += result.stats.momentum.end;
					stats.allNighters += result.stats.allNighters;
					stats.phone += result.stats.phoneChecks;
					stats.events += result.events.filter(
						(e) => e.status !== "pending",
					).length;
					for (const category of result.stats.variantsUnlocked) {
						stats.variantUnlocks[category] =
							(stats.variantUnlocks[category] ?? 0) + 1;
					}
				}
			}
		}

		// Table header
		const nameWidth = Math.max(...strategyNames.map((s) => s.length), 8);
		console.log(
			`${"Strategy".padEnd(nameWidth)}  Avg Energy  Avg Momentum  All-nighters  Phone  Events`,
		);
		console.log("-".repeat(nameWidth + 60));

		// Output results
		for (const name of strategyNames) {
			const stats = resultsByStrategy[name];
			if (stats) {
				const n = args.runs;
				const energy = formatPercent(stats.energy / n).padStart(9);
				const momentum = formatPercent(stats.momentum / n).padStart(11);
				const allNighters = (stats.allNighters / n).toFixed(1).padStart(7);
				const phone = (stats.phone / n).toFixed(1).padStart(5);
				const events = (stats.events / n).toFixed(1).padStart(5);

				console.log(
					`${name.padEnd(nameWidth)}  ${energy}    ${momentum}       ${allNighters}  ${phone}  ${events}`,
				);
			}
		}

		// Collect all variant categories across strategies
		const allCategories = new Set<string>();
		for (const name of strategyNames) {
			const stats = resultsByStrategy[name];
			if (stats) {
				for (const category of Object.keys(stats.variantUnlocks)) {
					allCategories.add(category);
				}
			}
		}

		// Output variant unlock rates if any unlocks occurred
		if (allCategories.size > 0) {
			console.log("");
			console.log("Variant unlock rates:");
			const categories = [...allCategories].sort();
			const catHeader = categories.map((c) => c.padStart(8)).join("  ");
			console.log(`${"Strategy".padEnd(nameWidth)}  ${catHeader}`);
			console.log("-".repeat(nameWidth + 2 + categories.length * 10));

			for (const name of strategyNames) {
				const stats = resultsByStrategy[name];
				if (stats) {
					const n = args.runs;
					const rates = categories
						.map((c) => formatPercent((stats.variantUnlocks[c] ?? 0) / n))
						.map((r) => r.padStart(8))
						.join("  ");
					console.log(`${name.padEnd(nameWidth)}  ${rates}`);
				}
			}
		}
	}
}
