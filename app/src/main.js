// Vice Sunset Cover Studio — the editor.
//
// Wires the dark editor shell (index.html) to the cover painter (cover.js):
// four photo slots, per-panel drag-to-pan and zoom, layout / grade / lettering
// pickers, caption + tagline, and one-click PNG export in the three post
// sizes. Photos are read on this machine only; nothing is uploaded anywhere.

import {
  GRADES, LETTERINGS, LAYOUTS,
  defaultState, paintCover, renderCover, panelAt,
} from './cover.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const EXPORT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

const state = defaultState();
// Four photo slots; each holds { img, name } or null.
const photos = [null, null, null, null];
let exportSize = 'square';
let selectedPanel = 0;
let drag = null;

const stage = $('#stage');

function images() {
  return photos.map((p) => (p ? p.img : null));
}

function repaint() {
  const [w, h] = EXPORT_SIZES[exportSize];
  if (stage.width !== w || stage.height !== h) {
    stage.width = w;
    stage.height = h;
  }
  paintCover(stage, state, images());
  const label = $('#panelLabel');
  if (label) {
    const pan = state.panels[selectedPanel] || { px: 0.5, py: 0.5, zoom: 1 };
    label.textContent = `Panel ${selectedPanel + 1} — zoom ${pan.zoom.toFixed(2)}×`;
  }
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => reject(new Error('could not read that image'));
    img.src = url;
  });
}

async function loadSample(slot, name) {
  const hint = $('#hint');
  try {
    const res = await fetch(`samples/${name}.jpg`);
    if (!res.ok) throw new Error('sample missing');
    photos[slot] = { img: await loadImageFromBlob(await res.blob()), name: `${name} sample` };
    markSlot(slot);
    repaint();
  } catch (err) {
    if (hint) hint.textContent = `Could not load the ${name} sample.`;
  }
}

async function loadFile(slot, file) {
  const hint = $('#hint');
  if (!file || !file.type.startsWith('image/')) {
    if (hint) hint.textContent = 'That file is not an image — try a JPG or PNG.';
    return;
  }
  try {
    photos[slot] = { img: await loadImageFromBlob(file), name: file.name };
    markSlot(slot);
    repaint();
  } catch {
    if (hint) hint.textContent = 'Could not read that image file.';
  }
}

function markSlot(slot) {
  const card = document.querySelector(`[data-slot="${slot}"]`);
  if (!card) return;
  const nameEl = card.querySelector('.slot-name');
  if (nameEl) nameEl.textContent = photos[slot] ? photos[slot].name : 'Empty slot';
  card.classList.toggle('filled', Boolean(photos[slot]));
}

function firstEmptySlot() {
  const i = photos.findIndex((p) => !p);
  return i === -1 ? 0 : i;
}

function bindSlots() {
  $$('.slot').forEach((card) => {
    const slot = Number(card.dataset.slot);
    const input = card.querySelector('input[type="file"]');
    input.addEventListener('change', () => loadFile(slot, input.files[0]));
    card.querySelectorAll('[data-sample]').forEach((btn) => {
      btn.addEventListener('click', () => loadSample(slot, btn.dataset.sample));
    });
    card.addEventListener('dragover', (ev) => {
      ev.preventDefault();
      card.classList.add('drop');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drop'));
    card.addEventListener('drop', (ev) => {
      ev.preventDefault();
      card.classList.remove('drop');
      loadFile(slot, ev.dataTransfer.files[0]);
    });
  });
}

function stagePoint(ev) {
  const rect = stage.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * stage.width,
    y: ((ev.clientY - rect.top) / rect.height) * stage.height,
  };
}

function bindStage() {
  stage.addEventListener('pointerdown', (ev) => {
    const p = stagePoint(ev);
    const hit = panelAt(state.layout, stage.width, stage.height, p.x, p.y);
    if (hit === -1) return;
    selectedPanel = hit;
    stage.setPointerCapture(ev.pointerId);
    drag = { panel: hit, lastX: p.x, lastY: p.y, moved: false };
    const zoom = $('#zoom');
    if (zoom) zoom.value = String((state.panels[hit] || { zoom: 1 }).zoom);
    repaint();
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const p = stagePoint(ev);
    const dx = p.x - drag.lastX;
    const dy = p.y - drag.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
    const pan = state.panels[drag.panel];
    // Dragging right shows more of the photo's left side, and down more of
    // its top: the focal point moves against the pointer.
    pan.px = clamp(pan.px - dx / stage.width, 0.05, 0.95);
    pan.py = clamp(pan.py - dy / stage.height, 0.05, 0.95);
    drag.lastX = p.x;
    drag.lastY = p.y;
    if (drag.moved) repaint();
  });
  const endDrag = () => { drag = null; };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('dragover', (ev) => ev.preventDefault());
  stage.addEventListener('drop', (ev) => {
    ev.preventDefault();
    loadFile(firstEmptySlot(), ev.dataTransfer.files[0]);
  });
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function bindPickers() {
  $$('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.layout = btn.dataset.layout;
      $$('[data-layout]').forEach((b) => b.classList.toggle('on', b === btn));
      selectedPanel = 0;
      repaint();
    });
  });
  $$('[data-grade]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.grade = btn.dataset.grade;
      $$('[data-grade]').forEach((b) => b.classList.toggle('on', b === btn));
      repaint();
    });
  });
  $$('[data-lettering]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.lettering = btn.dataset.lettering;
      $$('[data-lettering]').forEach((b) => b.classList.toggle('on', b === btn));
      repaint();
    });
  });
  $$('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      exportSize = btn.dataset.size;
      $$('[data-size]').forEach((b) => b.classList.toggle('on', b === btn));
      repaint();
    });
  });
}

