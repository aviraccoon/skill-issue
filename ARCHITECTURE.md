# Architecture

Vanilla TypeScript with a lightweight reactive pattern. No framework.

## Why Vanilla

- Focus on state machine implementation, not framework patterns
- Full control over input handling (core mechanic requires precise control)
- Minimal dependencies for long-term maintainability
- CSS does heavy lifting for state-based visuals

## Core Pattern

### Reactive Store

A simple pub/sub store manages all game state:

```ts
interface GameState {
  day: number
  timeBlock: 'morning' | 'afternoon' | 'evening' | 'night'
  slotsRemaining: number
  tasks: Task[]
  energy: number      // hidden from player
  momentum: number    // hidden from player
  dogMood: number
  // ...
}

const store = createStore<GameState>(initialState)

// Components subscribe to state slices
store.subscribe('tasks', renderTaskList)
store.subscribe('momentum', updateVisualMessiness)
```

The store is ~50 lines. State changes trigger targeted re-renders.

### Shared Controller

Both browser and CLI use a shared game controller (`core/controller.ts`):

```ts
// Decision type covers all player actions
type Decision =
  | { type: 'attempt'; taskId: string }
  | { type: 'skip' }
  | { type: 'checkPhone' }
  | { type: 'sleep' }
  | { type: 'pushThrough' }
  // ...

// Get available decisions for current screen
const decisions = getAvailableDecisions(state)

// Execute a decision
const result = executeDecision(store, decision, callbacks?)
```

Screen rendering data is computed by `getScreenInfo(state)`, which returns a discriminated union of info types for each screen (GameScreenInfo, NightChoiceInfo, etc.).

### Components

Components are functions that:
1. Receive ScreenInfo with all display data precomputed
2. Render DOM based on that data
3. Call `onDecision(decision)` when user interacts

```ts
function renderNightChoice(
  screenInfo: NightChoiceInfo,
  container: HTMLElement,
  onDecision: (decision: Decision) => void
) {
  container.innerHTML = `
    <h2>${screenInfo.dayCapitalized} Night</h2>
    <p>${screenInfo.description}</p>
    <button class="sleep">Sleep</button>
  `
  container.querySelector('.sleep')?.addEventListener('click', () => {
    onDecision({ type: 'sleep' })
  })
}
```

The browser's `App.ts` creates a `handleDecision` callback that wraps `executeDecision` with animation callbacks.

### Actions

User interactions go through action functions that:
1. Calculate success probability based on hidden state
2. Roll the dice
3. Update state accordingly
4. State change triggers UI update via subscriptions

```ts
function attemptTask(taskId: string) {
  const task = store.get('tasks').find(t => t.id === taskId)
  const probability = calculateSuccessProbability(task, store.getState())

  if (Math.random() < probability) {
    // Success path
    store.update('tasks', tasks => /* mark succeeded */)
    store.update('momentum', m => Math.min(m + 0.05, 1))
  } else {
    // Failure path - the click just... doesn't work
    playFailureAnimation(taskId)
    store.update('tasks', tasks => /* increment failure count */)
    store.update('momentum', m => Math.max(m - 0.03, 0))
  }

  store.update('slotsRemaining', s => s - 1)
}
```

## State-Driven CSS

Visual states are driven by data attributes, not JS:

```css
/* Task description evolution */
.task[data-failures="0"] .evolved { display: none; }
.task[data-failures="2"] .evolved::after { content: " - You know you should"; }
.task[data-failures="4"] .name { display: none; }
.task[data-failures="4"] .evolved { display: inline; }

/* List messiness at low momentum */
[data-momentum="low"] .task-list {
  --spacing-jitter: 3px;
  --alignment-drift: 2deg;
}

/* Time of day theming */
[data-time="night"] { --bg: var(--night-warm); }
[data-time="morning"] { --bg: var(--morning-light); }
```

## File Structure

