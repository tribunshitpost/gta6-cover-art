// Re-captures the Vice Sunset screenshots with headless Chromium.
// Reads shots.json from this repo, serves app/ on :8081, waits for each scene
// to set window.__shotReady, then saves a JPEG into screenshots/.
// Run from the repo root: node take-shots.mjs
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(repo, '..', 'tmp-shot', 'package.json'));
const { chromium } = require('playwright-core');
const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
const chromeExe = process.env.HOME + '/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';

// Clear the starter screenshots so a failed shot can never leave a stale file.
for (const name of readdirSync(join(repo, 'screenshots'))) {
  if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
    rmSync(join(repo, 'screenshots', name));
  }
}

const server = spawn('node', ['serve.ts', '--port', '8091'], { cwd: repo, stdio: 'pipe' });
await new Promise((r) => setTimeout(r, 1500));
const browser = await chromium.launch({
  executablePath: chromeExe,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});

async function takeShot(page, shot, quality) {
  await page.goto(`http://localhost:8091/${shot.query}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 60000 });
  await page.screenshot({ path: join(repo, 'screenshots', shot.name), type: 'jpeg', quality });
  return statSync(join(repo, 'screenshots', shot.name)).size;
}

let failed = 0;
try {
  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.vw, height: shot.vh } });
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    try {
      let quality = 82;
      let size = await takeShot(page, shot, quality);
      while (size > 262144 && quality > 40) {
        quality -= 15;
        size = await takeShot(page, shot, quality);
      }
      console.log(`${shot.name}: ${size} bytes quality=${quality} errors=${JSON.stringify(errors.slice(0, 5))}`);
      if (size > 262144 || errors.length) failed += 1;
    } catch (e) {
      console.log(`${shot.name}: FAILED ${e.message} errors=${JSON.stringify(errors.slice(0, 5))}`);
      failed += 1;
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failed === 0 ? 'done: all shots clean' : `done: ${failed} shot(s) had problems`);
process.exit(failed === 0 ? 0 : 1);
