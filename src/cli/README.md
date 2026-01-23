# CLI Simulation & Playtest Tool

A headless simulation engine for exploring how the game's hidden mechanics interact. Run automated playthroughs, compare strategies, and find seeds with specific outcomes.

## Why This Exists

The game has hidden state (energy, momentum) that affects success rates in non-obvious ways. Playing manually takes 45-60 minutes per week and doesn't give you numbers. This CLI runs thousands of simulations in seconds, making it possible to:

- **Validate balance** - Do the numbers create the intended experience?
- **Discover patterns** - What correlations weren't anticipated?
- **Debug mechanics** - Reproduce specific scenarios with seed control
- **Find interesting seeds** - Locate rare outcomes for testing or sharing

## Commands

### simulate

Run automated simulations with a strategy.

```bash
# Single run with details
bun run cli simulate --seed 12345 --verbose

# Batch runs with aggregate stats
bun run cli simulate -n 100 -t realistic -q

# Filter and group results
bun run cli simulate -n 100 --failed -g timePref -g allNighters
bun run cli simulate -n 50 --personality nightOwl+hermit
```

**Options:**
- `--runs, -n <number>` - Number of runs (default: 1)
- `--seed, -s <number>` - Starting seed (default: random)
- `--strategy, -t <name>` - Decision strategy (default: realistic)
- `--quiet, -q` - Minimal output
- `--verbose` - Show every action
- `--json` - Machine-readable output

**Filters:**
- `--personality, -p <type>` - e.g., `nightOwl+hermit`, `earlyBird+socialBattery`
- `--time-pref <type>` - nightOwl, earlyBird, neutral
- `--social-pref <type>` - hermit, socialBattery, neutral
- `--survived` - Only include successful runs
- `--failed` - Only include failed runs

**Grouping:**
- `--group-by, -g <dim>` - Group results by dimension (repeatable)
  - `personality` - Full personality type
  - `timePref` - Time preference axis
  - `socialPref` - Social preference axis
  - `startingEnergy` - Low/medium/high buckets
  - `allNighters` - Number of all-nighters pulled

### compare

Compare strategies on the same seeds.

```bash
# Single seed - detailed comparison
bun run cli compare --seed 12345

# Aggregate comparison across many seeds
bun run cli compare -n 100

# Compare specific strategies
bun run cli compare -n 100 -t realistic -t priority -t bestCase
```

**Output (single seed):**
```
Seed: 12345 (earlyBird + socialBattery)
Starting: Energy 55.0% | Momentum 45.0%

Strategy   Result    Energy   Momentum  All-nighters  Phone
---------------------------------------------------------------
random     FAILED      0.0%     0.0%      0             7
priority   SURVIVED   58.0%   100.0%      2             0
realistic  SURVIVED   77.3%   100.0%      1             0
```

### find-seed

Search for seeds matching specific criteria.

```bash
# Failed runs that never checked phone (rare!)
bun run cli find-seed --failed --max-phone 0 -l 5

# Night owl hermits with high end energy
bun run cli find-seed -p nightOwl+hermit --survived --min-energy 80 -l 3

# Runs that survived despite 2+ all-nighters
bun run cli find-seed --min-allnighters 2 --survived -l 3

# Seeds where friend unlocks both food and hygiene variants
bun run cli find-seed --friend-unlocks food --friend-unlocks hygiene -l 5
```

**Criteria options:**
- `--limit, -l <number>` - Seeds to find (default: 10)
- `--max-phone <n>` / `--min-phone <n>` - Phone check bounds
- `--max-allnighters <n>` / `--min-allnighters <n>` - All-nighter bounds
- `--min-energy <pct>` / `--max-energy <pct>` - End energy (0-100)
- `--friend-unlocks <category>` - Require variant unlock (repeatable: hygiene, food, chores)
- Plus all personality and outcome filters from simulate

### play

Play interactively through the CLI.

```bash
bun run cli play
bun run cli play --seed 12345
```

**Controls:**
- `1-9` - Attempt task by number
- `p` - Check phone (scroll trap)
- `s` - Skip remaining time block
- `e` - End day early
- `q` - Quit

## Strategies

| Strategy | Description |
|----------|-------------|
| `realistic` | Human-like decisions. Prioritizes essentials, occasionally checks phone when momentum is low, smart about all-nighters. |
| `priority` | Rigid rule-following. Always picks highest-priority task, never checks phone, always pushes through when able. |
| `bestCase` | Optimal play. Easiest tasks first, always sleeps, never checks phone. Theoretical ceiling. |
| `worstCase` | Active self-sabotage. Checks phone frequently, picks hardest tasks, always pushes through, declines friend rescues. |
| `random` | Chaos baseline. Random choice from available options. |

## File Structure

```
src/cli/
  index.ts           Entry point, argument parsing
  engine.ts          Simulation loop (uses core/controller.ts)
  strategies.ts      Decision-making strategies
  stats.ts           Aggregation and grouping
  output.ts          Formatting and display
  help.ts            Help text for each command
  types.ts           Shared types
  commands/
    simulate.ts      Batch simulation command
    compare.ts       Strategy comparison command
    find-seed.ts     Seed search command
    interactive.ts   Interactive play mode

src/core/
  controller.ts      Shared game controller (Decision, executeDecision)
  screenInfo.ts      Screen rendering data (used by browser, available to CLI)
```

## Exploration Ideas

Some questions worth investigating:

- What distinguishes failed runs from survivors? Compare `--failed` vs `--survived` stats.
- Do all-nighters help or hurt? Group by `allNighters` and check the survival rates.
- Which personalities have an edge? Try `-g timePref -g socialPref`.
- Why does `priority` perform worse than `realistic` despite never checking phone?
- How rare are certain outcomes? Use `find-seed` to see how many seeds you need to check.
- What does a run that barely survives look like? Find low-energy survivors with `--min-energy`.

Run the simulations and see what patterns emerge.

## Usage Notes

- **Seeds are fully deterministic.** Same seed + same strategy = same outcome every time. This enables seed sharing and reproducible analysis.

- Personality filtering is fast (checked before simulation). Outcome filtering requires running the simulation.

- Safety limits prevent infinite loops on very narrow filter criteria.
