# Architecture

Vanilla TypeScript with a lightweight reactive pattern. No framework.

## Why Vanilla

- Focus on state machine implementation, not framework patterns
- Full control over input handling (core mechanic requires precise control)
- Minimal dependencies for long-term maintainability
- CSS does heavy lifting for state-based visuals

## Core Pattern

### Reactive Store (`store.ts`)

A ~70-line pub/sub store manages all game state. All subscribers receive the full state on every change -- there's no key-based filtering. Components decide what to re-render. The API is `get`, `set`, `update`, `getState`, `setState`, `subscribe`. See `store.ts` for the interface.

### Shared Controller (`core/controller.ts`)

Both browser and CLI use the same game controller. The `Decision` type is the union of all player actions (attempt task, skip, check phone, sleep, push through, accept/decline rescue, event choices). `getAvailableDecisions(state)` returns what's valid for the current screen. `executeDecision(store, decision, callbacks?)` processes it and returns an `ActionResult`.

Screen rendering data is computed by `getScreenInfo(state)` (in `core/screenInfo.ts`), which returns a discriminated union with one variant per screen type. Types live in `core/screenInfo.types.ts`. Components never read raw GameState -- they receive precomputed display data.

### Components (`components/`)

Components are functions that receive ScreenInfo, render DOM, and call `onDecision(decision)` on user interaction. No framework lifecycle -- just functions that build elements and attach listeners. `App.ts` routes between screens and wraps `executeDecision` with animation callbacks.

Each component has a co-located CSS module (`.module.css`) with auto-generated type declarations.

### Actions (`actions/`)

One file per action category (tasks, time, phone, friend, night). Each action function:
1. Calculates success probability from hidden state
2. Rolls using seeded random (deterministic via `rollCount`)
3. Updates state through the store
4. Store notification triggers UI re-render

All randomness is seeded -- the same seed and sequence of decisions produces identical outcomes.

## State

The full `GameState` type lives in `state.ts`. Key architectural points:

- **Visible to player**: Day, time block, tasks (names, failure counts, success status), action slots remaining
- **Hidden from player**: Energy (0-1), momentum (0-1), personality (seed-determined time/social preferences). These affect success rates but are never exposed in UI
- **Deterministic**: `runSeed` + `rollCount` make all randomness reproducible. Personality, task selection, event selection, and item variants are all seed-derived
- **Screens as state**: `screen` field drives routing (splash, menu, intro, game, nightChoice, daySummary, weekComplete, friendRescue, narrativeEvent, patterns)
- **Events**: `events[]` holds narrative event instances for the run, `eventFlags[]` tracks consequence chain state
- **Stats**: `runStats` accumulates per-run data for the "Your Patterns" reveal

## Directory Structure

