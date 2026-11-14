// Rising Tide: the window slowly fills with water. Everything under the
// waterline is distorted and can't be clicked. Click the water to bail it out.
(() => {
  const CSS = `
    #lq-water {
      position: absolute; left: 0; right: 0; bottom: 0; height: 0;
      pointer-events: auto; cursor: pointer;
      background: linear-gradient(to bottom, rgba(130,200,255,.32), rgba(20,90,190,.55));
      -webkit-backdrop-filter: blur(2px) saturate(170%) hue-rotate(-12deg);
      backdrop-filter: blur(2px) saturate(170%) hue-rotate(-12deg);
    }
    #lq-water .lq-hint {
      position: absolute; left: 50%; top: 34px; transform: translateX(-50%);
      font: 700 13px -apple-system, "Segoe UI", sans-serif; color: rgba(255,255,255,.9);
      text-shadow: 0 1px 4px rgba(0,40,90,.5); letter-spacing: .04em;
      animation: lq-bob 2.4s ease-in-out infinite; white-space: nowrap;
    }
    #lq-water .lq-bubble {
      position: absolute; bottom: -20px; border-radius: 50%;
      border: 1.5px solid rgba(255,255,255,.75); background: rgba(255,255,255,.12);
      animation: lq-rise linear forwards;
    }
    .lq-splash {
      position: absolute; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.9); animation: lq-splash .7s ease-out forwards;
    }
    @keyframes lq-bob { 50% { transform: translate(-50%, -5px); } }
    @keyframes lq-rise { to { transform: translateY(calc(-1 * var(--h))) translateX(var(--dx)); opacity: 0; } }
    @keyframes lq-splash { to { transform: scale(5); opacity: 0; } }
  `;

  Liquid.register({
    id: 'water-level',
    start(L) {
      const { el, rand, clamp } = L.util;
      this.style = L.util.addStyle('lq-water-css', CSS);
      this.hint = el('div', { cls: 'lq-hint', text: '🪣  CLICK TO BAIL' });
      this.water = el('div', { attrs: { id: 'lq-water' } }, this.hint);
      L.util.layer().appendChild(this.water);

      let level = 0;         // 0..1 of the viewport
      let warned = false;
      const t0 = performance.now();

      this.water.addEventListener('click', (e) => {
        e.stopPropagation();
        level = Math.max(0, level - 0.05);
        const s = el('div', { cls: 'lq-splash', style: { left: e.clientX + 'px', top: e.clientY + 'px' } });
        L.util.layer().appendChild(s);
        setTimeout(() => s.remove(), 750);
      });

      this.bubbles = setInterval(() => {
        if (level < 0.03) return;
        const size = rand(4, 14);
        const b = el('div', { cls: 'lq-bubble', style: {
          left: rand(0, 100) + '%', width: size + 'px', height: size + 'px',
          animationDuration: rand(2, 5) + 's'
        } });
        b.style.setProperty('--h', level * innerHeight + 'px');
        b.style.setProperty('--dx', rand(-30, 30) + 'px');
        this.water.appendChild(b);
        b.addEventListener('animationend', () => b.remove());
      }, 350);

      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        const i = L.intensity;
        const maxLevel = 0.3 + 0.55 * i;
        if (now - t0 > 6000) level = clamp(level + dt * (0.002 + 0.01 * i), 0, maxLevel);
        if (!warned && level >= maxLevel - 0.001) {
          warned = true;
          L.util.toast('Water level: maximum', 'Your browser is now 100% liquid. Please swim responsibly.');
        }

        const W = innerWidth;
        const H = level * innerHeight + 30;
        const t = now / 1000;
        this.water.style.height = H + 'px';
        this.hint.style.display = level > 0.08 ? '' : 'none';
        // Animated wave along the top edge, done with clip-path so backdrop-filter still works.
        const pts = [];
        for (let x = 0; x <= W + 40; x += 40) {
          const y = 15 + Math.sin(x * 0.012 + t * 2.1) * 6 + Math.sin(x * 0.005 - t * 1.3) * 7 * (0.5 + i);
          pts.push(`${x}px ${y.toFixed(1)}px`);
        }
        this.water.style.clipPath = `polygon(${pts.join(',')}, ${W + 40}px ${H}px, 0px ${H}px)`;
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(this.raf);
      clearInterval(this.bubbles);
      this.water?.remove();
      this.style?.remove();
    }
  });
})();
