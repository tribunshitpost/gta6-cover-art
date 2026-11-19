// Retakes the entry's screenshots with headless Chromium.
//
// Serves app/ on port 8091, opens each scene from shots.json at its viewport
// size, waits for the page to set window.__shotReady, and writes a JPEG into
// screenshots/. Run from the repo root: `node take-shots.mjs`.
//
// Chromium comes from the Playwright browser cache on this machine; the
// playwright-core package is loaded from the tmp-shot install beside the kit.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(
  '/home/hatch/workspace/makefun/gta6-cover-art-01/tmp-shot/node_modules/playwright-core',
);

const repo = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf-8'));
const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const PORT = 8091;

function waitForServer(url, tries = 60) {
  return new Promise((resolve, reject) => {
    let left = tries;
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch { /* not up yet */ }
      if (--left <= 0) return reject(new Error('server never came up'));
      setTimeout(tick, 250);
    };
    tick();
  });
}

const server = spawn(
  process.execPath,
  ['serve.ts', '--port', String(PORT)],
  { cwd: repo, stdio: 'ignore' },
);

try {
  await waitForServer(`http://localhost:${PORT}/`);
  const browser = await chromium.launch({ executablePath: CHROME });
  try {
    for (const shot of shots) {
      const page = await browser.newPage({ viewport: { width: shot.vw, height: shot.vh } });
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(String(err)));
      await page.goto(`http://localhost:${PORT}/${shot.query}`, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
      await page.screenshot({
        path: join(repo, 'screenshots', shot.name),
        type: 'jpeg',
        quality: 82,
      });
      if (errors.length > 0) {
        console.log(`${shot.name}: console errors: ${errors.join(' | ')}`);
      } else {
        console.log(`${shot.name}: ok, no console errors`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}
console.log('done');
