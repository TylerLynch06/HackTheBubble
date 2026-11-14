// Cursor capture. A web page can't move the real mouse pointer, so when a sea
// creature grabs the cursor we hide the real one and show a stand-in that the
// creature controls. The real pointer keeps moving invisibly, and its movements
// are how the user fights back (shaking, pulling).
//
//   Liquid.cursor.x / .y            real pointer position
//   Liquid.cursor.onDelta(fn)       fn(dx, dy) on every real pointer move; returns an unsubscribe
//   Liquid.cursor.capture()         hide the real cursor, show the stand-in; false if already held
//   Liquid.cursor.place(x, y, rot)  move the stand-in
//   Liquid.cursor.release()         stand-in springs back to the real pointer, then control returns
//
// While held, a transparent shield covers the page, so nothing can be clicked.
(() => {
  const L = window.Liquid;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  let x = innerWidth / 2, y = innerHeight / 2;
  const subs = new Set();
  let shield = null, fake = null, held = false, fx = 0, fy = 0, frot = 0, backRaf = 0;

  function onMove(e) {
    const dx = e.clientX - x, dy = e.clientY - y;
    x = e.clientX; y = e.clientY;
    if (dx || dy) for (const fn of subs) fn(dx, dy);
  }

  function arrow() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 22 30'); svg.setAttribute('width', 22); svg.setAttribute('height', 30);
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', 'M2 2 L2 23 L7.6 17.8 L11.8 27.4 L15.2 25.9 L11.1 16.6 L18.8 16.6 Z');
    p.setAttribute('fill', '#111'); p.setAttribute('stroke', '#fff');
    p.setAttribute('stroke-width', '1.7'); p.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(p);
    return svg;
  }

  function draw() {
    if (fake) fake.style.transform = `translate(${(fx - 2).toFixed(1)}px, ${(fy - 2).toFixed(1)}px) rotate(${frot.toFixed(1)}deg)`;
  }

  function cleanup() {
    cancelAnimationFrame(backRaf); backRaf = 0; held = false;
    shield?.remove(); fake?.remove(); shield = fake = null;
  }

  L.cursor = {
    get x() { return x; },
    get y() { return y; },
    get held() { return held; },
    onDelta(fn) { subs.add(fn); return () => subs.delete(fn); },

    capture() {
      if (held || backRaf || L.stage < 1) return false;
      held = true;
      const { el } = L.util;
      shield = el('div', { position: 'absolute', inset: '0', pointerEvents: 'auto', cursor: 'none', zIndex: '50' });
      fake = el('div', {
        position: 'absolute', left: '0', top: '0', zIndex: '60', pointerEvents: 'none', lineHeight: '0',
        willChange: 'transform', transformOrigin: '2px 2px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))'
      });
      fake.appendChild(arrow());
      L.util.layer().append(shield, fake);
      fx = x; fy = y; frot = 0; draw();
      return true;
    },

    place(px, py, rot = 0) {
      if (!held) return;
      fx = px; fy = py; frot = rot; draw();
    },

    release() {
      if (!held) return;
      held = false;
      let vx = 0, vy = 0;
      const back = () => {
        vx = (vx + (x - fx) * 0.14) * 0.7; vy = (vy + (y - fy) * 0.14) * 0.7;
        fx += vx; fy += vy; frot *= 0.8; draw();
        if (Math.hypot(x - fx, y - fy) < 2 && Math.hypot(vx, vy) < 1.2) { backRaf = 0; cleanup(); }
        else backRaf = requestAnimationFrame(back);
      };
      backRaf = requestAnimationFrame(back);
    },

    drop: cleanup
  };

  L.gag({
    id: 'cursor',
    min: 1,
    start() { window.addEventListener('pointermove', onMove, { capture: true, passive: true }); },
    stop() { window.removeEventListener('pointermove', onMove, { capture: true }); cleanup(); }
  });
})();
