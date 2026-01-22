# Skill Issue

A task management game where the controls don't work reliably.

## Run locally

```sh
bun install
bun run dev
```

## Build

```sh
bun run build
```

## CLI

A headless simulation tool for exploring game mechanics, running automated playthroughs, and finding interesting seeds.

```sh
bun run cli --help
bun run cli sim --seed 12345          # Run simulation
bun run cli play --seed 12345         # Play interactively
bun run cli compare -n 100            # Compare strategies
bun run cli find-seed --survived -l 5 # Find seeds matching criteria
```

See [src/cli/README.md](src/cli/README.md) for full documentation.

## License

Code: MIT | Content: All Rights Reserved

See LICENSE for details.
