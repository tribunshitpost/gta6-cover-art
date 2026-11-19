// cover.js — the cover painter for Vice Sunset Cover Studio.
//
// One function, paintCover, draws a whole poster onto a canvas: a graded sky
// with a striped retro sun, slanted photo panels, palm silhouettes, and a bold
// caption band at the foot. The editor (main.js) owns the state; this module
// only turns a state snapshot into pixels, so the same code paints the live
// preview and the exported PNGs.

/** How many photo slots each layout uses. */
export const PANEL_COUNT = { split: 3, triptych: 3, quad: 4, duo: 2 };

/** The four colour grades: sky stops, sun, band, lettering and tint. */
export const GRADES = {
  sunset: {
    sky: ['#2a0e52', '#7a1e6e', '#ff5e62', '#ff9a3d'],
    sun: '#ffd23f', band: '#150a2c', bandLine: '#ffd23f', tag: '#ffd23f',
    cap: '#ffffff', capEdge: '#ff2e88', glow: null,
    tint: 'rgba(255,110,60,0.10)', dots: 'rgba(255,255,255,0.16)',
  },
  neon: {
    sky: ['#070418', '#160b38', '#3a0f4d', '#571b52'],
    sun: '#ff2e88', band: '#0c0620', bandLine: '#00e5ff', tag: '#ff5ea8',
    cap: '#eafcff', capEdge: '#00e5ff', glow: '#00e5ff',
    tint: 'rgba(0,220,255,0.08)', dots: 'rgba(0,229,255,0.18)',
  },
  pastel: {
    sky: ['#bfe3ff', '#ffc4dd', '#ffe3ef', '#fff3d6'],
    sun: '#fff0a8', band: '#2b1e3f', bandLine: '#ff9ecf', tag: '#ffd23f',
    cap: '#ffffff', capEdge: '#ff7ab8', glow: null,
    tint: 'rgba(255,170,220,0.08)', dots: 'rgba(255,255,255,0.22)',
  },
  mono: {
    sky: ['#101010', '#333333', '#6f6f6f', '#9a9a9a'],
    sun: '#f2f2f2', band: '#0b0b0b', bandLine: '#e8e8e8', tag: '#e8e8e8',
    cap: '#ffffff', capEdge: '#111111', glow: null,
    tint: 'rgba(0,0,0,0.12)', dots: 'rgba(255,255,255,0.14)',
  },
};

/** The three lettering styles. */
export const LETTERINGS = ['vice', 'neon', 'stamp'];

/** The four layouts, in the order the editor lists them. */
export const LAYOUT_IDS = ['triptych', 'split', 'quad', 'duo'];

/** Human names for the layouts, used by the editor UI. */
export const LAYOUT_NAMES = {
  triptych: 'Triptych Slant',
  split: 'Sunset Split',
  quad: 'Quad Grid',
  duo: 'Duo Diagonal',
};

// ---------------------------------------------------------------- geometry

/** A point [x, y]. */
const pt = (x, y) => [x, y];

/** The panel polygons of a layout inside `area` ({x, y, w, h}). */
export function layoutPanels(layout, area) {
  const { x, y, w, h } = area;
  const gap = Math.max(4, Math.round(w * 0.006));
  if (layout === 'split') {
    // One tall panel on the left, a stacked pair on the right.
    const lw = Math.round(w * 0.56);
    return [
      [pt(x, y), pt(x + lw, y), pt(x + lw, y + h), pt(x, y + h)],
      [pt(x + lw + gap, y), pt(x + w, y), pt(x + w, y + h / 2 - gap / 2), pt(x + lw + gap, y + h / 2 - gap / 2)],
      [pt(x + lw + gap, y + h / 2 + gap / 2), pt(x + w, y + h / 2 + gap / 2), pt(x + w, y + h), pt(x + lw + gap, y + h)],
    ];
  }
  if (layout === 'triptych') {
    // Three panels with slanted dividers leaning right.
    const slant = Math.round(w * 0.022);
    const pw = w / 3;
    const quads = [];
    for (let i = 0; i < 3; i++) {
      const left = x + i * pw;
      const right = x + (i + 1) * pw;
      quads.push([
        pt(left + (i === 0 ? 0 : slant), y),
        pt(right + (i === 2 ? 0 : slant), y),
        pt(right - (i === 2 ? 0 : slant), y + h),
        pt(left - (i === 0 ? 0 : slant), y + h),
      ]);
    }
    return quads;
  }
  if (layout === 'quad') {
    const hw = (w - gap) / 2;
    const hh = (h - gap) / 2;
    return [
      [pt(x, y), pt(x + hw, y), pt(x + hw, y + hh), pt(x, y + hh)],
      [pt(x + hw + gap, y), pt(x + w, y), pt(x + w, y + hh), pt(x + hw + gap, y + hh)],
      [pt(x, y + hh + gap), pt(x + hw, y + hh + gap), pt(x + hw, y + h), pt(x, y + h)],
      [pt(x + hw + gap, y + hh + gap), pt(x + w, y + hh + gap), pt(x + w, y + h), pt(x + hw + gap, y + h)],
    ];
  }
  // duo: two triangles split by a diagonal sky band.
  const off = Math.round(w * 0.08);
  return [
    [pt(x, y), pt(x + w, y), pt(x + w * 0.42, y + h)],
    [pt(x + w * 0.58, y), pt(x + w, y + h), pt(x, y + h)],
  ].map((poly) => poly);
}

