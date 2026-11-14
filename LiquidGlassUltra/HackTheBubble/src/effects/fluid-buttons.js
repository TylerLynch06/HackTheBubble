// Fluid Buttons: buttons and links are pushed away from the cursor like water
// around a finger, then spring back. Corner one and you can still click it. Eventually.
(() => {
  const TARGETS = 'button, a[href], [role="button"], input[type="submit"], input[type="button"], summary';
  const RADIUS = 140;

  Liquid.register({
    id: 'fluid-buttons',
    start(L) {
      const { clamp, lerp } = L.util;
      this.items = new Map(); // element -> {ox, oy, vx, vy, mode, prev}
      let mx = -9999, my = -9999, list = [];

      const refresh = () => {
        list = [...document.querySelectorAll(TARGETS)].filter((n) => !n.closest('[data-lq]')).slice(0, 600);
      };
      refresh();
      this.refreshTimer = setInterval(refresh, 1500);
      this.onMove = (e) => { mx = e.clientX; my = e.clientY; };
      window.addEventListener('mousemove', this.onMove, true);

      const offset = (n, s, dx, dy) => {
        if (!s.mode) {
          const cs = getComputedStyle(n);
          // Inline elements ignore transforms, so nudge those with position: relative instead.
          s.mode = cs.display === 'inline' && cs.position === 'static' ? 'rel' : 'translate';
          s.prev = { position: n.style.position, left: n.style.left, top: n.style.top, translate: n.style.translate };
        }
        if (s.mode === 'rel') {
          n.style.position = 'relative';
          n.style.left = dx.toFixed(1) + 'px';
          n.style.top = dy.toFixed(1) + 'px';
        } else {
          n.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        }
      };

      const loop = () => {
        const i = L.intensity;
        const maxPush = lerp(25, 110, i);
        for (const n of list) {
          const r = n.getBoundingClientRect();
          if (r.bottom < -50 || r.top > innerHeight + 50) continue;
          let s = this.items.get(n);
          // Use the element's resting centre so it doesn't chase itself.
          const cx = r.left + r.width / 2 - (s?.ox || 0);
          const cy = r.top + r.height / 2 - (s?.oy || 0);
          const dx = cx - mx, dy = cy - my;
          const d = Math.hypot(dx, dy) || 1;
          const reach = RADIUS + Math.max(r.width, r.height) / 2;
          if (!s && d > reach) continue;
          if (!s) { s = { ox: 0, oy: 0, vx: 0, vy: 0 }; this.items.set(n, s); }
          const push = d < reach ? (1 - d / reach) * maxPush : 0;
          const tx = (dx / d) * push, ty = (dy / d) * push;
          s.vx = (s.vx + (tx - s.ox) * 0.12) * 0.78;
          s.vy = (s.vy + (ty - s.oy) * 0.12) * 0.78;
          s.ox = clamp(s.ox + s.vx, -maxPush, maxPush);
          s.oy = clamp(s.oy + s.vy, -maxPush, maxPush);
          offset(n, s, s.ox, s.oy);
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(this.raf);
      clearInterval(this.refreshTimer);
      window.removeEventListener('mousemove', this.onMove, true);
      for (const [n, s] of this.items || []) if (s.prev) Object.assign(n.style, s.prev);
      this.items?.clear();
    }
  });
})();
