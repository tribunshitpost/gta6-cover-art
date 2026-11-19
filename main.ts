// Vice Sunset Cover Studio — the hand-in program (Node 22, standard library only).
//
// What it does: it gathers this repository's app/ folder and screenshots/
// folder into the grader's output directory and writes dossier.json there,
// using the vendored make.fun helper. The app itself is plain static files
// (app/index.html plus its ES modules) that any static server can serve, and
// it works offline in a desktop browser with no network request at all.
//
// Try it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// then open out/dossier.json to see the summary the judge reads.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, as the kit's reference states them: the dossier text is
// capped at 160 KiB; at most 4 screenshots, each at most 256 KiB; app/ holds at
// most 993 files and 48 MiB in all, with no path over 1000 bytes. The output
// directory is rebuilt from scratch on every run, so a stale file never leaks
// from one run into the next.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
