// Dark Mode and Light Mode. Originally the Lightmode extension.
//   Dark Mode ('torch'):     the page goes black, lit only by a small warm beam
//                            around the cursor.
//   Light Mode ('blinding'): the page is flooded with white, brightest at the cursor.
// The overlay sits above the water and everything living in it, so the sea
// creatures are in the dark too.
(() => {
  const L = window.Liquid;
  const RADIUS = 150;
  let overlay = null, raf = 0, x = innerWidth / 2, y = innerHeight / 2, mode = 'off';

  function position() {
    raf = 0;
    if (!overlay) return;
    overlay.style.setProperty('--lq-beam-x', x + 'px');
    overlay.style.setProperty('--lq-beam-y', y + 'px');
  }

  function onMove(e) {
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(position);
  }

  function paint(next) {
    mode = next;
    const o = overlay;
    if (mode === 'blinding') {
      o.style.background =
        'radial-gradient(circle at var(--lq-beam-x) var(--lq-beam-y), #fff 0, ' +
        `rgba(255,250,232,.93) ${RADIUS}px, rgba(255,255,255,.78) ${RADIUS * 3.2}px)`;
      o.style.backdropFilter = 'brightness(5.2) contrast(.66) saturate(1.2)';
    } else {
      o.style.background =
        'radial-gradient(circle at var(--lq-beam-x) var(--lq-beam-y), rgba(255,214,140,.10) 0, ' +
        `transparent ${Math.round(RADIUS * 0.45)}px, rgba(0,0,0,.985) ${RADIUS}px)`;
      o.style.backdropFilter = 'none';
    }
  }

  L.os.feature({
    id: 'dark',
    isOn: (s) => s.dark === 'torch' || s.dark === 'blinding',
    start(s) {
      overlay = L.util.el('div', {
        position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '80', opacity: '0', transition: 'opacity .6s ease'
      });
      L.util.layer().appendChild(overlay);
      paint(s.dark);
      position();
      requestAnimationFrame(() => requestAnimationFrame(() => { if (overlay) overlay.style.opacity = '1'; }));
      window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    },
    update(s) { if (overlay && s.dark !== mode) paint(s.dark); },
    stop() {
      window.removeEventListener('pointermove', onMove, { capture: true });
      cancelAnimationFrame(raf); raf = 0;
      overlay?.remove(); overlay = null; mode = 'off';
    }
  });
})();
