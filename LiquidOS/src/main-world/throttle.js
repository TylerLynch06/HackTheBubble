// Runs in the page's own JavaScript world (see "world": "MAIN" in the manifest),
// because that is the only place the page's requestAnimationFrame can be replaced.
// It does nothing until Low Power Mode sends the 'liquidos-low-power' event,
// then holds the page's animation to about 4.5 frames a second.
(() => {
  if (window.__liquidOSThrottle) return;
  window.__liquidOSThrottle = true;

  const FRAME_MS = 1000 / 4.5;
  const realRAF = window.requestAnimationFrame;
  const realCancel = window.cancelAnimationFrame;
  const pending = new Map();
  let nextId = 1, timer = 0;

  function flush() {
    const now = performance.now(), run = Array.from(pending.values());
    pending.clear();
    for (const cb of run) { try { cb(now); } catch (e) { console.error(e); } }
  }

  window.addEventListener('liquidos-low-power', (e) => {
    if (e.detail) {
      if (timer) return;
      window.requestAnimationFrame = (cb) => { const id = nextId++; pending.set(id, cb); return id; };
      window.cancelAnimationFrame = (id) => { if (!pending.delete(id)) realCancel.call(window, id); };
      timer = setInterval(flush, FRAME_MS);
    } else if (timer) {
      clearInterval(timer); timer = 0;
      window.requestAnimationFrame = realRAF;
      window.cancelAnimationFrame = realCancel;
      flush();
    }
  });
})();
