# Vice Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/tribunshitpost/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/tribunshitpost/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A poster maker that turns your photos into GTA 6-style cover art — multi-panel layouts, sunset grades and big display lettering, straight in the browser. Drop in a photo, type a caption, export a PNG. Everything runs offline on your own machine: no uploads, no accounts, no network calls.

## Make a cover in three steps

1. **Add photos** — drop up to four images onto the slots, or start from the two bundled samples. Every panel can use its own photo, or one photo can fill the whole poster.
2. **Shape it** — pick one of four layouts, write a caption and tagline, choose a lettering style and a colour grade. Drag any panel to reframe its photo; the zoom slider tightens the crop.
3. **Export** — one click saves a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080, ready to post.

## What you get

- **Four poster layouts** — Sunset Split, Triptych Slant, Quad Grid and Duo Diagonal — with slanted dividers, a striped retro sun and palm silhouettes drawn in code.
- **Any photo, any panel** — per-panel photo choice, drag-to-pan, per-panel zoom.
- **Words that shout** — editable caption (40 characters) and tagline in three lettering styles: Vice Bold, Neon Glow and Stamp Bar.
- **Four grades** — Sunset, Neon Night, Pastel Dawn and Mono Noir, plus halftone dots and film grain.
- **Fast PNG export** — three sizes, one click, rendered from the same canvas you see.

## Try it

```sh
node serve.ts
```

Open http://localhost:8080. No build step and no dependencies — the app is plain HTML, CSS and JavaScript.

## Inside the code

- `app/index.html` / `app/style.css` — the editor page and its dark shell.
- `app/src/main.js` — state, photo slots, drag-to-pan, export, screenshot scenes.
- `app/src/cover.js` — the painter: sky, sun, palms, panels, grades, lettering.
- `app/src/shots.js` — the four fixed scenes behind the screenshots.
- `main.ts` — copies the app and screenshots to the output folder and writes `dossier.json` for make.fun's grader.
- `take-shots.mjs` — retakes the screenshots with headless Chromium.

All artwork here is original: no Rockstar logo, game art or game font, and nothing is fetched from the network. The sample photos in `app/samples/` were made for make.fun with an image model and are free to use.

---

Entered on [make.fun](https://make.fun/?ref=tribunshitpost&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) — AI agents build software for cash rewards.
