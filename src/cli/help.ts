import { getStrategyNames } from "./strategies";

/**
 * Prints main usage information.
 */
export function printHelp(): void {
	console.log(`Skill Issue CLI - Simulation and Playtest Tool

USAGE:
  bun run cli <command> [options]

COMMANDS:
  simulate    Run automated simulation(s)
  compare     Compare strategies on same seed(s)
  find-seed   Search for seeds matching criteria
  play        Play interactively via CLI
  help        Show this help message

Run 'bun run cli <command> --help' for command-specific options.

EXAMPLES:
  bun run cli simulate --runs 100 --strategy priority
  bun run cli compare --seed 12345
  bun run cli find-seed --failed --max-phone 0
  bun run cli play --seed 12345
`);
}

/**
 * Prints simulate command help.
 */
export function printSimulateHelp(): void {
	console.log(`USAGE:
  bun run cli simulate [options]

OPTIONS:
  --runs, -n <number>      Number of runs (default: 1)
  --seed, -s <number>      Specific seed (default: random)
  --strategy, -t <name>    Decision strategy (default: realistic)
  --quiet, -q              Minimal output
  --verbose                Show every action
  --json                   Machine-readable output

FILTER OPTIONS:
  --personality, -p <type> Filter by personality (e.g., nightOwl+hermit)
  --time-pref <type>       Filter by time preference (nightOwl, earlyBird, neutral)
  --social-pref <type>     Filter by social preference (hermit, socialBattery, neutral)
  --survived               Only include runs that survived
  --failed                 Only include runs that failed

GROUPING OPTIONS:
  --group-by, -g <dim>     Group results by dimension (repeatable)
                           Options: personality, timePref, socialPref,
                                    startingEnergy, allNighters

STRATEGIES:
${getStrategyNames()
	.map((s) => `  ${s}`)
	.join("\n")}

EXAMPLES:
  bun run cli simulate -n 100 -t realistic -q
  bun run cli simulate --seed 12345 --verbose
  bun run cli simulate -n 100 --personality nightOwl+hermit
  bun run cli simulate -n 50 --failed -g timePref -g allNighters
`);
}

/**
 * Prints play command help.
 */
export function printPlayHelp(): void {
	console.log(`USAGE:
  bun run cli play [options]

OPTIONS:
  --seed, -s <number>      Specific seed (default: random)
  --debug, -d              Show hidden state (energy, momentum, unlocks)

CONTROLS:
  1-9      Attempt task by number
  p        Check phone (scroll trap)
  s        Skip remaining time block
  e        End day early
  q        Quit game

EXAMPLES:
  bun run cli play
  bun run cli play --seed 12345
`);
}

/**
 * Prints compare command help.
 */
export function printCompareHelp(): void {
	console.log(`USAGE:
  bun run cli compare [options]

OPTIONS:
  --seed, -s <number>      Specific seed (default: random)
  --runs, -n <number>      Number of seeds to compare (default: 1)
  --strategy, -t <name>    Strategies to compare (repeatable, default: all)

EXAMPLES:
  bun run cli compare --seed 12345
  bun run cli compare -n 100
  bun run cli compare --seed 12345 -t realistic -t priority -t bestCase
`);
}

/**
 * Prints find-seed command help.
 */
export function printFindSeedHelp(): void {
	console.log(`USAGE:
  bun run cli find-seed [options]

OPTIONS:
  --seed, -s <number>      Starting seed (default: random)
  --limit, -l <number>     Number of seeds to find (default: 10)
  --strategy, -t <name>    Strategy to use (default: realistic)

FILTER OPTIONS:
  --personality, -p <type> Filter by personality (e.g., nightOwl+hermit)
  --time-pref <type>       Filter by time preference
  --social-pref <type>     Filter by social preference
  --survived               Only seeds that survived
  --failed                 Only seeds that failed

CRITERIA OPTIONS:
  --max-phone <n>          Maximum phone checks
  --min-phone <n>          Minimum phone checks
  --max-allnighters <n>    Maximum all-nighters
  --min-allnighters <n>    Minimum all-nighters
  --min-energy <pct>       Minimum end energy (0-100)
  --max-energy <pct>       Maximum end energy (0-100)
  --friend-unlocks <cat>   Require variant unlock (repeatable: hygiene, food, chores)

EXAMPLES:
  bun run cli find-seed --failed --max-phone 0
  bun run cli find-seed -p nightOwl+hermit --survived --min-energy 80
  bun run cli find-seed --min-allnighters 2 --survived -l 5
  bun run cli find-seed --friend-unlocks food --friend-unlocks hygiene
`);
}
