# Vice Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tribunshitpost/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tribunshitpost/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo and a caption into GTA 6-poster-style multi-panel cover art, exported as a PNG to share. Fully offline — no network request, no upload: photos are read on your own machine.

## What it does

- **Multi-panel poster art** — four layouts (Sunset Split, Triptych Slant, Quad Grid, Duo Diagonal) with slanted panels, a procedurally drawn retro sun and palm silhouettes, and a big bold caption band.
- **Any photo** — drop up to four of your own photos into the slots (or try the two bundled samples), give each panel its own photo, drag a panel to pan its photo, and zoom it with a slider. One toggle fills every panel with a single photo.
- **Words** — an editable caption (up to 40 characters) and tagline, with three lettering styles: Vice Bold, Neon Glow, Stamp Bar.
- **Colour grades** — Sunset, Neon Night, Pastel Dawn, Mono Noir, plus halftone dots and film grain toggles.
- **Fast export** — one click writes a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no dependencies.

## How it works

- `app/index.html` + `app/style.css` — the dark editor shell.
- `app/src/main.js` — editor state, photo loading, drag-to-pan, export.
- `app/src/cover.js` — the cover painter: sky, retro sun, palms, panels, grades, lettering, halftone, grain.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover` / `?shot=editor`).
- `main.ts` — hands the app and screenshots to make.fun's grader.

Everything in this app is original work: no Rockstar logo, artwork or font, and no image or font is fetched from the network. The two sample photos under `app/samples/` were made for make.fun with an image model and are free to use.

---

<sub>Entered on [make.fun](https://make.fun/?ref=tribunshitpost&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
