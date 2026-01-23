import { createStateFromSeed, simulate } from "../engine";
import { formatPercent } from "../stats";
import { getStrategy, getStrategyNames } from "../strategies";
import type { CliArgs } from "../types";

/**
 * Runs strategy comparison.
 */
export function runCompare(args: CliArgs): void {
	// Use specified strategies or default to all
	const strategyNames =
		args.strategies.length > 0 ? args.strategies : getStrategyNames();

	// Validate strategies
	const strategies = strategyNames.map((name) => {
		const strategy = getStrategy(name);
		if (!strategy) {
			console.error(`Unknown strategy: ${name}`);
			console.error(`Available: ${getStrategyNames().join(", ")}`);
			process.exit(1);
		}
		return { name, strategy };
	});

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
		const nameWidth = Math.max(...strategies.map((s) => s.name.length), 8);
		console.log(
			`${"Strategy".padEnd(nameWidth)}  Result    Energy   Momentum  All-nighters  Phone  Unlocks`,
		);
		console.log("-".repeat(nameWidth + 64));

		// Run each strategy
		for (const { name, strategy } of strategies) {
			const result = simulate(seed, strategy);
			const status = result.survived ? "SURVIVED" : "FAILED  ";
			const energy = formatPercent(result.stats.energy.end).padStart(6);
			const momentum = formatPercent(result.stats.momentum.end).padStart(6);
			const allNighters = String(result.stats.allNighters).padStart(5);
			const phone = String(result.stats.phoneChecks).padStart(5);
			const unlocks =
				result.stats.variantsUnlocked.length > 0
					? result.stats.variantsUnlocked.join(",")
					: "-";

			console.log(
				`${name.padEnd(nameWidth)}  ${status}  ${energy}   ${momentum}  ${allNighters}         ${phone}  ${unlocks}`,
			);
		}
	} else {
		// Multi-seed comparison - aggregate view
		console.log(
			`Comparing ${args.runs} seeds across ${strategies.length} strategies...`,
		);
		console.log("");

		const resultsByStrategy: Record<
			string,
			{
				survived: number;
				energy: number;
				momentum: number;
				allNighters: number;
				phone: number;
				variantUnlocks: Record<string, number>;
			}
		> = {};

		for (const { name } of strategies) {
			resultsByStrategy[name] = {
				survived: 0,
				energy: 0,
				momentum: 0,
				allNighters: 0,
				phone: 0,
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

		// Run each strategy on all seeds
		for (const { name, strategy } of strategies) {
			for (const seed of seeds) {
				const result = simulate(seed, strategy);
				const stats = resultsByStrategy[name];
				if (stats) {
					if (result.survived) stats.survived++;
					stats.energy += result.stats.energy.end;
					stats.momentum += result.stats.momentum.end;
					stats.allNighters += result.stats.allNighters;
					stats.phone += result.stats.phoneChecks;
					for (const category of result.stats.variantsUnlocked) {
						stats.variantUnlocks[category] =
							(stats.variantUnlocks[category] ?? 0) + 1;
					}
				}
			}
		}

		// Table header
		const nameWidth = Math.max(...strategies.map((s) => s.name.length), 8);
		console.log(
			`${"Strategy".padEnd(nameWidth)}  Survival  Avg Energy  Avg Momentum  All-nighters  Phone`,
		);
		console.log("-".repeat(nameWidth + 62));

		// Output results
		for (const { name } of strategies) {
			const stats = resultsByStrategy[name];
			if (stats) {
				const n = args.runs;
				const survival = formatPercent(stats.survived / n).padStart(7);
				const energy = formatPercent(stats.energy / n).padStart(9);
				const momentum = formatPercent(stats.momentum / n).padStart(11);
				const allNighters = (stats.allNighters / n).toFixed(1).padStart(7);
				const phone = (stats.phone / n).toFixed(1).padStart(5);

				console.log(
					`${name.padEnd(nameWidth)}  ${survival}   ${energy}    ${momentum}       ${allNighters}  ${phone}`,
				);
			}
		}

		// Collect all variant categories across strategies
		const allCategories = new Set<string>();
		for (const { name } of strategies) {
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

			for (const { name } of strategies) {
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
