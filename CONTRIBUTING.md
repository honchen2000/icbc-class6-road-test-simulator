# Contributing

Thanks for helping make this a better study aid! The most valuable contributions
are **content** — fixing a scenario, correcting a fault, or adding a new
test-centre region — because that is where the app's accuracy and reach come from.

> Please keep everything **in English** (UI text, content, code, comments).

## Setup

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # type-check
npm test           # run the unit suite (vitest)
npm run build      # produce ./dist
```

Open a PR with `typecheck`, `test`, and `build` all passing (CI runs them too).

## Accuracy first

Content should reflect official ICBC guidance (*Tuning Up for Motorcyclists* /
RoadSense for Riders). When you change a rule or fault, cite the source in your
PR description. If you are unsure whether something is correct, open an issue to
discuss rather than guessing — riders rely on this.

## How content is organised

- `src/shared/types.ts` — the domain types (`Scenario`, `ScenarioStep`,
  `ExpectedAction`, `TimingRule`, `FaultType`, `Region`, …).
- `src/shared/catalog.ts` — the five global skills, the rider **action palette**
  (`ACTIONS`), and the scoring constants. Only actions listed here can be used.
- `src/content/faults.ts` — the fault catalog (`FAULT_TYPES`). Every `faultCode`
  referenced by a scenario must exist here.
- `src/content/routes.<region>.ts` — the scenarios for a region.
- `src/content/regions.ts` — registers each region.

The engine in `src/core` is **pure** and does not need changing for content work.

## Add or edit a scenario

1. Edit (or add) `src/content/routes.<region>.ts`. A scenario is an ordered list
   of steps; each step lists `expected` actions (with `skill`, `order`,
   `faultCode`), optional `prohibited` actions, and `timing` rules. On every turn
   include the signal-before (`SIGNAL_TOO_LATE`), signal-cancel-after
   (`SIGNAL_NOT_CANCELLED`), and the relevant observation-before rule.
2. Use only `ActionType` values from `ACTIONS`, and only `faultCode`s that exist
   in `FAULT_TYPES`. The content-integrity test enforces both.
3. Run `npm test` — `test/content.test.ts` checks every reference is valid.

## Add a new region (test centre)

1. Create `src/content/routes.<region>.ts` exporting `export const SCENARIOS:
   Scenario[] = [ ... ]`.
2. Register it in `src/content/regions.ts`:
   ```ts
   import { SCENARIOS as VANCOUVER_SCENARIOS } from './routes.vancouver';
   export const REGIONS: Region[] = [
     { id: 'richmond', name: 'Richmond, BC', scenarios: RICHMOND_SCENARIOS },
     { id: 'vancouver', name: 'Vancouver, BC', scenarios: VANCOUVER_SCENARIOS },
   ];
   ```
3. Give each scenario a unique kebab-case `id` and set its `area` to the region
   name. Run `npm test` and `npm run typecheck`.

## Add a fault type

Add an entry to `FAULT_TYPES` in `src/content/faults.ts` with a unique `code`,
the right `skill` and `severity`, a clear `title`/`description`, and an
actionable `coaching` tip. Then reference its `code` from scenario steps.

## Scenes

Step scenes are procedural SVG keyed by `streetView.fallbackScene`
(`src/client/components/StreetView.tsx`). New scene kinds go in `SceneKind`
(`src/shared/types.ts`) plus a branch in `renderScene`.

## Code style

TypeScript strict mode, relative imports, no new runtime dependencies without
discussion. Keep the engine pure (no DOM / storage / I/O).
