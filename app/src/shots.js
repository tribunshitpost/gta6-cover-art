// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample
// photo loaded; ?shot=cover shows the exported cover alone, at the size the
// query asks for. window.__shotReady is set once the scene has painted.
// Query knobs: photo + photo2 (pier | boulevard), caption, tagline, layout,
// grade, lettering, w, h, py0 + py1 (vertical pan for the panels showing
// photo / photo2: a positive value slides the photo down, so the panel
// frames toward the photo's top — used to keep a face in frame).

export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') document.body.classList.add('shot-editor');
  const photo = query.get('photo') ?? 'pier';
  const photo2 = query.get('photo2') ?? 'boulevard';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const tagline = query.get('tagline') ?? 'Vice City • 2026';
  const layout = query.get('layout') ?? 'triptych';
  const grade = query.get('grade') ?? 'sunset';
  const lettering = query.get('lettering') ?? 'vice';
  const w = Number(query.get('w') ?? '1080');
  const h = Number(query.get('h') ?? '1080');
  const py0 = Number(query.get('py0') ?? '0');
  const py1 = Number(query.get('py1') ?? '0');
  api.sizeCanvas(w, h);
  api.setCaption(caption);
  api.setTagline(tagline);
  api.apply({
    layout,
    grade,
    lettering,
    panelPhotos: [0, 1, 0, 1],
    zooms: [1, 1, 1, 1],
    pans: [{ x: 0, y: py0 }, { x: 0, y: py1 }, { x: 0, y: py0 }, { x: 0, y: py1 }],
  });
  document.body.dataset.grade = grade;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
  document.querySelectorAll('[data-lettering]').forEach((b) => b.classList.toggle('active', b.dataset.lettering === lettering));
  await api.loadSample(photo, 0);
  await api.loadSample(photo2, 1);
  api.rebuild();
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
