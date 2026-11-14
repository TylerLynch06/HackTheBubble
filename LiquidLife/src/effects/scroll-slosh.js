// Scroll slosh (stage 2+): scrolling shoves the water. A wave front rolls in from
// the edge the content is coming from, then bounces around the window.
(() => {
  const L = window.Liquid;
  const last = new WeakMap();
  let lastWin = 0, lastT = 0;

  function onScroll(e) {
    const t = e.target;
    let pos;
    let prev;
    if (t === document || t === document.documentElement || t === document.body) {
      pos = window.scrollY; prev = lastWin; lastWin = pos;
    } else if (t && t.nodeType === 1) {
      pos = t.scrollTop; prev = last.has(t) ? last.get(t) : pos; last.set(t, pos);
    } else return;
    const dy = pos - prev;
    if (!dy) return;
    const now = performance.now();
    if (now - lastT < 40) return; // one wave front per ~2 frames is plenty
    lastT = now;
    const strength = L.util.clamp(dy * 0.035, -3.5, 3.5) * (L.stage >= L.CHAOS ? 1.6 : 1);
    L.water.band(dy > 0 ? innerHeight - 24 : 24, 46, -Math.abs(strength));
  }

  L.gag({
    id: 'scroll-slosh',
    min: 2,
    start() {
      lastWin = window.scrollY;
      document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    },
    stop() {
      document.removeEventListener('scroll', onScroll, { capture: true });
    }
  });
})();
