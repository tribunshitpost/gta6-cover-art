// Vice Sunset Cover Studio — the cover painter.
//
// Draws the whole poster on any canvas: a Vice City sky with a striped retro
// sun and palm silhouettes, slanted photo panels in the middle, and a big bold
// caption band at the foot. Everything is drawn in code; no image leaves the
// machine. The editor (main.js) and the screenshot scenes (shots.js) both call
// paintCover with the same state shape.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#2a1052', skyMid: '#c62b7e', skyBot: '#ff7a3d',
    sun: '#ffd166', band: '#160a2e', tag: '#ffd166',
    cap: '#ffffff', outline: '#ff2e88', tint: 'rgba(255, 122, 61, 0.10)',
    filter: 'none',
  },
  neon: {
    label: 'Neon Night',
    skyTop: '#04041a', skyMid: '#17124a', skyBot: '#3b0f54',
    sun: '#ff5da2', band: '#04041a', tag: '#ff5da2',
    cap: '#eafffb', outline: '#19f2ff', tint: 'rgba(25, 242, 255, 0.08)',
    filter: 'none',
  },
  pastel: {
    label: 'Pastel Dawn',
    skyTop: '#8fd0e8', skyMid: '#f7a8c4', skyBot: '#ffd9a0',
    sun: '#fff3b0', band: '#4a2b4d', tag: '#ffd9a0',
    cap: '#ffffff', outline: '#ff7ab8', tint: 'rgba(247, 168, 196, 0.10)',
    filter: 'none',
  },
  mono: {
    label: 'Mono Noir',
    skyTop: '#0d0d0d', skyMid: '#4a4a4a', skyBot: '#cfcfcf',
    sun: '#f5f5f5', band: '#0d0d0d', tag: '#e8e8e8',
    cap: '#ffffff', outline: '#000000', tint: 'rgba(0, 0, 0, 0.08)',
    filter: 'grayscale(1) contrast(1.06)',
  },
};

export const LETTERINGS = {
  vice: { label: 'Vice Bold' },
  neon: { label: 'Neon Glow' },
  stamp: { label: 'Stamp Bar' },
};

export const LAYOUTS = {
  split: { label: 'Sunset Split' },
  triptych: { label: 'Triptych Slant' },
  quad: { label: 'Quad Grid' },
  duo: { label: 'Duo Diagonal' },
};

export function defaultState() {
  return {
    layout: 'triptych',
    grade: 'sunset',
    lettering: 'vice',
    caption: 'SUNSET HEIST',
    tagline: 'VICE CITY • 2026',
    fillOne: false,
    halftone: true,
    grain: true,
    // one entry per panel: focal point (0..1) and zoom of its photo
    panels: [
      { px: 0.5, py: 0.5, zoom: 1 },
      { px: 0.5, py: 0.5, zoom: 1 },
      { px: 0.5, py: 0.5, zoom: 1 },
      { px: 0.5, py: 0.5, zoom: 1 },
    ],
  };
}

// Panel polygons for a layout, in canvas pixels. Each panel also names which
// photo slot it shows (panels take photos in turn, so two photos alternate).
export function panelGeometry(layout, W, H) {
  const bandH = Math.round(H * 0.2);
  const top = Math.round(H * 0.055);
  const bottom = H - bandH;
  const ph = bottom - top;
  const mid = top + ph / 2;
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.006));
  const hw = W / 2;
  switch (layout) {
    case 'split':
      return {
        bandY: bottom, bandH,
        panels: [
          { poly: [[0, top], [0.6 * W, top], [0.54 * W, bottom], [0, bottom]], slot: 0 },
          { poly: [[0.6 * W, top], [W, top], [W, mid], [0.57 * W, mid]], slot: 1 },
          { poly: [[0.57 * W, mid], [W, mid], [W, bottom], [0.54 * W, bottom]], slot: 0 },
        ],
      };
    case 'quad':
      return {
        bandY: bottom, bandH,
        panels: [
          { poly: [[0, top], [hw - g, top], [hw - g, mid - g], [0, mid - g]], slot: 0 },
          { poly: [[hw + g, top], [W, top], [W, mid - g], [hw + g, mid - g]], slot: 1 },
          { poly: [[0, mid + g], [hw - g, mid + g], [hw - g, bottom], [0, bottom]], slot: 0 },
          { poly: [[hw + g, mid + g], [W, mid + g], [W, bottom], [hw + g, bottom]], slot: 1 },
        ],
      };
    case 'duo':
      return {
        bandY: bottom, bandH,
        panels: [
          { poly: [[0, top], [0.44 * W, top], [0.6 * W, bottom], [0, bottom]], slot: 0 },
          { poly: [[0.44 * W, top], [W, top], [W, bottom], [0.6 * W, bottom]], slot: 1 },
        ],
      };
    case 'triptych':
    default:
      return {
        bandY: bottom, bandH,
        panels: [
          { poly: [[0, top], [0.33 * W, top], [0.29 * W, bottom], [0, bottom]], slot: 0 },
          { poly: [[0.33 * W, top], [0.67 * W, top], [0.71 * W, bottom], [0.29 * W, bottom]], slot: 1 },
          { poly: [[0.67 * W, top], [W, top], [W, bottom], [0.71 * W, bottom]], slot: 0 },
        ],
      };
  }
}

