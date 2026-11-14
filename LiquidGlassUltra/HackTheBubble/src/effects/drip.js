// Dripping Letters: random visible letters melt off the page, fall with gravity
// (stretching as they go), splat, and pile up in a puddle at the bottom of the screen.
(() => {
  const SKIP = 'script, style, textarea, input, select, code, pre, [contenteditable=""], [contenteditable="true"], [data-lq]';
  const MAX_PUDDLE = 350;

  // Find a visible, non-space character at a random point on screen.
  function findLetter() {
    for (let tries = 0; tries < 20; tries++) {
      const x = Math.random() * innerWidth;
      const y = Math.random() * innerHeight * 0.85;
      const r = document.caretRangeFromPoint?.(x, y);
      const node = r?.startContainer;
      if (!node || node.nodeType !== 3 || !node.parentElement || node.parentElement.closest(SKIP)) continue;
      let off = r.startOffset;
      const txt = node.nodeValue;
      if (!/\S/.test(txt[off] || '')) off -= 1;
      if (off < 0 || !/\S/.test(txt[off] || '')) continue;
      return { node, off };
    }
    return null;
  }

  Liquid.register({
    id: 'drip',
    start(L) {
      const { el, rand, lerp } = L.util;
      this.spans = [];
      this.drops = [];
      this.landed = [];
      this.puddle = el('div', { style: {
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '0px',
        background: 'linear-gradient(to bottom, rgba(140,200,255,.25), rgba(60,120,220,.4))',
        backdropFilter: 'blur(3px)', transition: 'height .6s ease'
      } });
      L.util.layer().appendChild(this.puddle);

      const meltOne = () => {
        const hit = findLetter();
        if (!hit) return;
        const { node, off } = hit;
        const ch = node.nodeValue[off];
        const parent = node.parentElement;
        const cs = getComputedStyle(parent);

        // Wrap the character in a span so we can measure it and leave a hole.
        const mid = node.splitText(off);
        mid.splitText(1);
        const span = document.createElement('span');
        span.setAttribute('data-lq-drip', '');
        mid.parentNode.insertBefore(span, mid);
        span.appendChild(mid);
        const rect = span.getBoundingClientRect();
        span.style.color = 'transparent';
        span.style.textShadow = 'none';
        this.spans.push(span);
        if (!rect.width) return;

        const drop = el('div', { text: ch, style: {
          position: 'absolute', left: rect.left + 'px', top: rect.top + 'px',
          font: cs.font, color: cs.color, lineHeight: rect.height + 'px',
          transformOrigin: '50% 0', willChange: 'transform', whiteSpace: 'pre'
        } });
        L.util.layer().appendChild(drop);
        this.drops.push({ n: drop, y: rect.top, x: rect.left, vy: rand(0, 0.5), wobble: rand(0, 6), h: rect.height, delay: rand(10, 50) });
      };

      const schedule = () => {
        const i = L.intensity;
        if (!document.hidden) {
          const burst = Math.random() < 0.12 * i ? Math.floor(rand(3, 9)) : 1; // sometimes a whole word goes
          for (let k = 0; k < burst; k++) meltOne();
        }
        this.timer = setTimeout(schedule, lerp(2600, 250, i) * rand(0.6, 1.4));
      };
      this.timer = setTimeout(schedule, 1500);

      const loop = () => {
        const floor = innerHeight - parseFloat(this.puddle.style.height || 0);
        for (let k = this.drops.length - 1; k >= 0; k--) {
          const d = this.drops[k];
          if (d.delay > 0) { // cling to the page for a moment, stretching like a drip
            d.delay--;
            d.n.style.transform = `scaleY(${1 + (50 - d.delay) * 0.004})`;
            continue;
          }
          d.vy += 0.45;
          d.y += d.vy;
          const stretch = Math.min(1 + d.vy * 0.06, 2.6);
          d.n.style.transform = `translate(${Math.sin((d.y + d.wobble) / 30) * 2}px, ${d.y - parseFloat(d.n.style.top)}px) scale(${1 / Math.sqrt(stretch)}, ${stretch})`;
          if (d.y + d.h >= floor) {
            // Splat: land in the puddle, squashed and slightly blurry.
            d.n.style.top = (floor - d.h * 0.6) + 'px';
            d.n.style.transition = 'transform .25s cubic-bezier(.2,1.8,.4,1)';
            d.n.style.transform = `rotate(${rand(-40, 40)}deg) scale(1.4, .55)`;
            d.n.style.filter = 'blur(.6px)';
            d.n.style.opacity = '.85';
            this.drops.splice(k, 1);
            this.landed.push(d.n);
            if (this.landed.length > MAX_PUDDLE) this.landed.shift().remove();
            this.puddle.style.height = Math.min(4 + this.landed.length * 0.35, 120) + 'px';
          }
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },
    stop() {
      clearTimeout(this.timer);
      cancelAnimationFrame(this.raf);
      this.drops?.forEach((d) => d.n.remove());
      this.landed?.forEach((n) => n.remove());
      this.puddle?.remove();
      // Put every letter back where it was.
      this.spans?.forEach((s) => {
        const p = s.parentNode;
        if (!p) return;
        s.replaceWith(...s.childNodes);
        p.normalize();
      });
      this.spans = [];
    }
  });
})();
