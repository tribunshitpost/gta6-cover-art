// main.js — the editor for Vice Sunset Cover Studio.
//
// Owns the state (photos, layout, words, grade, export), wires the sidebar
// controls to the canvas, and applies the fixed screenshot scenes. The actual
// pixels come from cover.js; the scenes come from shots.js. No module here
// imports this one back, so there is no import cycle.

import { paintCover, PANEL_COUNT, LAYOUT_IDS, LAYOUT_NAMES, pointInPoly } from './cover.js';
import { SCENES, sceneFor, shotParams } from './shots.js';

/** The three export sizes. */
const EXPORT_SIZES = [
  { w: 1080, h: 1080, label: '1080 × 1080' },
  { w: 1080, h: 1350, label: '1080 × 1350' },
  { w: 1920, h: 1080, label: '1920 × 1080' },
];

/** The two bundled sample photos. */
const SAMPLES = { boulevard: 'samples/boulevard.jpg', pier: 'samples/pier.jpg' };

/** The whole editor state. */
const state = {
  layout: 'triptych',
  grade: 'sunset',
  lettering: 'vice',
  caption: 'SUNSET HEIST',
  tagline: 'VICE CITY • 2026',
  halftone: true,
  grain: true,
  fillOne: false,
  fillPhoto: 0,
  photos: [null, null, null, null],
  panels: [
    { photo: 0, px: 0.5, py: 0.5, zoom: 1 },
    { photo: 1, px: 0.5, py: 0.5, zoom: 1 },
    { photo: 2, px: 0.5, py: 0.5, zoom: 1 },
    { photo: 3, px: 0.5, py: 0.5, zoom: 1 },
  ],
};

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const ctx2d = stage.getContext('2d');
let geometry = [];
let drag = null;

// ---------------------------------------------------------------- photos

/** Load an image from a URL and resolve with it once decoded. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`cannot load ${url}`));
    img.src = url;
  });
}

/** Put a sample photo into slot `i` (by sample name). */
async function setSample(i, name) {
  const img = await loadImage(SAMPLES[name]);
  state.photos[i] = { name: `${name} sample`, img };
  syncSlots();
  repaint();
}

/** Put a user file into slot `i`. */
function setFile(i, file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    loadImage(reader.result).then((img) => {
      state.photos[i] = { name: file.name, img };
      syncSlots();
      repaint();
    });
  };
  reader.readAsDataURL(file);
}

/** Make sure slot `i` holds the sample `name`, loading it when needed. */
async function ensureSample(i, name) {
  const cur = state.photos[i];
  if (cur && cur.name === `${name} sample`) return;
  await setSample(i, name);
}

// ---------------------------------------------------------------- painting

/** The photo images in slot order, for the painter. */
function photoImages() {
  return state.photos.map((p) => (p ? p.img : null));
}

/** The per-panel slots the painter sees, honouring fill-one. */
function panelSlots() {
  return state.panels.map((p) => ({
    photo: state.fillOne ? state.fillPhoto : p.photo,
    px: p.px, py: p.py, zoom: p.zoom,
  }));
}

/** Repaint the preview canvas from the current state. */
function repaint() {
  const opts = {
    layout: state.layout, grade: state.grade, lettering: state.lettering,
    caption: state.caption, tagline: state.tagline,
    halftone: state.halftone, grain: state.grain,
    panels: panelSlots(), photos: photoImages(),
  };
  geometry = paintCover(stage, opts);
}

/** Render the current state to an offscreen canvas at `w`×`h` and download it. */
function exportPng(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  paintCover(off, {
    layout: state.layout, grade: state.grade, lettering: state.lettering,
    caption: state.caption, tagline: state.tagline,
    halftone: state.halftone, grain: state.grain,
    panels: panelSlots(), photos: photoImages(),
  });
  off.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-sunset-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
}

// ---------------------------------------------------------------- sidebar UI

