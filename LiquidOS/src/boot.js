// Starts Liquid Life. Runs last, after the engine and every gag have loaded.
(() => {
  const L = window.Liquid;
  if (!L || L.booted) return;
  L.booted = true;
  L.boot();
})();