/** Whether point (px, py) lies inside polygon `poly` (ray casting). */
export function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** A polygon's bounding box {x, y, w, h}. */
function polyBox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// ---------------------------------------------------------------- pieces

/** A deterministic pseudo-random stream, so grain never flickers between paints. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A retro sun with horizontal slats cut through its lower third. */
function drawSun(ctx, cx, cy, r, color) {
  const off = document.createElement('canvas');
  off.width = off.height = Math.ceil(r * 2) + 4;
  const o = off.getContext('2d');
  o.fillStyle = color;
  o.beginPath();
  o.arc(r + 2, r + 2, r, 0, Math.PI * 2);
  o.fill();
  // Cut slats out of the lower third: gaps widen toward the bottom.
  o.globalCompositeOperation = 'destination-out';
  const slats = 4;
  for (let i = 0; i < slats; i++) {
    const sy = r + 2 + (r * 0.08) + i * (r * 0.24);
    o.fillRect(0, sy, off.width, r * (0.05 + i * 0.035));
  }
  o.globalCompositeOperation = 'source-over';
  ctx.drawImage(off, cx - r - 2, cy - r - 2);
}

/** One palm silhouette: a leaning trunk and a crown of drooping fronds. */
function drawPalm(ctx, x, y, s, color, lean) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning away from the corner it grows from.
  ctx.lineWidth = Math.max(2, s * 0.055);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * s * 0.25, y - s * 0.55, x + lean * s * 0.42, y - s * 0.92);
  ctx.stroke();
  const cx = x + lean * s * 0.42;
  const cy = y - s * 0.92;
  // Fronds fan out from the crown and droop.
  ctx.lineWidth = Math.max(1.5, s * 0.035);
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    const a = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84) * (lean > 0 ? 1 : -1);
    const dir = lean > 0 ? 1 : -1;
    const ex = cx + Math.cos(a) * s * 0.62 * dir;
    const ey = cy + Math.sin(a) * s * 0.5 + s * 0.34;
    const mx = cx + Math.cos(a) * s * 0.34 * dir;
    const my = cy + Math.sin(a) * s * 0.26 - s * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  // A couple of coconuts under the crown.
  ctx.beginPath();
  ctx.arc(cx - s * 0.03, cy + s * 0.05, s * 0.045, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.05, cy + s * 0.06, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Draw `img` cover-fitting `box`, focused on (fx, fy) of the image, at `zoom`. */
function drawCover(ctx, img, box, fx, fy, zoom) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(box.w / iw, box.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = box.x + box.w / 2 - fx * dw;
  let dy = box.y + box.h / 2 - fy * dh;
  dx = Math.min(box.x, Math.max(box.x + box.w - dw, dx));
  dy = Math.min(box.y, Math.max(box.y + box.h - dh, dy));
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Halftone dots across a band. */
function drawHalftone(ctx, x, y, w, h, color, step) {
  ctx.save();
  ctx.fillStyle = color;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    const offset = Math.round((yy / step) % 2) * (step / 2);
    for (let xx = x + step / 2 + offset; xx < x + w; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, Math.max(1, step * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain: deterministic speckles over the whole canvas. */
function drawGrain(ctx, w, h) {
  const rand = rng(20261119);
  const n = Math.floor((w * h) / 1100);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
  }
  ctx.restore();
}

/** The caption, fitted to the canvas width, in the chosen lettering style. */
function drawCaption(ctx, grade, lettering, caption, tagline, w, bandY, bandH) {
  const cx = w / 2;
  const tagY = bandY + bandH * 0.28;
  const capY = bandY + bandH * 0.72;
  // Tagline, letterspaced.
  ctx.save();
  ctx.fillStyle = grade.tag;
  ctx.font = `700 ${Math.max(13, Math.round(bandH * 0.13))}px "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.letterSpacing = `${Math.round(bandH * 0.05)}px`; } catch { /* older canvas */ }
  ctx.fillText(tagline.toUpperCase(), cx, tagY);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  ctx.restore();
  // Caption, shrunk until it fits.
  const text = (caption || 'UNTITLED').toUpperCase();
  let size = Math.round(bandH * 0.52);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fit = (s) => {
    ctx.font = `italic 900 ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    return ctx.measureText(text).width;
  };
  while (size > 18 && fit(size) > w * 0.94) size -= 2;
  fit(size);
  if (lettering === 'stamp') {
    const tw = ctx.measureText(text).width;
    const padX = size * 0.45;
    const padY = size * 0.16;
    const bx = cx - tw / 2 - padX;
    const by = capY - size * 0.52 - padY;
    const bw = tw + padX * 2;
    const bh = size * 1.04 + padY * 2;
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, Math.min(10, bh * 0.18));
    ctx.fill();
    ctx.fillStyle = grade.band;
    ctx.fillText(text, cx, capY);
  } else if (lettering === 'neon') {
    ctx.shadowColor = grade.glow || '#00e5ff';
    ctx.shadowBlur = size * 0.5;
    ctx.fillStyle = grade.cap;
    ctx.fillText(text, cx, capY);
    ctx.fillText(text, cx, capY);
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.strokeStyle = grade.capEdge;
    ctx.strokeText(text, cx, capY);
  } else {
    ctx.lineWidth = Math.max(2, size * 0.13);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.capEdge;
    ctx.strokeText(text, cx, capY);
    ctx.fillStyle = grade.cap;
    ctx.fillText(text, cx, capY);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the painter

/**
 * Paint a whole cover onto `canvas` (its width/height are the output size).
 * `opts`: { layout, grade, lettering, caption, tagline, halftone, grain,
 *   panels: [{ photo, px, py, zoom }], photos: [Image|null, ...] }.
 * Returns the painted panel polygons (for hit-testing drags) in canvas pixels.
 */
export function paintCover(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const grade = GRADES[opts.grade] || GRADES.sunset;
  const bandH = Math.round(H * 0.22);
  const bandY = H - bandH;
  const sunStrip = Math.round(H * 0.055);
  const area = { x: 0, y: sunStrip, w: W, h: bandY - sunStrip };

  // Sky: a vertical wash the panels and band sit on.
  const sky = ctx.createLinearGradient(0, 0, 0, bandY);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, bandY);

  // Retro sun, half above the canvas, slats in its lower third.
  const sunR = Math.round(W * 0.16);
  drawSun(ctx, Math.round(W * 0.68), Math.round(sunStrip * 0.6), sunR, grade.sun);

  // Photo panels.
  const polys = layoutPanels(opts.layout, area);
  const count = PANEL_COUNT[opts.layout] || 3;
  const painted = [];
  for (let i = 0; i < count; i++) {
    const poly = polys[i];
    const slot = opts.panels[i] || { photo: 0, px: 0.5, py: 0.5, zoom: 1 };
    const img = opts.photos[slot.photo] || null;
    const box = polyBox(poly);
    ctx.save();
    ctx.beginPath();
    poly.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.clip();
    if (img) {
      if (opts.grade === 'mono') ctx.filter = 'grayscale(1) contrast(1.06)';
      drawCover(ctx, img, box, slot.px, slot.py, slot.zoom);
      ctx.filter = 'none';
    } else {
      ctx.fillStyle = '#241640';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    ctx.fillStyle = grade.tint;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    poly.forEach(([x, y], k) => (k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.lineWidth = Math.max(2, Math.round(W * 0.003));
    ctx.strokeStyle = 'rgba(12,6,28,0.9)';
    ctx.stroke();
    ctx.restore();
    painted.push({ poly, box, slot: i });
  }

  // Palm silhouettes over the photo area's lower corners.
  const palmColor = 'rgba(16,7,34,0.92)';
  const palmS = Math.round(W * 0.13);
  drawPalm(ctx, 0, area.y + area.h, palmS, palmColor, 1);
  drawPalm(ctx, W, area.y + area.h, palmS, palmColor, -1);

  // Caption band.
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, bandY, W, bandH);
  ctx.fillStyle = grade.bandLine;
  ctx.fillRect(0, bandY, W, Math.max(2, Math.round(H * 0.004)));
  if (opts.halftone) {
    drawHalftone(ctx, 0, bandY + 4, W, bandH - 4, grade.dots, Math.max(10, Math.round(W * 0.013)));
  }
  drawCaption(ctx, grade, opts.lettering, opts.caption, opts.tagline, W, bandY, bandH);

  if (opts.grain) drawGrain(ctx, W, H);
  return painted;
}
