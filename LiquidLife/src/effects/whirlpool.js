// Whirlpool (stage 1+): stir the mouse in fast circles. After five laps a
// whirlpool opens where you were stirring and everything on screen is drawn into
// orbit. Keep stirring and it keeps going, faster with every extra lap. Stop, and
// the whole page gulps down the drain and is thrown back out (further, the harder
// you span it) before settling home.
// Alt+W opens one at the cursor and runs it for a few seconds on its own.
(() => {
  const L = window.Liquid;
  const TAU = Math.PI * 2;
  const LAPS_TO_OPEN = 5;
  const LEAK_LAPS_PER_SEC = 0.3;  // slow circling drains away, so it has to be brisk
  const PAUSE_RESET_MS = 320;     // stop moving this long and the count starts over
  const MIN_RADIUS = 34;          // px; tiny wiggles don't count as stirring
  const ALIVE_RATE = 0.7;         // laps/sec that still counts as "still stirring"
  const STOP_MS = 550;            // below that rate for this long and it lets go
  const MIN_OPEN_MS = 1300;
  const SPEED_PER_LAP = 0.28;     // extra spin per lap stirred after opening
  const MAX_SPEED = 7;
  const GULP_MS = 520;
  const AUTO_MS = 3200;           // how long an Alt+W whirlpool runs

  // gesture tracking
  let lx = null, ly = null, lastHeading = null, lastMoveT = 0;
  let turn = 0;                       // signed radians stirred, leaking over time
  let cx = 0, cy = 0, radius = 0;     // smoothed centre and radius of the stirring
  let mx = innerWidth / 2, my = innerHeight / 2;

  // open whirlpool
  let pool = null;  // { x, y, dir, t0, extra, rate, slowSince, auto, phase, speed }
  let raf = 0, funnel = null, streaks = null, spinAnim = null, coolUntil = 0, lastToast = 0;

  function onMove(e) {
    mx = e.clientX; my = e.clientY;
    const now = performance.now();
    if (lx === null || now - lastMoveT > PAUSE_RESET_MS) {
      lx = mx; ly = my; lastHeading = null; lastMoveT = now; turn = 0; cx = mx; cy = my; radius = 0;
      return;
    }
    const dx = mx - lx, dy = my - ly, d = Math.hypot(dx, dy);
    if (d < 6) return;
    const dt = Math.max(1, now - lastMoveT);
    const heading = Math.atan2(dy, dx);
    let da = 0;
    if (lastHeading !== null) {
      da = heading - lastHeading;
      if (da > Math.PI) da -= TAU; else if (da < -Math.PI) da += TAU;
    }
    lastHeading = heading; lx = mx; ly = my; lastMoveT = now;

    cx += (mx - cx) * 0.06; cy += (my - cy) * 0.06;
    radius += (Math.hypot(mx - cx, my - cy) - radius) * 0.08;

    if (pool) {
      // Already open: every lap in the same direction spins it up.
      if (pool.auto) return;
      const along = da * pool.dir;
      pool.extra = Math.max(0, pool.extra + along);
      pool.rate += ((along / TAU) / (dt / 1000) - pool.rate) * 0.18;
      return;
    }

    // Signed turning: circling adds up, zig-zags cancel, dawdling leaks away.
    turn += da;
    const leak = LEAK_LAPS_PER_SEC * TAU * (dt / 1000);
    turn = Math.abs(turn) <= leak ? 0 : turn - Math.sign(turn) * leak;

    const laps = Math.abs(turn) / TAU;
    if (laps > 1.5 && radius > MIN_RADIUS) {
      // The water starts to turn before it opens, so you can feel it building.
      const k = Math.min(1, laps / LAPS_TO_OPEN);
      L.water.splash(cx, cy, 26 + k * 34, -0.3 * k);
    }
    if (laps >= LAPS_TO_OPEN && radius > MIN_RADIUS && now > coolUntil) open(cx, cy, Math.sign(turn), false);
  }

  function onKey(e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyW') {
      e.preventDefault(); e.stopImmediatePropagation();
      open(mx, my, 1, true);
    }
  }

  // The look: no colour of its own. A soft shadow where the surface dips into the
  // funnel, and faint white foam streaks carried round it. The refraction and
  // highlights from the real water do the rest.
  function makeVisual(x, y, dir) {
    const { el } = L.util;
    const size = 760;
    funnel = el('div', {
      position: 'absolute', left: x - size / 2 + 'px', top: y - size / 2 + 'px',
      width: size + 'px', height: size + 'px', pointerEvents: 'none', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(6,18,30,.62) 0, rgba(6,18,30,.4) 3.5%, rgba(6,18,30,.2) 9%, ' +
        'rgba(6,18,30,.08) 18%, rgba(6,18,30,0) 34%)'
    });
    const streak = 'rgba(255,255,255,0) 0deg, rgba(255,255,255,.2) 30deg, rgba(255,255,255,0) 42deg';
    streaks = el('div', {
      position: 'absolute', inset: '0', borderRadius: '50%',
      background: `repeating-conic-gradient(from 0deg, ${streak}, rgba(255,255,255,0) 90deg)`,
      maskImage: 'radial-gradient(circle, transparent 5%, #000 13%, rgba(0,0,0,.5) 30%, transparent 48%)',
      webkitMaskImage: 'radial-gradient(circle, transparent 5%, #000 13%, rgba(0,0,0,.5) 30%, transparent 48%)',
      filter: 'blur(5px)'
    });
    funnel.appendChild(streaks);
    spinAnim = streaks.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${dir * 360}deg)` }],
      { duration: 1500, iterations: Infinity });
    funnel.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 900, easing: 'ease-out' });
    L.util.layer().appendChild(funnel);
  }

  function open(x, y, dir, auto) {
    if (pool || L.stage < 1) return;
    const now = performance.now();
    pool = { x, y, dir, t0: now, extra: 0, rate: auto ? 0 : 2, slowSince: 0, auto, phase: 'spin', speed: 1 };
    turn = 0;
    L.bodies.pickup(null, 160);
    L.bodies.startVortex(x, y, dir);
    makeVisual(x, y, dir);
    raf = requestAnimationFrame(churn);
  }

  let angle = 0;
  function churn(now) {
    if (!pool) return;
    const p = pool, age = now - p.t0;

    if (p.phase === 'spin') {
      if (p.auto) {
        p.extra += 0.09 * TAU / 6; // spins itself up gently
        if (age > AUTO_MS) beginGulp(now);
      } else {
        // No mouse events means the hand has stopped: let the measured rate die away.
        if (now - lastMoveT > 120) p.rate *= 0.86;
        if (p.rate < ALIVE_RATE) { if (!p.slowSince) p.slowSince = now; } else p.slowSince = 0;
        if (age > MIN_OPEN_MS && p.slowSince && now - p.slowSince > STOP_MS) beginGulp(now);
      }
      const target = Math.min(MAX_SPEED, 1 + (p.extra / TAU) * SPEED_PER_LAP);
      p.speed += (target - p.speed) * 0.08;
    } else if (now - p.gulpAt > GULP_MS) {
      return spit();
    }

    L.bodies.setVortexSpeed(p.speed);
    if (spinAnim) spinAnim.playbackRate = 0.6 + p.speed * 0.55;

    // Stir the real water: a deep dimple in the middle and spiral arms sweeping
    // round it. Faster spin reaches further out.
    angle += p.dir * (0.05 + p.speed * 0.035);
    const reach = Math.min(7, 3 + Math.floor(p.speed));
    L.water.splash(p.x, p.y, 40, -0.9 - p.speed * 0.08);
    for (let arm = 0; arm < 3; arm++) {
      for (let k = 1; k <= reach; k++) {
        const r = k * 56, a = angle - p.dir * k * 0.5 + (arm * TAU) / 3;
        L.water.splash(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 20, -0.34 / Math.sqrt(k));
      }
    }
    raf = requestAnimationFrame(churn);
  }

  function beginGulp(now) {
    pool.phase = 'gulp';
    pool.gulpAt = now;
    L.bodies.gulp();
  }

  function spit() {
    const p = pool;
    pool = null;
    cancelAnimationFrame(raf);
    L.bodies.spit();
    L.water.splash(p.x, p.y, 100 + p.speed * 12, 6 + p.speed);
    if (funnel) {
      const f = funnel; funnel = streaks = spinAnim = null;
      f.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }],
        { duration: 500, easing: 'ease-out', fill: 'forwards' }).onfinish = () => f.remove();
    }
    const now = performance.now();
    coolUntil = now + 1500;
    turn = 0;
    if (now - lastToast > 25000) {
      lastToast = now;
      const laps = Math.round(LAPS_TO_OPEN + p.extra / TAU);
      L.util.toast('Introducing Whirlpool', p.auto
        ? 'Stir to reorganise your content. All of it.'
        : `You stirred ${laps} laps. Your content has been reorganised.`);
    }
  }

  L.whirlpool = {
    open: (x = mx, y = my, dir = 1) => open(x, y, dir, true),
    get active() { return !!pool; },
    get speed() { return pool ? pool.speed : 0; }
  };

  L.gag({
    id: 'whirlpool',
    min: 1,
    start() {
      window.addEventListener('pointermove', onMove, { capture: true, passive: true });
      window.addEventListener('keydown', onKey, true);
    },
    stop() {
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('keydown', onKey, true);
      cancelAnimationFrame(raf);
      funnel?.remove(); funnel = streaks = spinAnim = null;
      pool = null; turn = 0; lx = ly = lastHeading = null;
    }
  });
})();
