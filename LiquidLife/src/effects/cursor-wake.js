// Cursor wake (stage 1+): the pointer drags through the water. Moving leaves a
// wake that grows with speed; clicking is a cannonball. Both get worse each stage.
(() => {
  const L = window.Liquid;
  const BOOST = [0, 0.4, 0.55, 0.45, 0.7, 1.4];
  let lx = null, ly = null;

  function onMove(e) {
    const x = e.clientX, y = e.clientY;
    if (lx === null) { lx = x; ly = y; return; }
    const dx = x - lx, dy = y - ly, dist = Math.hypot(dx, dy);
    if (dist < 3 || L.towel) return; // a towel leaves no wake
    const power = Math.min(1.6, 0.25 + dist * 0.03) * BOOST[L.stage];
    const steps = Math.min(12, Math.ceil(dist / 14));
    for (let s = 1; s <= steps; s++) {
      L.water.splash(lx + (dx * s) / steps, ly + (dy * s) / steps, 22, -power / Math.sqrt(steps));
    }
    lx = x; ly = y;
  }

  function onDown(e) {
    L.water.splash(e.clientX, e.clientY, 48, -2.6 * BOOST[L.stage]);
  }

  L.gag({
    id: 'cursor-wake',
    min: 1,
    start() {
      window.addEventListener('pointermove', onMove, { capture: true, passive: true });
      window.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    },
    stop() {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerdown', onDown, { capture: true });
      lx = ly = null;
    }
  });
})();