```
src/
  index.ts          # Browser entry point
  server.ts         # Dev server (Bun.serve)
  store.ts          # Reactive store implementation
  state.ts          # GameState type, initial state, state helpers

  core/
    controller.ts   # Shared game controller (Decision, executeDecision)
    screenInfo.ts   # Screen rendering data (ScreenInfo, getScreenInfo)

  actions/
    tasks.ts        # attemptTask, selectTask
    time.ts         # advanceTimeBlock, skipToNext
    phone.ts        # checkPhone (scroll trap)
    friend.ts       # Friend rescue mechanics
    night.ts        # Sleep/push through choices

  components/
    App.ts                      # Main game UI, screen routing
    App.module.css              # Layout styles
    App.module.css.d.ts         # Auto-generated types
    NightChoice.ts              # Night choice screen
    FriendRescue.ts             # Friend rescue screen
    DaySummary.ts               # End-of-day summary screen
    WeekComplete.ts             # Week complete screen
    Task.module.css             # Task button styles
    Panel.module.css            # Task panel styles
    ThemeSwitcher.ts
    DevTools.ts

  systems/
    probability.ts  # Success rate calculations
    momentum.ts     # Momentum decay, modifiers
    energy.ts       # Hidden energy state
    evolution.ts    # Task description evolution
    dog.ts          # Dog urgency system
    friend.ts       # Friend rescue triggers
    allnighter.ts   # All-nighter mechanics
    personality.ts  # Seed-based personality

  data/
    tasks.ts        # Task definitions
    daySummary.ts   # Day summary narrative text
    scrollTrap.ts   # Phone check flavor text

  i18n/
    types.ts        # Strings type for translations
    en.ts           # English strings (source of truth)
    index.ts        # strings() accessor with fallback

  styles/
    base.css        # Reset, CSS variables, time theming
    themes.css      # Theme variable overrides

  utils/
    random.ts       # Seeded random for reproducibility
    math.ts         # Clamp, lerp utilities
    string.ts       # capitalize, etc.

  cli/              # CLI simulation tool (see src/cli/README.md)
    index.ts        # Entry point
    engine.ts       # Simulation loop, strategies
    commands/       # Command implementations

scripts/
  gen-css-types.ts  # Generates .d.ts files for CSS modules

index.html
```

## CSS

CSS is split between global styles and CSS modules:

**Global styles** (`src/styles/`):
- `base.css` - Reset, CSS variables, `[data-time]` theming
- `themes.css` - `[data-theme]` variable overrides

**CSS modules** (`src/components/*.module.css`):
- Component-specific styles with scoped class names
- Co-located `.d.ts` files for type safety
- Run `bun run gen:css-types` after changing CSS classes

Import in TypeScript:
```ts
// Global CSS
import './styles/base.css'

// CSS modules
import styles from './App.module.css'
element.className = styles.header  // Type-checked
```

Features available:
- **Nested CSS** - Native nesting without preprocessor
- **CSS Variables** - Theme and time-block styling via custom properties

## Hidden State Machine

The player never sees energy or momentum directly. These affect success rates:

```
Success Rate = baseRate
  * timeModifier(timeBlock)      // 2am spike: +25%
  * momentumModifier(momentum)   // -30% to +30%
  * energyModifier(energy)       // -20% to +20%
  * taskTypeModifier(task.type)  // aspirational: 0.5x, routine: 1.2x
```

Visual hints exist but are subtle:
- Dog's posture/energy reflects player energy
- Task list gets "messy" at low momentum
- Background warmth shifts with time

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

localStorage for:
- Current run state (auto-save after each time block)
- Completed runs history
- Unlocked "Your Patterns" mode

No cross-device sync. Accept this limitation.

## Build & Dev

- `bun run dev` - Development server with HMR
- `bun run build` - Production build to `dist/`
- `bun run check` - Biome lint + TypeScript check
- `bun run format` - Auto-fix with Biome
- `bun test` - Run tests

Production build is static files, deployable anywhere.

## Internationalization (i18n)

Simple homegrown i18n without external dependencies.

### Structure

```
src/i18n/
  types.ts    # Strings type derived from English
  en.ts       # English strings (source of truth)
  index.ts    # strings() accessor with fallback
  # cs.ts     # Czech (future)
```

### Usage

```ts
import { strings } from '../i18n'

const s = strings()
button.textContent = s.game.attempt
slotsEl.textContent = s.game.slots(2)  // "2 slots remaining"
liveRegion.textContent = s.a11y.taskSucceeded('Shower')
```

### Adding a Language

1. Create `src/i18n/cs.ts` (or other locale)
2. Use `satisfies Strings` to ensure all keys are present:
   ```ts
   import type { Strings } from './types'
   export const cs = { ... } satisfies Strings
   ```
3. Add to `locales` object in `index.ts`
4. TypeScript enforces matching structure and function signatures

### Fallback Behavior

If a translation is missing, the system:
1. Falls back to English
2. Logs a warning: `[i18n] Missing translation for "game.attempt" in locale "cs"`

This allows incremental translation without breaking the game.

### What Lives Where

- **UI strings** (`src/i18n/`): Button labels, status text, accessibility labels
- **Content/narrative** (`src/data/`): Task definitions, day summaries, scroll trap text, friend dialogue

Content files may eventually need i18n, but are separate because they have their own structure (arrays of variants, weighted selection, etc.).

## Future: Single-File Executable

For Steam/desktop distribution, Bun can compile to a single executable:

```sh
bun build --compile src/server.ts --outfile skill-issue
```

This bundles the game + server into one binary. Useful for distribution without requiring Bun installed.