function polyPath(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Which panel index holds canvas point (x, y), or -1. Used by the editor's
// drag-to-pan: the panel under the pointer is the one that moves.
export function panelAt(layout, W, H, x, y) {
  const geo = panelGeometry(layout, W, H);
  for (let i = 0; i < geo.panels.length; i++) {
    if (pointInPoly(x, y, geo.panels[i].poly)) return i;
  }
  return -1;
}

function drawSky(ctx, W, H, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.45, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

function drawSun(ctx, W, H, grade) {
  // A retro sun: a solid disc centred on the top edge, its lower third cut
  // by sky-coloured slats that grow thicker towards the bottom.
  const r = Math.min(W, H) * 0.16;
  const cx = W * 0.8;
  const cy = 0;
  ctx.save();
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = grade.skyTop;
  let y = cy + r * 0.35;
  let thick = Math.max(2, r * 0.03);
  while (y < cy + r) {
    ctx.fillRect(cx - r - 2, y, r * 2 + 4, thick);
    y += thick + Math.max(3, r * 0.11);
    thick *= 1.3;
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, flip) {
  // A palm silhouette: one curved trunk and six fronds fanning from its
  // crown. Each frond is an arc that rises first and then droops, so the
  // crown reads as a palm instead of a tangle of strokes.
  const dir = flip ? -1 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.strokeStyle = '#12041f';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, s * 0.045);
  // Trunk, leaning gently away from the corner.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.5, s * 0.3, -s * 0.92);
  ctx.stroke();
  const cx = s * 0.3;
  const cy = -s * 0.92;
  const span = 0.95 * s;
  ctx.lineWidth = Math.max(2, s * 0.032);
  // angle (deg, 0 = right, -90 = straight up), length, and how far the tip
  // droops below the crown line.
  const fronds = [
    { a: -172, l: 1.0, d: 0.42 },
    { a: -145, l: 0.95, d: 0.3 },
    { a: -115, l: 0.9, d: 0.16 },
    { a: -80, l: 0.9, d: 0.1 },
    { a: -45, l: 0.95, d: 0.22 },
    { a: -12, l: 1.0, d: 0.38 },
  ];
  for (const f of fronds) {
    const rad = (f.a * Math.PI) / 180;
    const ex = cx + Math.cos(rad) * span * f.l;
    const ey = cy + Math.sin(rad) * span * f.l + s * f.d;
    const mx = cx + Math.cos(rad) * span * 0.55;
    const my = cy + Math.sin(rad) * span * 0.55 - s * 0.16;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhoto(ctx, img, poly, pan, grade) {
  // Cover-fit the photo inside the panel's bounding box, centred on the
  // panel's focal point (px, py), then clip to the slanted polygon.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(bw / iw, bh / ih);
  const scale = base * (pan.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = minX + bw / 2 - (pan.px ?? 0.5) * dw;
  const dy = minY + bh / 2 - (pan.py ?? 0.5) * dh;
  ctx.save();
  polyPath(ctx, poly);
  ctx.clip();
  if (grade.filter && grade.filter !== 'none') ctx.filter = grade.filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  // Grade tint so the panels sit in the poster's colour world.
  ctx.fillStyle = grade.tint;
  ctx.fillRect(minX, minY, bw, bh);
  ctx.restore();
  // Crisp dark seam around the panel.
  ctx.save();
  polyPath(ctx, poly);
  ctx.strokeStyle = 'rgba(10, 2, 24, 0.9)';
  ctx.lineWidth = Math.max(2, Math.min(bw, bh) * 0.008);
  ctx.stroke();
  ctx.restore();
}

function fitCaptionFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 italic ${size}px "Arial Black", Arial, sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 italic ${size}px "Arial Black", Arial, sans-serif`;
  }
  return size;
}

function drawBand(ctx, W, H, bandY, bandH, grade, state) {
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = grade.tag;
  ctx.fillRect(0, bandY, W, Math.max(2, bandH * 0.02));
  if (state.halftone) {
    // Halftone dots across the band, faint enough to sit behind the words.
    const step = Math.max(10, Math.round(Math.min(W, H) * 0.016));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    for (let y = bandY + step / 2; y < bandY + bandH; y += step) {
      for (let x = step / 2; x < W; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, step * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const cx = W / 2;
  // Tagline: small letterspaced caps above the caption.
  const tagSize = Math.max(10, Math.round(bandH * 0.16));
  ctx.save();
  ctx.font = `600 ${tagSize}px Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.max(2, tagSize * 0.22)}px`; } catch { /* older canvas */ }
  ctx.fillStyle = grade.tag;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((state.tagline || '').toUpperCase(), cx, bandY + bandH * 0.26);
  ctx.restore();
  // Caption: big, fitted to the width.
  const caption = (state.caption || '').toUpperCase();
  const size = fitCaptionFont(ctx, caption, W * 0.94, Math.round(bandH * 0.58));
  const cy = bandY + bandH * 0.68;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (state.lettering === 'neon') {
    ctx.font = `900 italic ${size}px "Arial Black", Arial, sans-serif`;
    ctx.shadowColor = grade.outline;
    ctx.shadowBlur = size * 0.38;
    ctx.fillStyle = grade.cap;
    ctx.fillText(caption, cx, cy);
    ctx.fillText(caption, cx, cy);
    ctx.shadowBlur = 0;
  } else if (state.lettering === 'stamp') {
    ctx.font = `900 italic ${size}px "Arial Black", Arial, sans-serif`;
    const tw = ctx.measureText(caption).width;
    const padX = size * 0.35;
    const padY = size * 0.22;
    ctx.fillStyle = grade.outline;
    const bx = cx - tw / 2 - padX;
    const by = cy - size / 2 - padY;
    const bw = tw + padX * 2;
    const bh = size + padY * 2;
    const r = Math.min(10, bh * 0.18);
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
    ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
    ctx.arcTo(bx, by + bh, bx, by, r);
    ctx.arcTo(bx, by, bx + bw, by, r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = grade.band;
    ctx.fillText(caption, cx, cy);
  } else {
    // Vice Bold: white letters with a thick pink outline.
    ctx.font = `900 italic ${size}px "Arial Black", Arial, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.outline;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeText(caption, cx, cy);
    ctx.fillStyle = grade.cap;
    ctx.fillText(caption, cx, cy);
  }
  ctx.restore();
}

function drawGrain(ctx, W, H) {
  // Deterministic grain: a tiny LCG so an export looks the same every time.
  let seed = 1337;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  ctx.save();
  const n = Math.round((W * H) / 900);
  for (let i = 0; i < n; i++) {
    const v = next() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.05)`;
    ctx.fillRect(next() * W, next() * H, 1.4, 1.4);
  }
  ctx.restore();
}

// Paint a full cover. images is an array of HTMLImageElement (or null) in
// photo-slot order; state.panels[i] pans panel i. Returns the canvas.
export function paintCover(canvas, state, images) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const geo = panelGeometry(state.layout || 'triptych', W, H);
  const loaded = (images || []).filter(Boolean);
  const count = Math.max(1, loaded.length);

  drawSky(ctx, W, H, grade);
  drawSun(ctx, W, H, grade);

  geo.panels.forEach((panel, i) => {
    const slot = state.fillOne ? 0 : panel.slot % count;
    const img = loaded[slot] || null;
    const pan = (state.panels && state.panels[i]) || { px: 0.5, py: 0.5, zoom: 1 };
    if (img) {
      drawPhoto(ctx, img, panel.poly, pan, grade);
    } else {
      // Empty panel: a dark placeholder with a dashed frame.
      ctx.save();
      polyPath(ctx, panel.poly);
      ctx.fillStyle = 'rgba(10, 4, 28, 0.55)';
      ctx.fill();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  });

  // Palm silhouettes lean in from the bottom corners, over the panels.
  const palmScale = Math.min(W, H) * 0.24;
  drawPalm(ctx, W * 0.01, H * 0.99, palmScale, false);
  drawPalm(ctx, W * 0.99, H * 0.99, palmScale * 0.9, true);

  drawBand(ctx, W, H, geo.bandY, geo.bandH, grade, state);
  if (state.grain) drawGrain(ctx, W, H);
  return canvas;
}

// Render a cover at an export size without touching the page.
export function renderCover(width, height, state, images) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return paintCover(canvas, state, images);
}
