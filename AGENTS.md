# Agent Guidelines

## Key References

- @ARCHITECTURE.md for technical approach
- @README.md for project overview

## Communication Style

- No emoji in responses or generated content
- No marketing language ("comprehensive", "robust", "cutting-edge", etc.)
- Be concise in responses and generated code
- Direct, technical communication

## Technical Approach

- Vanilla TypeScript, no framework
- Reactive store pattern for state management
- CSS data attributes for state-driven visuals
- Bun for tooling (dev server, build, test)

## Working on this Codebase

- Read files before modifying them
- Run `bun run check` before proposing changes - fix ALL warnings, not just errors
- No type casting or non-null assertions to silence errors - fix the actual issue
- Use the reactive store pattern, don't add framework dependencies
- Keep components as pure functions where possible
- Write JSDoc comments for functions (types are in TypeScript, JSDoc is for descriptions)

## Project Context

- This is a game, not a productivity app
- The unreliable input is intentional, not a bug
- Hidden state (energy, momentum) should stay hidden from UI
- Visual hints for hidden state should be subtle

## Common Pitfalls

- Don't add React, Svelte, or other frameworks
- Don't expose hidden state directly to the player
- Don't add error messages for failed task attempts
- Don't over-engineer the store (keep it ~50 lines)
- Don't add analytics or tracking

## Bun Usage

- `bun run dev` for development
- `bun run check` for lint + type check (Biome + tsc)
- `bun run format` for auto-fix
- `bun test` for tests
- `bun run build` for production
- `bun run gen:css-types` to regenerate CSS module type declarations
- Use Bun APIs over Node.js equivalents where available

## CSS Modules

Component styles use CSS modules (`.module.css` files). Type declarations are co-located (`*.module.css.d.ts`) and auto-generated.

After adding/removing/renaming CSS classes, run `bun run gen:css-types` to update the type declarations. This keeps TypeScript happy with `noUncheckedIndexedAccess` enabled.

## Testing

Write tests when possible. This game has hidden mechanics that are easy to break without noticing.

Good candidates for testing:
- Probability calculations (time modifiers, momentum, energy)
- Store reactivity (subscriptions fire correctly)
- State transitions (time blocks, day advancement)
- Task evolution logic (failure count thresholds)
- Momentum/energy decay and bounds

Tests help find blind spots and verify the game behaves as designed. Run `bun test` to execute.

## Response Format

End every response with a pun, joke, or quip related to task management, executive dysfunction, productivity, ADHD, or similar themes. Keep it short and dry. This matches the game's dark comedy tone.
