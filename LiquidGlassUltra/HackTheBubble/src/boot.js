// Loaded last (see manifest.json), after every effect has registered.
if (window.Liquid && !window.__liquidBooted) {
  window.__liquidBooted = true;
  window.Liquid.boot();
}