function bindWords() {
  const caption = $('#caption');
  caption.addEventListener('input', () => {
    state.caption = caption.value.slice(0, 40);
    repaint();
  });
  const tagline = $('#tagline');
  tagline.addEventListener('input', () => {
    state.tagline = tagline.value;
    repaint();
  });
  const zoom = $('#zoom');
  zoom.addEventListener('input', () => {
    const pan = state.panels[selectedPanel];
    pan.zoom = Number(zoom.value);
    repaint();
  });
  const fillOne = $('#fillOne');
  fillOne.addEventListener('change', () => {
    state.fillOne = fillOne.checked;
    repaint();
  });
  const halftone = $('#halftone');
  halftone.addEventListener('change', () => {
    state.halftone = halftone.checked;
    repaint();
  });
  const grain = $('#grain');
  grain.addEventListener('change', () => {
    state.grain = grain.checked;
    repaint();
  });
}

function bindExport() {
  $$('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [w, h] = btn.dataset.export.split('x').map(Number);
      const canvas = renderCover(w, h, state, images());
      const hint = $('#hint');
      canvas.toBlob((blob) => {
        if (!blob) {
          if (hint) hint.textContent = 'Export failed — try again.';
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vice-sunset-cover-${w}x${h}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        if (hint) hint.textContent = `Exported ${w} × ${h} PNG — check your downloads.`;
      }, 'image/png');
    });
  });
}

function buildPickers() {
  // The pickers are rendered from the painter's own tables, so a new layout
  // or grade only has to be added in cover.js.
  const layoutBox = $('#layouts');
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.className = key === state.layout ? 'on' : '';
    b.textContent = def.label;
    layoutBox.appendChild(b);
  }
  const gradeBox = $('#grades');
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.className = key === state.grade ? 'on' : '';
    b.textContent = def.label;
    gradeBox.appendChild(b);
  }
  const letterBox = $('#letterings');
  for (const [key, def] of Object.entries(LETTERINGS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.lettering = key;
    b.className = key === state.lettering ? 'on' : '';
    b.textContent = def.label;
    letterBox.appendChild(b);
  }
}

function syncControls() {
  // Put the inputs back in step with the state (used when a screenshot
  // scene hands the editor its own words and switches).
  const caption = $('#caption');
  if (caption) caption.value = state.caption;
  const tagline = $('#tagline');
  if (tagline) tagline.value = state.tagline;
  const fillOne = $('#fillOne');
  if (fillOne) fillOne.checked = state.fillOne;
  const halftone = $('#halftone');
  if (halftone) halftone.checked = state.halftone;
  const grain = $('#grain');
  if (grain) grain.checked = state.grain;
  const zoom = $('#zoom');
  if (zoom) zoom.value = String((state.panels[selectedPanel] || { zoom: 1 }).zoom);
}

export function initEditor(preset) {
  // A screenshot scene may hand in its own words, layout and photos first;
  // the plain editor starts with the two bundled samples instead.
  if (preset && preset.state) Object.assign(state, preset.state);
  buildPickers();
  bindSlots();
  bindStage();
  bindPickers();
  bindWords();
  bindExport();
  syncControls();
  const first = preset && preset.photos ? preset.photos[0] : 'boulevard';
  const second = preset && preset.photos ? preset.photos[1] : 'pier';
  const jobs = [loadSample(0, first), loadSample(1, second)];
  Promise.allSettled(jobs).then(() => {
    repaint();
    window.__editorReady = true;
  });
  repaint();
}

// Screenshot scenes (?shot=...) run through shots.js instead of the editor.
const params = new URLSearchParams(location.search);
if (params.has('shot')) {
  const { runShot } = await import('./shots.js');
  runShot(params, initEditor);
} else {
  initEditor();
}
