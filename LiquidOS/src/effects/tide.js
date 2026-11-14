// Tide (stage 4+): the bottom of the window becomes a beach. Waves run up the
// page and drag back down, each one reaching a little higher as the tide comes in.
// Whatever the water reaches is picked up: page content lifts off and floats on
// the surface, and the leading edge knocks letters loose. When a wave pulls back,
// content it no longer covers settles home and loose letters are left stranded.
// Nothing below the waterline can be clicked. Clicking the water bails some out.
(() => {
  const L = window.Liquid;
  const RISE_PER_SEC = 0.011;   // mean level, fraction of the viewport per second
  const SWASH_SEC = 5.5;        // one wave: quick run-up, slow drag back
  const BAIL = 0.08;
  let water, hint, raf = 0, mean = 0, last = 0, t0 = 0;
  let lastChop = 0, lastPick = 0, lastBand = 0, lastY = 0, announcedFull = false;

  // 0..1 over one wave: fast up the beach (35%), slow back down (65%).
  function swash(p) {
    if (p < 0.35) { const u = p / 0.35; return 1 - (1 - u) * (1 - u); }
    const u = (p - 0.35) / 0.65;
    return 1 - u * u * (3 - 2 * u);
  }

  function onBail(e) {
    e.preventDefault();
    e.stopPropagation();
    mean = Math.max(0, mean - BAIL);
    announcedFull = false;
    L.water.splash(e.clientX, e.clientY, 70, -5);
  }

  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const chaos = L.stage >= L.CHAOS;
    const maxMean = chaos ? 0.6 : 0.42;
    mean = Math.min(maxMean, mean + dt * RISE_PER_SEC * (chaos ? 1.8 : 1));
    if (!announcedFull && mean >= maxMean - 0.001) {
      announcedFull = true;
      L.util.toast('Storage almost full', 'Your browser is nearly full. Of water. Tap the water to bail.');
    }

    const Wpx = innerWidth, vh = innerHeight, t = now / 1000;
    const amp = (chaos ? 0.24 : 0.17) * Math.min(1, 0.45 + mean * 4);
    const level = mean + amp * swash((((now - t0) / 1000) / SWASH_SEC) % 1);
    const Hpx = level * vh + 30;
    const surfaceY = vh - Hpx + 15;
    const vel = surfaceY - lastY; // px per frame, negative while running up the beach
    lastY = surfaceY;

    water.style.height = Hpx + 'px';
    hint.style.display = mean > 0.08 ? '' : 'none';
    // Scalloped foam edge via clip-path.
    const pts = [];
    for (let x = 0; x <= Wpx + 40; x += 40) {
      const y = 15 + Math.sin(x * 0.012 + t * 2.1) * 6 + Math.sin(x * 0.005 - t * 1.3) * (chaos ? 12 : 7);
      pts.push(`${x}px ${y.toFixed(1)}px`);
    }
    water.style.clipPath = `polygon(${pts.join(',')}, ${Wpx + 40}px ${Hpx}px, 0px ${Hpx}px)`;

    // Tell the physics where the surface is, and pick up whatever it now covers.
    L.bodies.tide.active = true;
    L.bodies.tide.y = surfaceY;
    if (now - lastPick > 220) {
      lastPick = now;
      L.bodies.pickup((r) => r.bottom > surfaceY + 6, 30);
      // The leading edge of an incoming wave knocks letters loose just ahead of it.
      if (vel < -0.4 && L.flotsam) {
        for (let k = 0; k < 3; k++) L.flotsam.knockAt(L.util.rand(10, Wpx - 10), surfaceY - L.util.rand(4, 30));
      }
    }

    // Drive the real water surface: a wave front that follows the swash, plus chop.
    if (now - lastBand > 130 && Math.abs(vel) > 0.3) {
      lastBand = now;
      L.water.band(surfaceY, 34, L.util.clamp(vel * 0.3, -2.4, 2.4));
    }
    if (now - lastChop > 190 && level > 0.02) {
      lastChop = now;
      L.water.splash(L.util.rand(0, Wpx), surfaceY + 6, 28, L.util.rand(-1.4, 1.4));
    }
    raf = requestAnimationFrame(loop);
  }

  L.gag({
    id: 'tide',
    min: 4,
    start() {
      const { el, FONT } = L.util;
      mean = 0; announcedFull = false;
      water = el('div', {
        position: 'absolute', left: '0', right: '0', bottom: '0', height: '0',
        pointerEvents: 'auto', cursor: 'pointer',
        // White foam at the leading edge, shallow turquoise, then deep blue.
        background: 'linear-gradient(to bottom, rgba(255,255,255,.95) 0px, rgba(255,255,255,.8) 24px, ' +
          'rgba(190,240,255,.5) 42px, rgba(90,200,235,.34) 90px, rgba(20,110,200,.5) 260px, rgba(10,70,170,.62) 100%)',
        backdropFilter: 'blur(1.5px) saturate(170%) hue-rotate(-12deg)'
      });
      hint = el('div', {
        position: 'absolute', left: '50%', top: '58px', transform: 'translateX(-50%)',
        font: `700 13px ${FONT}`, color: 'rgba(255,255,255,.95)', letterSpacing: '.06em',
        textShadow: '0 1px 4px rgba(0,40,90,.7)', whiteSpace: 'nowrap', pointerEvents: 'none'
      }, 'TAP TO BAIL');
      water.appendChild(hint);
      water.addEventListener('click', onBail);
      L.util.layer().appendChild(water);
      last = t0 = performance.now();
      lastY = innerHeight;
      raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(raf);
      L.bodies.tide.active = false; // everything afloat springs home
      water?.remove();
      water = hint = null;
    }
  });
})();
