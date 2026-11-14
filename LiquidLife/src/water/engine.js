// Liquid Life water engine: one heightfield wave simulation covering the viewport.
// Everything else (refraction, shine, gags) reads from or splashes into this.
//
//   Liquid.water.splash(x, y, radius, strength)   x/y in viewport px; negative strength pushes down
//   Liquid.water.band(y, thickness, strength)      a wave front across the full width
//   Liquid.water.slopeAt(x, y)                     { x, y } surface slope under a viewport point
//   Liquid.water.heightAt(x, y)                    surface height under a viewport point
//   Liquid.water.calm(x, y, radius, keep)          flatten the water around a point
//   Liquid.water.onFrame(fn)                       fn({ h, W, H, cell }) after every sim step
//   Liquid.water.power                             px of refraction at full slope (set per stage)
//   Liquid.water.start() / stop()
(() => {
  const L = (window.Liquid = window.Liquid || {});
  if (L.water) return;

  const CELL = 8;          // px per sim cell
  const DAMP = 0.985;      // energy kept per step
  const IDLE_FRAMES = 45;  // calm frames before the loop sleeps

  let W = 0, H = 0, cur, prev;
  let raf = 0, running = false, calm = 0;
  const frameFns = new Set();
  const sleepFns = new Set();
  const stats = { ms: 0, fps: 0, awake: false };
  let lastT = 0;

  function resize() {
    W = Math.max(16, Math.ceil(innerWidth / CELL) + 2);
    H = Math.max(16, Math.ceil(innerHeight / CELL) + 2);
    cur = new Float32Array(W * H);
    prev = new Float32Array(W * H);
  }

  function splash(x, y, radius = 30, strength = 1) {
    if (!running) return;
    const cx = x / CELL + 1, cy = y / CELL + 1, r = Math.max(1, radius / CELL);
    const x0 = Math.max(1, Math.floor(cx - r * 2)), x1 = Math.min(W - 2, Math.ceil(cx + r * 2));
    const y0 = Math.max(1, Math.floor(cy - r * 2)), y1 = Math.min(H - 2, Math.ceil(cy + r * 2));
    const inv = 1 / (r * r);
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d2 = ((i - cx) * (i - cx) + (j - cy) * (j - cy)) * inv;
        cur[j * W + i] += strength * Math.exp(-d2 * 2);
      }
    }
    wake();
  }

  function band(y, thickness = 40, strength = 1) {
    if (!running) return;
    const cy = y / CELL + 1, r = Math.max(1, thickness / CELL);
    const y0 = Math.max(1, Math.floor(cy - r * 2)), y1 = Math.min(H - 2, Math.ceil(cy + r * 2));
    for (let j = y0; j <= y1; j++) {
      const d = (j - cy) / r, a = strength * Math.exp(-d * d * 2);
      for (let i = 1; i < W - 1; i++) cur[j * W + i] += a;
    }
    wake();
  }

  function slopeAt(x, y) {
    if (!running || !cur) return { x: 0, y: 0 };
    const i = Math.min(W - 2, Math.max(1, Math.round(x / CELL) + 1));
    const j = Math.min(H - 2, Math.max(1, Math.round(y / CELL) + 1));
    const k = j * W + i;
    return { x: cur[k + 1] - cur[k - 1], y: cur[k + W] - cur[k - W] };
  }

  function heightAt(x, y) {
    if (!running || !cur) return 0;
    const i = Math.min(W - 2, Math.max(1, Math.round(x / CELL) + 1));
    const j = Math.min(H - 2, Math.max(1, Math.round(y / CELL) + 1));
    return cur[j * W + i];
  }

  // Flatten the water around a point (keep = fraction of the wave left at the centre).
  function flatten(x, y, radius = 100, keep = 0.5) {
    if (!running || !cur) return;
    const cx = x / CELL + 1, cy = y / CELL + 1, r = Math.max(1, radius / CELL);
    const x0 = Math.max(1, Math.floor(cx - r * 1.6)), x1 = Math.min(W - 2, Math.ceil(cx + r * 1.6));
    const y0 = Math.max(1, Math.floor(cy - r * 1.6)), y1 = Math.min(H - 2, Math.ceil(cy + r * 1.6));
    const inv = 1 / (r * r);
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d2 = ((i - cx) * (i - cx) + (j - cy) * (j - cy)) * inv;
        const f = 1 - (1 - keep) * Math.exp(-d2 * 1.2);
        cur[j * W + i] *= f; prev[j * W + i] *= f;
      }
    }
  }

  function step() {
    let energy = 0;
    for (let j = 1; j < H - 1; j++) {
      let i = j * W + 1;
      for (const end = i + W - 2; i < end; i++) {
        const n = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i]) * DAMP;
        prev[i] = n;
        if (n > energy) energy = n; else if (-n > energy) energy = -n;
      }
    }
    const t = cur; cur = prev; prev = t;
    return energy;
  }

  function loop(now) {
    const t0 = performance.now();
    const energy = step();
    const frame = { h: cur, W, H, cell: CELL };
    for (const fn of frameFns) fn(frame);
    stats.ms = stats.ms * 0.9 + (performance.now() - t0) * 0.1;
    if (lastT) stats.fps = stats.fps * 0.9 + (1000 / Math.max(1, now - lastT)) * 0.1;
    lastT = now;

    calm = energy < 0.004 ? calm + 1 : 0;
    if (calm > IDLE_FRAMES) {
      // Flat water: stop burning frames and let the page render untouched.
      cur.fill(0); prev.fill(0);
      stats.awake = false; lastT = 0; raf = 0;
      for (const fn of sleepFns) fn();
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  function wake() {
    calm = 0;
    if (running && !raf) { stats.awake = true; raf = requestAnimationFrame(loop); }
  }

  L.water = {
    stats,
    power: 70,
    get cell() { return CELL; },
    splash, band, slopeAt, heightAt, calm: flatten,
    onFrame(fn) { frameFns.add(fn); return () => frameFns.delete(fn); },
    onSleep(fn) { sleepFns.add(fn); return () => sleepFns.delete(fn); },
    start() {
      if (running) return;
      running = true;
      resize();
      window.addEventListener('resize', resize);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf); raf = 0; lastT = 0;
      stats.awake = false;
      window.removeEventListener('resize', resize);
      for (const fn of sleepFns) fn();
    }
  };
})();
