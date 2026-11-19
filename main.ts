// main.ts — hand the app and screenshots to make.fun's grader.
//
// Node 22, standard library only. Run it with `node main.ts` (or set
// MAKEFUN_OUTPUT_DIR to pick another output directory). It copies app/ and
// screenshots/ into the output directory, then writes dossier.json there with
// the kit's buildDossier — the same function the scorer runs, so the dossier
// it writes is the dossier the scorer regenerates.

import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const repoDir = dirname(fileURLToPath(import.meta.url));

// Start from a clean output directory, so a stale file can never leak in.
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});

const dossierPath = join(outDir, 'dossier.json');
writeFileSync(dossierPath, dossier);
console.log(`wrote ${dossierPath} (${dossier.length} bytes)`);
// The grader rebuilds this same dossier from the output directory, so a
// byte-for-byte match here means the entry is self-consistent.
console.log(`output holds app/ and screenshots/ (${dossier.length} byte dossier)`);
