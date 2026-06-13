# Deployment

This is a **static site** — `npm run build` produces plain HTML/CSS/JS in
`./dist` with no backend, no database, and no secrets. Host it anywhere, or run
it locally. The app uses `HashRouter` and a relative base (`base: './'`), so it
works from any path, including project sub-paths and `file://`.

## Run locally

```bash
npm install
npm run dev          # dev server with HMR at http://localhost:5173
# or, the production build:
npm run build        # -> ./dist
npm run preview      # serve ./dist locally (default http://localhost:4173)
```

You can even open `dist/index.html` straight from disk (`file://`) — everything
runs offline in the browser.

## GitHub Pages (recommended free demo)

A workflow at `.github/workflows/deploy-pages.yml` builds and deploys on every
push to `main`. One-time setup:

1. Push the repo to GitHub (must be **public**, or have Pages enabled on a plan).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. Push to `main` (or run the workflow manually). The site publishes at
   `https://<user>.github.io/<repo>/`.

No configuration is needed for the sub-path — the relative base + HashRouter
handle it.

## Netlify / Vercel / Cloudflare Pages

Connect the repo and use:

- **Build command:** `npm run build`
- **Output / publish directory:** `dist`
- **Install command:** `npm ci`

No environment variables or functions are required.

## Any static host / self-host

Upload the contents of `dist/` to any static file host (S3 + CloudFront, nginx,
Caddy, GitHub Pages, a USB stick…). Because routing is hash-based, you do **not**
need SPA rewrite rules.

## Notes

- **Offline:** the app makes no network requests at runtime; it is a candidate
  for a PWA / "Add to Home Screen" if you want installable offline use.
- **Data:** practice sessions and analytics are stored in the browser's
  `localStorage` (per device/browser). Clearing site data resets them.
- **Updating content:** there is no database to migrate — content is bundled at
  build time, so a new `npm run build` (and redeploy) ships updated scenarios.