/** Rebuild the photo-slot cards. */
function syncSlots() {
  const wrap = $('slots');
  wrap.innerHTML = '';
  state.photos.forEach((slot, i) => {
    const card = document.createElement('div');
    card.className = 'slot';
    card.dataset.slot = String(i);
    const label = document.createElement('div');
    label.className = 'slot-head';
    const name = document.createElement('strong');
    name.textContent = `Photo ${'ABCD'[i]}`;
    const status = document.createElement('span');
    status.textContent = slot ? slot.name : 'Empty slot';
    label.append(name, status);
    const row = document.createElement('div');
    row.className = 'slot-row';
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'btn light';
    pick.textContent = 'Choose File';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    pick.addEventListener('click', () => input.click());
    input.addEventListener('change', () => setFile(i, input.files[0]));
    row.append(pick, input);
    const samples = document.createElement('div');
    samples.className = 'slot-row';
    for (const [key, labelText] of [['pier', 'Pier sample'], ['boulevard', 'Boulevard sample']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ghost';
      b.textContent = labelText;
      b.addEventListener('click', () => setSample(i, key).catch(() => {}));
      samples.append(b);
    }
    card.append(label, row, samples);
    // Drag a file straight onto a slot card.
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('over'); });
    card.addEventListener('dragleave', () => card.classList.remove('over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('over');
      setFile(i, e.dataTransfer.files[0]);
    });
    wrap.append(card);
  });
}

/** Rebuild the per-panel rows for the current layout. */
function syncPanels() {
  const wrap = $('panelRows');
  wrap.innerHTML = '';
  const count = PANEL_COUNT[state.layout];
  for (let i = 0; i < count; i++) {
    const p = state.panels[i];
    const row = document.createElement('div');
    row.className = 'panel-row';
    const head = document.createElement('div');
    head.className = 'panel-head';
    head.textContent = `Panel ${i + 1}`;
    const sel = document.createElement('select');
    sel.setAttribute('aria-label', `Photo for panel ${i + 1}`);
    state.photos.forEach((slot, j) => {
      const opt = document.createElement('option');
      opt.value = String(j);
      opt.textContent = slot ? `Photo ${'ABCD'[j]} — ${slot.name}` : `Photo ${'ABCD'[j]} (empty)`;
      sel.append(opt);
    });
    sel.value = String(p.photo);
    sel.addEventListener('change', () => {
      p.photo = Number(sel.value);
      repaint();
    });
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '2.5';
    zoom.step = '0.05';
    zoom.value = String(p.zoom);
    zoom.setAttribute('aria-label', `Zoom for panel ${i + 1}`);
    zoom.addEventListener('input', () => {
      p.zoom = Number(zoom.value);
      repaint();
    });
    const zoomLabel = document.createElement('span');
    zoomLabel.className = 'zoom-label';
    zoomLabel.textContent = 'Zoom';
    row.append(head, sel, zoomLabel, zoom);
    wrap.append(row);
  }
  $('fillOne').checked = state.fillOne;
  $('fillPhoto').value = String(state.fillPhoto);
}

/** Fill a radio group from a value map and wire it to `onPick`. */
function radioGroup(name, values, current, onPick) {
  const wrap = document.querySelector(`[data-radio="${name}"]`);
  wrap.innerHTML = '';
  values.forEach(([value, label]) => {
    const lab = document.createElement('label');
    lab.className = 'choice';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = value === current;
    input.addEventListener('change', () => onPick(value));
    lab.append(input, document.createTextNode(label));
    wrap.append(lab);
  });
}

/** Push the state into every control (after a scene or layout change). */
function syncAll() {
  $('caption').value = state.caption;
  $('captionCount').textContent = `${state.caption.length}/40`;
  $('tagline').value = state.tagline;
  $('halftone').checked = state.halftone;
  $('grain').checked = state.grain;
  radioGroup('layout', LAYOUT_IDS.map((id) => [id, LAYOUT_NAMES[id]]), state.layout, (v) => {
    state.layout = v;
    syncPanels();
    repaint();
  });
  radioGroup('grade', [['sunset', 'Sunset'], ['neon', 'Neon Night'], ['pastel', 'Pastel Dawn'], ['mono', 'Mono Noir']], state.grade, (v) => {
    state.grade = v;
    repaint();
  });
  radioGroup('lettering', [['vice', 'Vice Bold'], ['neon', 'Neon Glow'], ['stamp', 'Stamp Bar']], state.lettering, (v) => {
    state.lettering = v;
    repaint();
  });
  syncSlots();
  syncPanels();
}