- **`core/`** -- Shared game logic. Controller (decision flow), screen info (display data computation), strategy helpers (for CLI simulation).
- **`actions/`** -- State mutations triggered by player decisions. One file per action category.
- **`components/`** -- DOM rendering. One component per screen, plus shared UI (theme switcher, settings, dev tools). Each has a CSS module. `GameArea.ts` bridges to the canvas rendering system.
- **`rendering/`** -- Seed-based canvas rendering. Room layout generation, 5 art style renderers (pixel, minimal, sketch, isometric, flat) behind a `RoomRenderer` interface, time-of-day palettes, seed-derived item variants (furniture, character, dog appearance). See [Rendering System](#rendering-system).
- **`systems/`** -- Game mechanics. Probability calculation, momentum/energy decay, task description evolution, dog mood, friend rescue triggers, all-nighter mechanics, sleep recovery, task pool selection, daily availability jitter, narrative event selection and resolution, save persistence and migrations.
- **`data/`** -- Static content. Task definitions, time block config, day summary templates, scroll trap text/outcomes, friend rescue dialogue, narrative event definitions (tiers 0-2, arcs, choices), week story narrative, room furniture definitions.
- **`i18n/`** -- Internationalization. English source of truth, Czech (deferred). `strings()` accessor with fallback.
- **`styles/`** -- Global CSS. `base.css` (reset, variables, time theming, `@keyframes`) and `themes.css` (9 theme overrides via `[data-theme]`).
- **`utils/`** -- Seeded random (mulberry32), math (clamp, lerp), string helpers, screen reader announcements, tooltip positioning.
- **`cli/`** -- Headless simulation tool. Simulate runs, compare strategies, find seeds matching criteria, interactive play. See `src/cli/README.md`.

## State-Driven CSS

Visual states are driven by data attributes on the DOM, not JS style manipulation. `[data-time]` controls time-of-day theming, `[data-theme]` controls color scheme, `[data-momentum]` drives list messiness (jitter, drift), `[data-failures]` on task elements drives description evolution. CSS variables do the heavy lifting -- JS just sets the attributes.

Component styles use CSS modules with scoped class names. `@keyframes` go in `base.css` (not modules) due to a Bun bundler scoping bug.

## Hidden State Machine

The player never sees energy or momentum directly. Success probability is multiplicative:

`baseRate * timeModifier * momentumModifier * energyModifier * weekendWorkModifier`

- **baseRate**: Baked-in per task (aspirational tasks are harder, routine tasks easier)
- **timeModifier**: Personality-aware. Night Owls get a bigger night bonus, Early Birds get a morning bonus, with seed-based variation in intensity
- **momentumModifier**: 0.7x at 0 momentum, 1.3x at full
- **energyModifier**: 0.8x at 0 energy, 1.2x at full
- **weekendWorkModifier**: 0.75x for work tasks on weekends

Visual hints are subtle: dog posture reflects energy, task list gets "messy" at low momentum, background warmth shifts with time, game area palette shifts by time of day.

## Rendering System

The game area (`src/rendering/`) is a canvas-based system that generates a seed-determined apartment scene.

5 art style renderers (pixel, minimal, sketch, isometric, flat) implement `RoomRenderer` -- the seed picks one per run. Each draws room background/furniture, a character, and a dog in its visual style.

Everything visual is seed-derived: room layout and furniture placement (`layout.ts`), item variants like bed style, desk setup, character build/hair/skin, dog breed traits (`variants.ts`), and a hue-shifted color palette. Time-of-day palettes (`palettes.ts`) shift wall/floor/sky colors. Base colors come from CSS theme variables via `getComputedStyle`, so rendering respects the active theme.

When a task is selected, its associated furniture gets a highlight overlay. Dog mood (computed from energy, recent outcomes, phone checks) drives expressions and posture.

A dev playground at `#playground` renders all 5 styles side by side with full controls.

## Narrative Events

Events are seed-selected at run start (`selectEventsForRun`) and scheduled to specific days.

**Tiers**:
- **Tier 0** (Flavor): Ambient observations as inline banners. No choices.
- **Tier 1** (Standalone + Arcs): Minor disruptions with choices. Some form multi-event arcs (leak, delivery, construction, neighbor, power outage).
- **Tier 2** (Obligations + Opportunities): Inject temporary tasks with deadlines, offer optional activities, contextual task modifications. Includes the dog emergency arc.

At time block transitions, pending events fire if conditions are met. Major events pause gameplay on a dedicated screen. Minor events show as inline banners. `resolveEvent()` applies effects (energy/momentum changes, task injection, flag setting).

Event choices set flags in `eventFlags[]`. Later events check flags to branch -- ignoring a leak leads to a worse outcome, helping a neighbor opens an invitation.

## Unreliable Input Handling

The core mechanic: clicks don't always work.

When a task attempt fails:
1. Button receives click
2. Brief "almost" animation (button depresses slightly)
3. Returns to unpressed state
4. No error, no explanation
5. Action slot still consumed

The non-response is intentional. It looks like it should have worked.

## Persistence

localStorage with versioned save format. Auto-saves on every state change (the store subscriber calls `saveGame` on each notification). Separate save slots for "main" and "seeded" game modes. Completed runs history and lifetime stats for "Your Patterns" mode.

**Migrations** (`systems/migrations/`): When the save format changes incompatibly, a migration function transforms old data. Old types are preserved in `migrations/types.ts`. The dispatcher runs migrations sequentially from saved version to current.

No cross-device sync. Accept this limitation.

## Build & Dev

- `bun run dev` - Development server with HMR
- `bun run build` - Production build to `dist/`
- `bun run check` - Biome lint + TypeScript check
- `bun run format` - Auto-fix with Biome
- `bun test` - Run tests

Production build is static files, deployable anywhere.

## Internationalization (i18n)

Simple homegrown i18n without external dependencies. English is the source of truth (`en.ts`), additional locales use `satisfies Strings` for type safety. `strings()` accessor falls back to English for missing keys and logs warnings.

**UI strings** (`src/i18n/`): Button labels, status text, accessibility labels. Template functions for parameterized text (`s.game.slots(2)`).

**Content/narrative** (`src/data/`): Task definitions, day summaries, scroll trap text, friend dialogue, events. Separate because they have their own structure (arrays of variants, weighted selection, tiered outcomes).

## Accessibility

Screen reader and keyboard support without compromising the core mechanic.

The unreliable click mechanic works the same for all users. Sighted users see the button depress and return with no success indicator. Screen reader users hear the slot count change with no success announcement. Both learn that absence of feedback means failure. We announce successes, not failures.

- **Live region** (`#announcer`): `aria-live="polite"` with clear-then-set pattern for reliable re-announcements
- **Focus management**: Screen transitions focus primary actions, task selection moves focus to panel
- **Keyboard**: Arrow keys navigate task list, Enter/Right selects and focuses panel, Escape/Left deselects
- **ARIA**: `aria-pressed` on task buttons, `aria-describedby` linking panel actions to context
- **CSS**: `.sr-only`, `:focus-visible`, `prefers-reduced-motion`

## Future: Single-File Executable

For Steam/desktop distribution, Bun can compile to a single executable (`bun build --compile src/server.ts --outfile skill-issue`). Bundles game + server into one binary.
