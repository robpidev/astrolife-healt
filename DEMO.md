# Interactive demo

The demo runs the real Astrolife UI on a snapshot of realistic data, with no
database and no login. It is meant for reviewers, portfolios and first-time
visitors: open the app, follow the guided tour, add a heart-rate reading, and
reset everything when you are done.

## How it works

- `src/lib/demo/mock-data.json` is a snapshot of the real load results, produced
  by `scripts/snapshot-demo-data.ts` from the local SQLite database.
- `src/lib/demo/mock-data.ts` exposes the same shapes the pages expect and
  replays the readings added during the session.
- `src/lib/forms/enhance.ts` replaces `$app/forms`'s `enhance` in demo mode, so
  form submissions never reach a server.
- `src/hooks.server.ts` marks the session with a cookie and rejects any non-GET
  request while the demo is active.
- `src/lib/demo/tour.ts` drives the guided tour with `driver.js`.

## Local development

```bash
bun run dev
# open http://localhost:5173/?demo=1
```

`?demo=1` sets a session cookie, so the demo survives navigation and reloads.
The tour starts automatically the first time.

To start every session in demo mode:

```bash
bun run dev:demo
```

## Static build

```bash
bun run build:demo
```

The script copies the project to `.demo/`, removes every server load and route
outside the demo, generates universal loads backed by the snapshot, and builds
with `@sveltejs/adapter-static`. The output is `.demo/build`, with `200.html` as
the SPA fallback.

Preview it with any static server:

```bash
bunx serve .demo/build
```

## Deployment

### Vercel

- Build command: `bun run build:demo`
- Output directory: `.demo/build`
- Add a rewrite so every path serves `200.html`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/200.html" }] }
```

### Netlify

- Build command: `bun run build:demo`
- Publish directory: `.demo/build`
- Add `_redirects` to the publish directory:

```text
/*  /200.html  200
```

### GitHub Pages

Project sites live under `/<repo>`, so pass the base path and use `404.html` as
the fallback:

```bash
BASE_PATH=/astrolife-healt DEMO_FALLBACK=404.html bun run build:demo
```

Publish `.demo/build` to the `gh-pages` branch.

## Demo behaviour

- **Add reading** on the heart-rate page persists for the session and updates
  the chart, the history and the cardiovascular card.
- Other forms resolve successfully but do not change the snapshot.
- **Reset demo** clears the added readings and returns to the crew dashboard.
- **Exit demo** removes the demo cookie and reloads the real app. It is hidden in
  the static build, where the whole site is the demo.

## Regenerating the snapshot

After changing the seed data or the load shapes:

```bash
bun run snapshot:demo
```

Commit the updated `src/lib/demo/mock-data.json`.
