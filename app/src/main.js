// Vice Sunset Cover Studio — editor wiring.
// Owns the editor state, loads the user's photos, lets them drag each panel to
// pan it, and exports the finished cover as a PNG at the chosen post size.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCoverArt, renderExport, hitPanel, GRADES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const captionInput = document.getElementById('caption');
const taglineInput = document.getElementById('tagline');
const zoomInput = document.getElementById('zoom');
const zoomValue = document.getElementById('zoom-value');
const panelSelect = document.getElementById('panel-select');
const panelPhotoSelect = document.getElementById('panel-photo');
const sizeSelect = document.getElementById('export-size');
const fillAllToggle = document.getElementById('fill-all');

const SLOT_NAMES = ['A', 'B', 'C', 'D'];
const SAMPLES = { pier: 'samples/pier.jpg', boulevard: 'samples/boulevard.jpg' };

export const state = {
  photos: [null, null, null, null],
  panelPhotos: [0, 1, 0, 1],
  layout: 'triptych',
  grade: 'sunset',
  lettering: 'vice',
  caption: 'Sunset Heist',
  tagline: 'Vice City • 2026',
  halftone: true,
  grain: true,
  sunPalms: true,
  fillAll: false,
  zooms: [1, 1, 1, 1],
  pans: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }],
};

let selectedPanel = 0;

export function setStatus(text) {
  statusEl.textContent = text;
}

export function redraw() {
  drawCoverArt(canvas, state);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

async function loadFileIntoSlot(file, slot) {
  const url = URL.createObjectURL(file);
  try {
    state.photos[slot] = await loadImage(url);
    setStatus(`Photo ${SLOT_NAMES[slot]} loaded — ${file.name}`);
  } finally {
    URL.revokeObjectURL(url);
  }
  redraw();
}

async function loadSampleIntoSlot(name, slot) {
  state.photos[slot] = await loadImage(SAMPLES[name]);
  redraw();
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function rebuildPanelControls() {
  const count = panelCount();
  panelSelect.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const option = document.createElement('option');
    option.value = String(i);
    option.textContent = `Panel ${i + 1}`;
    panelSelect.appendChild(option);
  }
  if (selectedPanel >= count) selectedPanel = 0;
  panelSelect.value = String(selectedPanel);
  syncPanelControls();
}

function syncPanelControls() {
  const slot = state.fillAll ? 0 : state.panelPhotos[selectedPanel];
  panelPhotoSelect.value = String(slot);
  zoomInput.value = String(state.zooms[selectedPanel]);
  zoomValue.textContent = `${state.zooms[selectedPanel].toFixed(2)}×`;
}

// Photo slots: file inputs, sample buttons, drag-and-drop.
document.querySelectorAll('[data-slot]').forEach((slotEl) => {
  const slot = Number(slotEl.dataset.slot);
  const fileInput = slotEl.querySelector('input[type=file]');
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await loadFileIntoSlot(file, slot);
  });
  slotEl.querySelectorAll('[data-sample]').forEach((button) => {
    button.addEventListener('click', async () => {
      await loadSampleIntoSlot(button.dataset.sample, slot);
      setStatus(`Photo ${SLOT_NAMES[slot]} — sample ${button.dataset.sample}`);
    });
  });
  slotEl.addEventListener('dragover', (event) => event.preventDefault());
  slotEl.addEventListener('drop', async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) await loadFileIntoSlot(file, slot);
  });
});

// Layout, grade and lettering pickers.
document.querySelectorAll('[data-layout]').forEach((button) => {
  button.addEventListener('click', () => {
    state.layout = button.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b === button));
    rebuildPanelControls();
    redraw();
  });
});
document.querySelectorAll('[data-grade]').forEach((button) => {
  button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === button));
    document.body.dataset.grade = state.grade;
    redraw();
  });
});
document.querySelectorAll('[data-lettering]').forEach((button) => {
  button.addEventListener('click', () => {
    state.lettering = button.dataset.lettering;
    document.querySelectorAll('[data-lettering]').forEach((b) => b.classList.toggle('active', b === button));
    redraw();
  });
});

// Words.
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });

// Effect toggles.
for (const [id, key] of [['toggle-halftone', 'halftone'], ['toggle-grain', 'grain'], ['toggle-sun', 'sunPalms']]) {
  document.getElementById(id).addEventListener('change', (event) => {
    state[key] = event.target.checked;
    redraw();
  });
}
fillAllToggle.addEventListener('change', (event) => {
  state.fillAll = event.target.checked;
  panelPhotoSelect.disabled = state.fillAll;
  syncPanelControls();
  redraw();
});

// Per-panel crop: pick the panel, pick its photo, zoom it.
panelSelect.addEventListener('change', () => {
  selectedPanel = Number(panelSelect.value);
  syncPanelControls();
});
panelPhotoSelect.addEventListener('change', () => {
  state.panelPhotos[selectedPanel] = Number(panelPhotoSelect.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.zooms[selectedPanel] = Number(zoomInput.value);
  zoomValue.textContent = `${state.zooms[selectedPanel].toFixed(2)}×`;
  redraw();
});
document.getElementById('reset-crop').addEventListener('click', () => {
  state.zooms[selectedPanel] = 1;
  state.pans[selectedPanel] = { x: 0, y: 0 };
  syncPanelControls();
  redraw();
});

// Drag on the preview to pan the photo inside its panel.
let dragPanel = -1;
let dragLast = null;
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
}
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = hitPanel(state.layout, canvas.width, canvas.height, point.x, point.y);
  if (hit < 0) return;
  dragPanel = hit;
  selectedPanel = hit;
  panelSelect.value = String(hit);
  syncPanelControls();
  dragLast = point;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (dragPanel < 0 || !dragLast) return;
  const point = canvasPoint(event);
  const pan = state.pans[dragPanel];
  pan.x += (point.x - dragLast.x) / canvas.width;
  pan.y += (point.y - dragLast.y) / canvas.height;
  pan.x = Math.max(-0.5, Math.min(0.5, pan.x));
  pan.y = Math.max(-0.5, Math.min(0.5, pan.y));
  dragLast = point;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragPanel = -1; dragLast = null; });

// Export size follows the preview canvas; the PNG renders at full size.
const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};
sizeSelect.addEventListener('change', () => {
  const [w, h] = SIZES[sizeSelect.value];
  canvas.width = w;
  canvas.height = h;
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = SIZES[sizeSelect.value];
  const out = renderExport(state, w, h);
  out.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-sunset-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved vice-sunset-cover-${w}x${h}.png`);
  }, 'image/png');
});

// Boot: two sample photos so the first preview already looks like a poster.
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    loadSample: loadSampleIntoSlot,
    setCaption: (text) => { state.caption = text; captionInput.value = text; },
    setTagline: (text) => { state.tagline = text; taglineInput.value = text; },
    apply: (patch) => Object.assign(state, patch),
    sizeCanvas: (w, h) => { canvas.width = w; canvas.height = h; },
    rebuild: rebuildPanelControls,
    redraw,
  });
} else {
  rebuildPanelControls();
  loadSampleIntoSlot('pier', 0)
    .then(() => loadSampleIntoSlot('boulevard', 1))
    .then(() => setStatus('Samples loaded — drop your own photo into a slot to replace one.'))
    .catch(() => setStatus('Drop a photo into slot A to begin.'));
  redraw();
}
