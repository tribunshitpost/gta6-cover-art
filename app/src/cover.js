// Vice Sunset Cover Studio — the cover painter.
// Draws the whole poster on any canvas: a Vice City sky with a striped retro sun
// and palm silhouettes, slanted photo panels in the middle, and a big bold caption
// band at the foot. Everything is drawn in code; no image leaves the machine.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#2a1052', skyMid: '#c62b7e', skyBot: '#ff7a3d',
    sun: '#ffd166', sunCore: '#fff3b0', caption: '#ffffff', outline: '#ff2e88',
    tintTop: 'rgba(255, 122, 61, 0.10)', tintBot: 'rgba(198, 43, 126, 0.28)',
    band: '#160a24', gap: '#14081f',
  },
  neon: {
    label: 'Neon Night',
    skyTop: '#05031a', skyMid: '#3b0f8f', skyBot: '#00e5c7',
    sun: '#ff2e88', sunCore: '#ff9ecf', caption: '#e8fff9', outline: '#00e5c7',
    tintTop: 'rgba(0, 229, 199, 0.08)', tintBot: 'rgba(59, 15, 143, 0.30)',
    band: '#07031c', gap: '#05031a',
  },
  pastel: {
    label: 'Pastel Dawn',
    skyTop: '#7ec8e3', skyMid: '#f7a8c4', skyBot: '#ffd9a0',
    sun: '#fff1a8', sunCore: '#ffffff', caption: '#3d1c4d', outline: '#ffffff',
    tintTop: 'rgba(255, 217, 160, 0.10)', tintBot: 'rgba(247, 168, 196, 0.22)',
    band: '#4d2a5e', gap: '#3d1c4d',
  },
  mono: {
    label: 'Mono Noir',
    skyTop: '#0d0d0d', skyMid: '#3a3a3a', skyBot: '#8a8a8a',
    sun: '#f2f2f2', sunCore: '#ffffff', caption: '#ffffff', outline: '#000000',
    tintTop: 'rgba(255, 255, 255, 0.05)', tintBot: 'rgba(0, 0, 0, 0.30)',
    band: '#0d0d0d', gap: '#000000',
  },
};

export const LAYOUTS = {
  split: { label: 'Sunset Split', panels: 3 },
  triptych: { label: 'Triptych Slant', panels: 3 },
  quad: { label: 'Quad Grid', panels: 4 },
  duo: { label: 'Duo Diagonal', panels: 2 },
};

// Panel outlines in normalised coordinates. The band y = 0.08..0.80 holds the
// panels; the sky shows above them and the caption band sits below.
export function panelPolygons(layout, width, height) {
  const top = 0.08, bottom = 0.80;
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  if (layout === 'split') {
    return [
      rect(0, top, 0.62, bottom),
      rect(0.62, top, 1, (top + bottom) / 2),
      rect(0.62, (top + bottom) / 2, 1, bottom),
    ];
  }
  if (layout === 'triptych') {
    const slant = 0.05;
    const band = [];
    for (let i = 0; i < 3; i++) {
      const x0 = i / 3, x1 = (i + 1) / 3;
      band.push([[x0, top], [x1, top], [x1 + slant, bottom], [x0 + slant, bottom]]);
    }
    return band;
  }
  if (layout === 'quad') {
    const midY = (top + bottom) / 2;
    return [
      rect(0, top, 0.5, midY), rect(0.5, top, 1, midY),
      rect(0, midY, 0.5, bottom), rect(0.5, midY, 1, bottom),
    ];
  }
  // duo: a diagonal cut from the top-right corner to the bottom-left one.
  return [
    [[0, top], [1, top], [0, bottom]],
    [[1, top], [1, bottom], [0, bottom]],
  ];
}

function tracePolygon(ctx, points, width, height) {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const px = x * width, py = y * height;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

function pointInPolygon(px, py, points, width, height) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0] * width, yi = points[i][1] * height;
    const xj = points[j][0] * width, yj = points[j][1] * height;
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

/** Returns the index of the panel holding (px, py) in canvas pixels, or -1. */
export function hitPanel(layout, width, height, px, py) {
  const polys = panelPolygons(layout, width, height);
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPolygon(px, py, polys[i], width, height)) return i;
  }
  return -1;
}