// ---------------------------------------------------------------- drag to pan

/** Canvas pixel coordinates of a pointer event. */
function canvasPoint(e) {
  const r = stage.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * stage.width,
    y: ((e.clientY - r.top) / r.height) * stage.height,
  };
}

stage.addEventListener('pointerdown', (e) => {
  const { x, y } = canvasPoint(e);
  const hit = geometry.find((g) => pointInPoly(x, y, g.poly));
  if (!hit) return;
  const p = state.panels[hit.slot];
  const img = photoImages()[state.fillOne ? state.fillPhoto : p.photo];
  if (!img) return;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(hit.box.w / iw, hit.box.h / ih) * p.zoom;
  drag = { slot: hit.slot, startX: x, startY: y, px: p.px, py: p.py, dw: iw * scale, dh: ih * scale };
  stage.setPointerCapture(e.pointerId);
  stage.style.cursor = 'grabbing';
});

stage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const { x, y } = canvasPoint(e);
  const p = state.panels[drag.slot];
  p.px = Math.min(1, Math.max(0, drag.px - (x - drag.startX) / drag.dw));
  p.py = Math.min(1, Math.max(0, drag.py - (y - drag.startY) / drag.dh));
  repaint();
});

stage.addEventListener('pointerup', () => {
  drag = null;
  stage.style.cursor = 'grab';
});

// ---------------------------------------------------------------- scenes

/** Apply a scene snapshot (from shots.js) to the editor. */
async function applyScene(scene) {
  const s = scene.state;
  for (let i = 0; i < s.photos.length; i++) {
    if (s.photos[i]) await ensureSample(i, s.photos[i]);
  }
  state.layout = s.layout;
  state.grade = s.grade;
  state.lettering = s.lettering;
  state.caption = s.caption;
  state.tagline = s.tagline;
  state.halftone = s.halftone;
  state.grain = s.grain;
  state.fillOne = s.fillOne;
  s.panels.forEach((p, i) => {
    state.panels[i] = { ...p };
  });
  syncAll();
  repaint();
}

// ---------------------------------------------------------------- boot

/** Wire the static controls once. */
function wireStatic() {
  $('caption').addEventListener('input', (e) => {
    state.caption = e.target.value.slice(0, 40);
    $('captionCount').textContent = `${state.caption.length}/40`;
    repaint();
  });
  $('tagline').addEventListener('input', (e) => {
    state.tagline = e.target.value;
    repaint();
  });
  $('halftone').addEventListener('change', (e) => {
    state.halftone = e.target.checked;
    repaint();
  });
  $('grain').addEventListener('change', (e) => {
    state.grain = e.target.checked;
    repaint();
  });
  $('fillOne').addEventListener('change', (e) => {
    state.fillOne = e.target.checked;
    syncPanels();
    repaint();
  });
  $('fillPhoto').addEventListener('change', (e) => {
    state.fillPhoto = Number(e.target.value);
    repaint();
  });
  const exp = $('exports');
  EXPORT_SIZES.forEach(({ w, h, label }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn accent';
    b.textContent = `PNG ${label}`;
    b.addEventListener('click', () => exportPng(w, h));
    exp.append(b);
  });
}

async function boot() {
  wireStatic();
  const params = shotParams();
  const scene = sceneFor(params.shot);
  if (scene) {
    // Fixed screenshot scene: paint exactly what the scene says.
    if (params.shot === 'cover') {
      document.body.classList.add('shot-cover');
      if (params.w > 0 && params.h > 0) {
        stage.width = params.w;
        stage.height = params.h;
      }
    }
    if (params.shot === 'editor') {
      // Compact chrome so the whole preview fits a 1280x720 frame.
      document.body.classList.add('shot-editor');
    }
    await applyScene(scene);
  } else {
    // Plain editor: two samples ready to play with.
    await Promise.all([ensureSample(0, 'boulevard'), ensureSample(1, 'pier')]);
    syncAll();
    repaint();
  }
  window.__shotReady = true;
}

boot().catch((err) => {
  console.error(err);
  window.__shotReady = true;
});
