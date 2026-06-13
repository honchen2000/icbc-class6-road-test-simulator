# ICBC Class 6 Road Test Simulator 🏍️

A free, offline web app for practising the **procedure** of the BC Class 6
(motorcycle) road test: observation sequences, signalling — and the single most
common slip-up, **forgetting to cancel your turn signal**. It runs entirely in
your browser. No account, no server, no tracking, no network calls.

> ⚠️ **Disclaimer — read this.** This is an unofficial study aid. It is **not
> affiliated with or endorsed by ICBC**, and its content is community-maintained
> and **may contain errors or be out of date**. Always rely on official ICBC
> materials (e.g. *Tuning Up for Motorcyclists* / RoadSense for Riders) and a
> licensed instructor, and **practise on a real motorcycle**. Use at your own risk.

## What it does

- **Guided route scenarios** modelled on real test-centre areas (currently
  Richmond, BC), each a sequence of steps at a procedural decision point.
- **Live evaluation** against ICBC's five global skills — Observation, Speed
  Control, Steering/Vehicle Control, Space Margins, Communication — with demerit
  points and pass/fail just like the real test.
- **Signal-cancellation drill** — a focused, millisecond-timed trainer for the
  habit examiners watch every single turn.
- **Scripted examiner** with browser speech (spoken instructions + corrections),
  fully offline.
- **Weakness analytics** — per-skill demerits, most frequent faults, and a trend
  over time, stored locally in your browser.

## Try it

Live demo (GitHub Pages): `https://honchen2000.github.io/icbc-class6-road-test-simulator/`
*(enable Pages → "GitHub Actions" once, see [DEPLOYMENT.md](DEPLOYMENT.md)).*

## Quick start (local)

```bash
git clone https://github.com/honchen2000/icbc-class6-road-test-simulator.git
cd icbc-class6-road-test-simulator
npm install
npm run dev          # http://localhost:5173
```

Build a static bundle and preview it:

```bash
npm run build        # outputs ./dist
npm run preview      # serve the built site locally
```

The build in `./dist` is plain static files — host it anywhere, or just open it
locally. See **[DEPLOYMENT.md](DEPLOYMENT.md)** for GitHub Pages / Netlify /
Vercel / Cloudflare Pages.

## How scoring works

Each step declares the *correct procedure*: expected actions (each tied to a
skill), prohibited actions, and timing rules — e.g. signal on **≥ 3 s before** a
maneuver and **cancelled ≤ 3 s after**. A pure, deterministic engine
(`src/core`) compares what you did against that and emits faults; each fault's
severity maps to demerit points (`minor 5 / major 15 / dangerous 25 /
auto-fail`). You fail on any auto-fail or once points reach the threshold.

## Tech stack

React + TypeScript + Vite. **No backend** — the evaluation engine runs in the
browser, content is bundled at build time, and your sessions/analytics live in
`localStorage`. Routing uses `HashRouter` so it works from any path (project
sub-paths, even `file://`).

## Project structure

```
src/
  shared/      types.ts (domain types) + catalog.ts (skills, action palette, scoring)
  core/        evaluator / signal / scoring  — the PURE engine (unit-tested)
  content/     faults.ts (catalog) + routes.<region>.ts + regions.ts
  client/
    pages/       Home, Exam, Results, SignalDrill, Analytics
    components/  StreetView (SVG scenes), ActionPanel, ExaminerBar, ...
    services/    local-api, storage (localStorage), examiner (scripted)
    api/         client.ts (thin facade over services)
    lib/         speech.ts (Web Speech)
test/          vitest unit tests (engine + content integrity)
```

## Contributing

Adding a new test-centre region or fixing a scenario is the most valuable
contribution — see **[CONTRIBUTING.md](CONTRIBUTING.md)**. Run `npm run typecheck`
and `npm test` before opening a PR.

## License

[MIT](LICENSE) © honchen2000
