// shots.js — fixed scenes for screenshots and demos.
//
// A scene is a full editor state snapshot: layout, grade, lettering, words and
// per-panel photo choices with pan/zoom. `?shot=cover` or `?shot=editor` picks
// one by name; the editor (main.js) applies it on load and then flips
// window.__shotReady once the scene is painted. This module imports nothing
// from the editor, so the two can never deadlock on each other.

/** The four fixed scenes, in the order the screenshots are taken. */
export const SCENES = [
  {
    name: 'cover',
    shot: '1-cover',
    title: 'Sunset Heist — triptych cover',
    state: {
      layout: 'triptych', grade: 'sunset', lettering: 'vice',
      caption: 'SUNSET HEIST', tagline: 'VICE CITY • 2026',
      halftone: true, grain: true, fillOne: false,
      photos: ['pier', 'boulevard', 'pier', null],
      panels: [
        { photo: 0, px: 0.5, py: 0.5, zoom: 1 },
        { photo: 1, px: 0.5, py: 0.42, zoom: 1.05 },
        { photo: 2, px: 0.5, py: 0.5, zoom: 1 },
        { photo: 0, px: 0.5, py: 0.5, zoom: 1 },
      ],
    },
  },
  {
    name: 'editor',
    shot: '2-editor',
    title: 'Editor with a photo loaded',
    state: {
      layout: 'quad', grade: 'sunset', lettering: 'vice',
      caption: 'BOULEVARD QUEEN', tagline: 'VICE CITY • 2026',
      halftone: true, grain: true, fillOne: false,
      photos: ['boulevard', 'pier', null, null],
      panels: [
        { photo: 0, px: 0.5, py: 0.34, zoom: 1 },
        { photo: 1, px: 0.5, py: 0.5, zoom: 1 },
        { photo: 0, px: 0.5, py: 0.34, zoom: 1 },
        { photo: 1, px: 0.5, py: 0.5, zoom: 1 },
      ],
    },
  },
  {
    name: 'cover',
    shot: '3-cover',
    title: 'Boulevard Queen — quad cover, neon glow',
    state: {
      layout: 'quad', grade: 'neon', lettering: 'neon',
      caption: 'BOULEVARD QUEEN', tagline: 'VICE CITY • 2026',
      halftone: true, grain: true, fillOne: false,
      photos: ['boulevard', 'pier', 'boulevard', 'pier'],
      panels: [
        { photo: 0, px: 0.5, py: 0.34, zoom: 1 },
        { photo: 1, px: 0.5, py: 0.5, zoom: 1 },
        { photo: 2, px: 0.5, py: 0.34, zoom: 1 },
        { photo: 3, px: 0.5, py: 0.5, zoom: 1 },
      ],
    },
  },
  {
    name: 'cover',
    shot: '4-cover',
    title: 'Neon Palms — split cover, portrait',
    state: {
      layout: 'split', grade: 'neon', lettering: 'neon',
      caption: 'NEON PALMS', tagline: 'VICE CITY • 2026',
      halftone: true, grain: true, fillOne: false,
      photos: ['pier', 'boulevard', 'pier', null],
      panels: [
        { photo: 0, px: 0.5, py: 0.5, zoom: 1 },
        { photo: 1, px: 0.5, py: 0.34, zoom: 1 },
        { photo: 2, px: 0.5, py: 0.5, zoom: 1 },
        { photo: 0, px: 0.5, py: 0.5, zoom: 1 },
      ],
    },
  },
];

/** The scene for a `?shot=` value ('cover' or 'editor'), or null. */
export function sceneFor(name) {
  if (name === 'editor') return SCENES[1];
  if (name === 'cover') {
    const idx = Number(new URLSearchParams(location.search).get('n') || '0');
    const covers = SCENES.filter((s) => s.name === 'cover');
    return covers[((idx % covers.length) + covers.length) % covers.length];
  }
  return null;
}

/** Read the shot parameters out of the current URL. */
export function shotParams() {
  const q = new URLSearchParams(location.search);
  return {
    shot: q.get('shot'),
    n: Number(q.get('n') || '0'),
    w: Number(q.get('w') || '0'),
    h: Number(q.get('h') || '0'),
  };
}
