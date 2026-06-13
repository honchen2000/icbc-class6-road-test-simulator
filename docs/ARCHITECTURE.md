# Architecture

A fully client-side, offline single-page app. There is **no backend** — the
evaluation engine runs in the browser, content is bundled at build time, and
state lives in `localStorage`.

```
Browser (React SPA, HashRouter)
  pages/ ── call ──► api/client.ts ── delegates ──► services/local-api.ts
                                                       │
                                  ┌────────────────────┼─────────────────────┐
                                  ▼                    ▼                     ▼
                          core/ (pure engine)   content/ (scenarios,   services/storage.ts
                          evaluator/signal/      faults, regions)       (localStorage)
                          scoring                                       services/examiner.ts
                                                                         (scripted, offline)
```

## Layers

- **`src/shared`** — `types.ts` (domain + DTO types) and `catalog.ts` (the five
  global skills, the rider action palette, scoring constants). Pure, imported by
  every layer.
- **`src/core`** — the evaluation engine: `evaluator` (expected vs. performed +
  prohibited), `signal` (signal/observation timing), `scoring` (demerits →
  pass/fail). **Pure and deterministic** (no DOM, storage, or I/O) and covered by
  the unit tests in `test/`.
- **`src/content`** — `faults.ts` (catalog), `routes.<region>.ts` (scenarios),
  and `regions.ts` (the region registry). `index.ts` flattens regions into
  `SCENARIOS` and builds lookup maps.
- **`src/client/services`** — the local data layer that replaces the old HTTP
  API: `local-api.ts` (runs the engine + content, returns the same DTOs the UI
  expects), `storage.ts` (session persistence in `localStorage`), `examiner.ts`
  (scripted examiner). `src/client/api/client.ts` is a thin async facade so the
  pages did not need to change when the backend was removed.
- **`src/client` (pages/components/lib)** — the UI. `StreetView` draws
  procedural SVG scenes (no map dependency); `lib/speech.ts` wraps the Web Speech
  API for the spoken examiner.

## Why static

It deploys anywhere with zero configuration (GitHub Pages, any static host, or
`file://`), costs nothing to run, has no secrets, works offline, and is trivial
to fork. The trade-offs versus a server: analytics is per-browser (not synced
across devices), and the examiner is scripted rather than LLM-generated.

## Routing & base path

`HashRouter` + Vite `base: './'` make all asset and route URLs relative, so the
build runs correctly from a project sub-path (e.g. GitHub Pages) without any
server-side rewrite rules.
