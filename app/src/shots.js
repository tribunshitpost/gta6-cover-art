// Vice Sunset Cover Studio — fixed scenes for screenshots.
//
// ?shot=cover paints one cover full-page (the app's own drawing at the size
// the query names); ?shot=editor opens the editor with a scene's state and
// photos loaded. Both set window.__shotReady once the paint is done, which
// the screenshot script waits for before it shoots.

import { defaultState, paintCover } from './cover.js';

// NOTE: this module deliberately does NOT import main.js — main.js loads it
// with a top-level await, so importing main.js back would deadlock the
// module graph. The editor entry point is passed in by main.js instead.

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

export async function runShot(params, initEditor) {
  const state = defaultState();
  state.layout = params.get('layout') || state.layout;
  state.grade = params.get('grade') || state.grade;
  state.lettering = params.get('lettering') || state.lettering;
  state.caption = params.get('caption') || state.caption;
  state.tagline = params.get('tagline') || state.tagline;
  const py0 = params.get('py0');
  if (py0 !== null) {
    // A vertical-pan override for the first photo's panels (the left column
    // of a quad, the outer panels of a triptych): it keeps a face that sits
    // high in its photo inside every panel that shows it.
    state.panels[0].py = Number(py0);
    if (state.panels[2]) state.panels[2].py = Number(py0);
  }
  const py1 = params.get('py1');
  if (py1 !== null) {
    state.panels[1].py = Number(py1);
    if (state.panels[3]) state.panels[3].py = Number(py1);
  }
  const py2 = params.get('py2');
  if (py2 !== null) state.panels[2].py = Number(py2);

  const photo = params.get('photo') || 'boulevard';
  const photo2 = params.get('photo2') || 'pier';
  const shot = params.get('shot') || 'cover';

  if (shot === 'cover') {
    const w = Number(params.get('w') || 1280);
    const h = Number(params.get('h') || 720);
    const imgs = [
      await loadImage(`samples/${photo}.jpg`),
      await loadImage(`samples/${photo2}.jpg`),
    ];
    document.body.classList.add('cover-shot');
    const stage = document.querySelector('#stage');
    stage.width = w;
    stage.height = h;
    paintCover(stage, state, imgs);
    window.__shotReady = true;
    return;
  }

  // Editor scene: start the editor with this scene's words, layout and
  // photos, then signal ready once its first paint has the photos in it.
  initEditor({ state, photos: [photo, photo2] });
  const waitReady = () => {
    if (window.__editorReady) {
      window.__shotReady = true;
    } else {
      setTimeout(waitReady, 50);
    }
  };
  waitReady();
}