// A tiny deterministic random stream so grain looks the same on every export.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawRetroSun(ctx, width, height, grade) {
  const cx = width * 0.76, cy = height * 0.085;
  const r = Math.min(width, height) * 0.105;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, grade.sunCore + '55');
  glow.addColorStop(1, grade.sunCore + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  disc.addColorStop(0, grade.sunCore);
  disc.addColorStop(1, grade.sun);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Horizontal slits cut the lower half of the disc, retro-poster style.
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.5, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  let y = cy + r * 0.08, gap = height * 0.004;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.4;
    gap *= 1.5;
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, size, lean, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = size * 0.045;
  ctx.lineCap = 'round';
  // Trunk: a gentle curve rising from the base.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.08, -size * 0.5, size * 0.02, -size * 0.95);
  ctx.stroke();
  // Fronds fanning from the crown.
  const crownX = size * 0.02, crownY = -size * 0.95;
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = size * (0.55 + (i % 2) * 0.12);
    const tipX = crownX + Math.cos(angle) * len;
    const tipY = crownY - Math.sin(angle) * len * 0.55;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + Math.cos(angle) * len * 0.5,
      crownY - Math.sin(angle) * len * 0.9,
      tipX, tipY,
    );
    ctx.stroke();
    // Leaflets: short strokes drooping off each frond.
    for (let t = 0.3; t < 0.95; t += 0.22) {
      const bx = crownX + (tipX - crownX) * t;
      const by = crownY + (tipY - crownY) * t - Math.sin(angle) * len * 0.25 * t;
      ctx.lineWidth = size * 0.02;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + size * 0.05, by + size * 0.09);
      ctx.stroke();
      ctx.lineWidth = size * 0.045;
    }
  }
  // Coconuts: two dots under the crown.
  ctx.beginPath();
  ctx.arc(crownX - size * 0.04, crownY + size * 0.03, size * 0.035, 0, Math.PI * 2);
  ctx.arc(crownX + size * 0.05, crownY + size * 0.04, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPhotoPanel(ctx, img, polygon, width, height, zoom, pan) {
  ctx.save();
  tracePolygon(ctx, polygon, width, height);
  ctx.clip();
  // Bounding box of the polygon, in pixels.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of polygon) {
    minX = Math.min(minX, x * width); maxX = Math.max(maxX, x * width);
    minY = Math.min(minY, y * height); maxY = Math.max(maxY, y * height);
  }
  const pw = maxX - minX, ph = maxY - minY;
  const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const dx = minX + (pw - dw) / 2 + pan.x * pw;
  const dy = minY + (ph - dh) / 2 + pan.y * ph;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawEmptyPanel(ctx, polygon, width, height, grade, index) {
  ctx.save();
  tracePolygon(ctx, polygon, width, height);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, 0, width * 0.4, height);
  grad.addColorStop(0, grade.skyMid);
  grad.addColorStop(1, grade.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `bold ${Math.round(height * 0.022)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`PANEL ${index + 1} — ADD A PHOTO`, width / 2, height * 0.44);
  ctx.restore();
}

function drawHalftone(ctx, width, height, grade) {
  const rand = seededRandom(20261119);
  const step = Math.max(10, width * 0.014);
  ctx.fillStyle = grade.band;
  for (let y = height * 0.8; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const fade = (y - height * 0.8) / (height * 0.2);
      const r = step * 0.16 + fade * step * 0.22;
      if (rand() < 0.85) {
        ctx.beginPath();
        ctx.arc(x + step / 2, y + step / 2, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawGrain(ctx, width, height) {
  const rand = seededRandom(777);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  const count = Math.floor((width * height) / 9000);
  for (let i = 0; i < count; i++) {
    ctx.fillRect(rand() * width, rand() * height, 1.6, 1.6);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let i = 0; i < count; i++) {
    ctx.fillRect(rand() * width, rand() * height, 1.6, 1.6);
  }
}

function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `bold ${size}px system-ui, sans-serif`;
  }
  return size;
}

function drawCaption(ctx, width, height, state, grade) {
  const caption = (state.caption || '').trim().toUpperCase();
  const tagline = (state.tagline || '').trim().toUpperCase();
  const bandTop = height * 0.80;
  const band = ctx.createLinearGradient(0, bandTop - height * 0.05, 0, height);
  band.addColorStop(0, grade.band + '00');
  band.addColorStop(0.25, grade.band + 'cc');
  band.addColorStop(1, grade.band);
  ctx.fillStyle = band;
  ctx.fillRect(0, bandTop - height * 0.05, width, height * 0.25);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (tagline) {
    const tagSize = Math.round(height * 0.026);
    ctx.font = `600 ${tagSize}px system-ui, sans-serif`;
    ctx.fillStyle = grade.sun;
    ctx.fillText(tagline.split('').join('  '), width / 2, height * 0.845);
  }
  if (!caption) return;
  const maxW = width * 0.92;
  const startSize = Math.round(height * 0.115);
  const size = fitFont(ctx, caption, maxW, startSize);
  const cy = height * 0.925;
  ctx.save();
  ctx.translate(width / 2, cy);
  if (state.lettering === 'stamp') ctx.rotate(-0.035);
  ctx.translate(-width / 2, -cy);
  if (state.lettering === 'stamp') {
    const pad = size * 0.28;
    const tw = ctx.measureText(caption).width;
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(width / 2 - tw / 2 - pad, cy - size * 0.62, tw + pad * 2, size * 1.24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(caption, width / 2, cy + size * 0.02);
  } else if (state.lettering === 'neon') {
    ctx.shadowColor = grade.outline;
    ctx.shadowBlur = size * 0.45;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(caption, width / 2, cy);
    ctx.shadowBlur = size * 0.18;
    ctx.fillStyle = grade.caption;
    ctx.fillText(caption, width / 2, cy);
  } else {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.05;
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.outline;
    ctx.strokeText(caption, width / 2, cy);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = grade.caption;
    ctx.fillText(caption, width / 2, cy);
  }
  ctx.restore();
}

/**
 * Paints the cover described by `state` onto `canvas` (any size).
 * state: { photos, panelPhotos, layout, grade, lettering, caption, tagline,
 *   halftone, grain, sunPalms, fillAll, zooms, pans }
 * photos: HTMLImageElement | null per slot. panelPhotos: slot index per panel.
 */
export function drawCoverArt(canvas, state) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width, height = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  const layout = state.layout || 'triptych';

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.45, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  if (state.sunPalms !== false) {
    drawRetroSun(ctx, width, height, grade);
  }

  // Photo panels.
  const polys = panelPolygons(layout, width, height);
  const gap = Math.max(4, Math.round(width * 0.006));
  polys.forEach((poly, i) => {
    const slot = state.fillAll ? 0 : (state.panelPhotos?.[i] ?? i);
    const img = state.photos?.[slot] ?? null;
    if (img) {
      drawPhotoPanel(ctx, img, poly, width, height, state.zooms?.[i] ?? 1, state.pans?.[i] ?? { x: 0, y: 0 });
    } else {
      drawEmptyPanel(ctx, poly, width, height, grade, i);
    }
    ctx.save();
    tracePolygon(ctx, poly, width, height);
    ctx.lineWidth = gap * 1.6;
    ctx.strokeStyle = grade.gap;
    ctx.stroke();
    ctx.restore();
  });

  // Sunset grade wash over the panels.
  const wash = ctx.createLinearGradient(0, height * 0.08, 0, height * 0.8);
  wash.addColorStop(0, grade.tintTop);
  wash.addColorStop(1, grade.tintBot);
  ctx.fillStyle = wash;
  ctx.fillRect(0, height * 0.08, width, height * 0.72);

  // Vignette.
  const vig = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // Palms frame the finished cover from the bottom corners, over the panels.
  if (state.sunPalms !== false) {
    drawPalm(ctx, width * 0.01, height * 1.01, height * 0.32, 0.12, grade.band);
    drawPalm(ctx, width * 0.99, height * 1.01, height * 0.28, -0.14, grade.band);
  }

  if (state.halftone) drawHalftone(ctx, width, height, grade);
  if (state.grain) drawGrain(ctx, width, height);

  drawCaption(ctx, width, height, state, grade);

  // Thin frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(2, width * 0.002);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, width - ctx.lineWidth * 2, height - ctx.lineWidth * 2);
}

/** Renders the same cover at export size and returns the fresh canvas. */
export function renderExport(state, exportWidth, exportHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  drawCoverArt(canvas, state);
  return canvas;
}
