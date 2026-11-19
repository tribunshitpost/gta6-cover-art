// take-shots.mjs — retake the four screenshots with headless Chromium.
//
// Node 22, standard library only. It starts serve.ts on port 8091, drives the
// Playwright-bundled Chromium over the DevTools protocol (plain WebSocket, no
// extra packages), waits for each scene's window.__shotReady, and writes a
// JPEG per shot into screenshots/. Run it with `node take-shots.mjs`.
//
// Usage: node take-shots.mjs [--keep-server]

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/home/hatch/.cache/ms-playwright/chromium-1148/chrome-linux/chrome';
const PORT = 8091;
const DEBUG_PORT = 9223;
const repoDir = dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(repoDir, 'shots.json'), 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait until `fn` returns true, or throw after `timeoutMs`. */
async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  for (;;) {
    if (await fn()) return;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await sleep(150);
  }
}

/** A tiny DevTools-protocol client over one WebSocket. */
class DevTools {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }
  ready() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return r.result?.value;
  }
  close() { this.ws.close(); }
}

async function main() {
  // 1. Serve the app on port 8091.
  const server = spawn(process.execPath, ['serve.ts'], {
    cwd: repoDir,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await waitFor(async () => {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/`);
      return r.ok;
    } catch { return false; }
  }, 15000, 'the dev server');

  // 2. Launch headless Chromium with a debugging port.
  const profile = join(repoDir, '.shot-profile');
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  let target = null;
  await waitFor(async () => {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
      return Boolean(target);
    } catch { return false; }
  }, 20000, 'Chromium to listen');

  const dev = new DevTools(target.webSocketDebuggerUrl);
  await dev.ready();
  await dev.send('Page.enable');
  await dev.send('Runtime.enable');

  // 3. One screenshot per shot in shots.json.
  for (const shot of shots) {
    await dev.send('Emulation.setDeviceMetricsOverride', {
      width: shot.w, height: shot.h, deviceScaleFactor: 1, mobile: false,
    });
    const url = `http://127.0.0.1:${PORT}/?shot=${shot.shot}&n=${shot.n}&w=${shot.w}&h=${shot.h}`;
    await dev.send('Page.navigate', { url });
    await waitFor(
      async () => (await dev.eval('window.__shotReady === true')) === true,
      20000,
      `__shotReady for ${shot.file}`,
    );
    await sleep(250);
    let quality = 82;
    for (;;) {
      const { data } = await dev.send('Page.captureScreenshot', { format: 'jpeg', quality });
      const bytes = Buffer.from(data, 'base64');
      if (bytes.length <= 262144 || quality <= 60) {
        writeFileSync(join(repoDir, 'screenshots', shot.file), bytes);
        console.log(`${shot.file}: ${bytes.length} bytes (quality ${quality})`);
        break;
      }
      quality -= 8;
    }
  }

  dev.close();
  chrome.kill();
  server.kill();
  console.log('done.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
