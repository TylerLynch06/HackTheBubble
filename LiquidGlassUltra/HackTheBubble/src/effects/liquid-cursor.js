// Liquid Cursor: the real cursor is hidden and replaced by a blob of glass that
// follows on a wobbly spring, stretches as it moves, blurs whatever you're reading,
// and makes ripples when you click.
(() => {
  const CSS = `
    html.lq-cursor-hide, html.lq-cursor-hide * { cursor: none !important; }
    #lq-blob {
      position: absolute; left: 0; top: 0; border-radius: 50%;
      background: radial-gradient(circle at 30% 28%, rgba(255,255,255,.75), rgba(255,255,255,.08) 45%, rgba(120,180,255,.12));
      -webkit-backdrop-filter: blur(var(--lq-blob-blur, 6px)) saturate(220%) contrast(1.15);
      backdrop-filter: blur(var(--lq-blob-blur, 6px)) saturate(220%) contrast(1.15);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.7), inset 0 -10px 22px rgba(255,255,255,.3), 0 10px 30px rgba(0,0,0,.2);
      will-change: transform;
    }
    .lq-ripple {
      position: absolute; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.85); box-shadow: 0 0 12px rgba(120,190,255,.6);
      -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px);
      animation: lq-ripple .9s cubic-bezier(.1,.6,.3,1) forwards;
    }
    @keyframes lq-ripple { to { transform: scale(6); opacity: 0; } }
  `;

  Liquid.register({
    id: 'liquid-cursor',
    start(L) {
      const { el, clamp, lerp } = L.util;
      this.style = L.util.addStyle('lq-cursor-css', CSS);
      this.blob = el('div', { attrs: { id: 'lq-blob' } });
      L.util.layer().appendChild(this.blob);
      let mx = innerWidth / 2, my = innerHeight / 2, x = mx, y = my, vx = 0, vy = 0;

      this.onMove = (e) => { mx = e.clientX; my = e.clientY; };
      this.onDown = (e) => {
        for (let k = 0; k < 3; k++) {
          const r = el('div', { cls: 'lq-ripple', style: { left: e.clientX + 'px', top: e.clientY + 'px', animationDelay: k * 0.12 + 's' } });
          L.util.layer().appendChild(r);
          setTimeout(() => r.remove(), 1300);
        }
      };
      window.addEventListener('mousemove', this.onMove, true);
      window.addEventListener('mousedown', this.onDown, true);

      const loop = () => {
        const i = L.intensity;
        const size = lerp(50, 170, i);
        document.documentElement.classList.toggle('lq-cursor-hide', i >= 0.4);
        this.blob.style.width = this.blob.style.height = size + 'px';
        this.blob.style.setProperty('--lq-blob-blur', lerp(2, 10, i) + 'px');
        // Under-damped spring: lags, overshoots, jiggles.
        const k = lerp(0.12, 0.035, i);
        vx = (vx + (mx - x) * k) * 0.84;
        vy = (vy + (my - y) * k) * 0.84;
        x += vx; y += vy;
        const speed = Math.hypot(vx, vy);
        const ang = Math.atan2(vy, vx);
        const s = clamp(speed * 0.025, 0, 0.6);
        this.blob.style.transform =
          `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${ang}rad) scale(${1 + s}, ${1 - s * 0.6})`;
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('mousemove', this.onMove, true);
      window.removeEventListener('mousedown', this.onDown, true);
      document.documentElement.classList.remove('lq-cursor-hide');
      this.blob?.remove();
      this.style?.remove();
    }
  });
})();
