// Liquid OS core: the Liquid Life stage system, presenter hotkeys, panic button and shared helpers.
//
// Stages escalate on the presenter's cue (Alt+0..5, Alt+. next, Alt+, back):
//   0 Dry · 1 Calm · 2 Wake · 3 High Seas · 4 Buoyancy · 5 Chaos
// A gag registers with the lowest stage it runs at:
//   Liquid.gag({ id, min: 2, start(L) {}, stop(L) {}, onStage(stage, L) {} })
// The stage is stored in chrome.storage, so it follows you across tabs and page loads.
//
// Styling is done with inline styles and the Web Animations API only (no <style>
// tags, no innerHTML), so strict-CSP sites can't block it.
(() => {
  const L = (window.Liquid = window.Liquid || {});
  if (L.core) return;
  L.core = true;

  const KEY = 'liquidLifeStage';
  const DEFAULT_STAGE = 1;
  const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif';

  const STAGES = [
    { name: 'Dry', title: 'Liquid drained', body: 'Boring mode restored. Coward.', power: 0 },
    { name: 'Calm', title: 'Liquid Life', body: 'The web, finally wet.', power: 40 },
    { name: 'Wake', title: 'Introducing Wake', body: 'Scrolling and typing now make a splash. Every time.', power: 52 },
    { name: 'High Seas', title: 'Introducing High Seas', body: 'Your browser now supports shipping. And piracy. And worse.', power: 36 },
    { name: 'Buoyancy', title: 'Introducing Buoyancy', body: 'Content now floats by importance. Ads rise. Articles sink.', power: 66 },
    { name: 'Chaos', title: 'Liquid Life Pro Max', body: 'Our most liquid web ever. 0% solids.', power: 115 }
  ];

  const gags = [];
  const running = new Set();
  let stage = 0;
  let layerEl = null;

  // ---------- helpers ----------
  const util = {
    FONT,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

    // Everything we create is tagged data-lq so gags can ignore our own elements.
    el(tag, style = {}, text) {
      const n = document.createElement(tag);
      n.setAttribute('data-lq', '');
      Object.assign(n.style, style);
      if (text != null) n.textContent = text;
      return n;
    },

    isOurs: (node) => {
      const e = node && (node.nodeType === 1 ? node : node.parentElement);
      return !!(e && e.closest && e.closest('[data-lq]'));
    },

    // Full-viewport overlay above the water for toasts, tide and flotsam.
    layer() {
      if (!layerEl || !layerEl.isConnected) {
        layerEl = util.el('div', {
          position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '2147483646',
          overflow: 'hidden', margin: '0', padding: '0'
        });
        document.documentElement.appendChild(layerEl);
      }
      return layerEl;
    },

    glass: {
      background: 'linear-gradient(135deg, rgba(255,255,255,.62), rgba(255,255,255,.28))',
      backdropFilter: 'blur(18px) saturate(190%)',
      border: '1px solid rgba(255,255,255,.7)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.95), 0 12px 40px rgba(0,0,0,.25)',
      color: '#1d1d1f',
      boxSizing: 'border-box'
    },

    // A Liquid OS alert. These are meant to be impossible to miss: a solid card with
    // a coloured header and a pulsing glow, landing somewhere around the edge of
    // the page at a slight angle, wobbling every few seconds until it is dealt
    // with. It never goes away by itself; the user has to close it.
    toast(title, body) {
      const layer = util.layer();
      const open = layer.querySelectorAll('[data-lq-toast]');
      if (open.length >= MAX_ALERTS) open[0].remove(); // the screen is full: the oldest makes room

      const accent = ACCENTS[alertCount++ % ACCENTS.length];
      const W = Math.min(340, innerWidth - 24), H = 150;
      const [x, y] = alertSpot(layer, W, H);
      const tilt = util.rand(-2.6, 2.6);

      const holder = util.el('div', {
        position: 'absolute', left: x + 'px', top: y + 'px', width: W + 'px', zIndex: '90', pointerEvents: 'auto'
      });
      holder.setAttribute('data-lq-toast', '');
      const card = util.el('div', {
        background: '#fff', color: '#1d1d1f', borderRadius: '18px', overflow: 'hidden', boxSizing: 'border-box',
        font: `500 14px/1.4 ${FONT}`, textAlign: 'left', letterSpacing: 'normal', transform: `rotate(${tilt}deg)`,
        boxShadow: `0 0 0 3px ${accent}, 0 0 0 9px ${accent}33, 0 22px 55px rgba(0,0,0,.42)`
      });

      const head = util.el('div', {
        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px 8px 12px',
        background: accent, color: '#fff', font: `800 11px ${FONT}`, letterSpacing: '.09em', textTransform: 'uppercase'
      });
      const bang = util.el('span', {
        width: '18px', height: '18px', borderRadius: '50%', background: '#fff', color: accent, flex: 'none',
        display: 'grid', placeItems: 'center', font: `900 13px ${FONT}`, letterSpacing: '0'
      }, '!');
      const closeX = util.el('button', {
        all: 'unset', cursor: 'pointer', marginLeft: 'auto', width: '22px', height: '22px', borderRadius: '50%',
        background: 'rgba(255,255,255,.28)', display: 'grid', placeItems: 'center', font: `700 13px ${FONT}`, color: '#fff'
      }, '✕');
      closeX.setAttribute('aria-label', 'Close');
      head.append(bang, util.el('span', {}, 'Liquid OS'), util.el('span', { opacity: '.75', fontWeight: '600' }, '· now'), closeX);

      const main = util.el('div', { padding: '12px 14px 13px' });
      const ok = util.el('button', {
        all: 'unset', cursor: 'pointer', marginTop: '11px', padding: '7px 18px', borderRadius: '999px',
        background: accent, color: '#fff', font: `700 13px ${FONT}`, boxSizing: 'border-box'
      }, 'OK');
      main.append(
        util.el('div', { font: `800 17px/1.2 ${FONT}`, letterSpacing: '-.01em' }, title),
        util.el('div', { marginTop: '4px', fontSize: '14px', color: 'rgba(29,29,31,.82)' }, body || ''),
        ok);
      card.append(head, main);
      holder.appendChild(card);
      layer.appendChild(holder);

      const base = `rotate(${tilt}deg)`;
      card.animate([{ transform: `${base} scale(.2)`, opacity: 0 }, { transform: `${base} scale(1.08)`, opacity: 1, offset: 0.7 }, { transform: `${base} scale(1)` }],
        { duration: 480, easing: 'cubic-bezier(.2,1.3,.4,1)' });
      // glow that never stops, and a wobble every few seconds
      card.animate([
        { boxShadow: `0 0 0 3px ${accent}, 0 0 0 9px ${accent}33, 0 22px 55px rgba(0,0,0,.42)` },
        { boxShadow: `0 0 0 3px ${accent}, 0 0 0 18px ${accent}00, 0 22px 55px rgba(0,0,0,.42)` }
      ], { duration: 1100, iterations: Infinity });
      card.animate([
        { transform: base, offset: 0 }, { transform: base, offset: 0.82 },
        { transform: `rotate(${tilt - 4}deg) scale(1.04)`, offset: 0.87 }, { transform: `rotate(${tilt + 4}deg) scale(1.04)`, offset: 0.92 },
        { transform: `rotate(${tilt - 2}deg)`, offset: 0.96 }, { transform: base, offset: 1 }
      ], { duration: 3400, iterations: Infinity, delay: 600 + Math.random() * 1500 });

      const close = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        holder.style.pointerEvents = 'none';
        holder.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.6)', opacity: 0 }],
          { duration: 180, easing: 'ease-in', fill: 'forwards' }).onfinish = () => holder.remove();
      };
      closeX.addEventListener('click', close);
      ok.addEventListener('click', close);
      holder.addEventListener('click', (e) => e.stopPropagation());

      if (L.water && stage > 0) L.water.splash(x + W / 2, y + 60, 80, -2.4);
      return holder;
    },

    clearToasts() {
      if (layerEl) for (const t of layerEl.querySelectorAll('[data-lq-toast]')) t.remove();
    }
  };

  // Alerts land anywhere on the page, edges and middle, in whichever spot is least crowded.
  const MAX_ALERTS = 10;
  const ACCENTS = ['#ff3b30', '#ff9500', '#0a84ff', '#af52de', '#ff2d55', '#34c759'];
  // fractions of the free space: the edges, and the middle of the page too
  const SPOTS = [[0.02, 0.03], [0.5, 0.02], [0.98, 0.03], [0.99, 0.4], [0.98, 0.94], [0.5, 0.97], [0.02, 0.95], [0.01, 0.45], [0.27, 0.05], [0.74, 0.95],
    [0.5, 0.5], [0.3, 0.36], [0.7, 0.58], [0.46, 0.26], [0.36, 0.72], [0.68, 0.3]];
  let alertCount = 0;
  function alertSpot(layer, W, H) {
    const vw = innerWidth, vh = innerHeight;
    const taken = Array.from(layer.querySelectorAll('[data-lq-toast]')).map((t) => t.getBoundingClientRect());
    let best = null, bestScore = -1;
    for (const [fx, fy] of SPOTS) {
      const x = util.clamp(fx * (vw - W) + util.rand(-30, 30), 20, Math.max(20, vw - W - 20));
      const y = util.clamp(fy * (vh - H) + util.rand(-24, 24), 16, Math.max(16, vh - H - 16));
      // score: distance to the nearest alert already on screen, plus a little luck
      let near = 1e9;
      for (const r of taken) near = Math.min(near, Math.hypot(r.left - x, r.top - y));
      const score = Math.min(near, 600) + Math.random() * 160;
      if (score > bestScore) { bestScore = score; best = [x, y]; }
    }
    return best;
  }

  // ---------- storage (falls back to memory when not running as an extension) ----------
  const store = (() => {
    try { return chrome.storage.local; } catch (e) { return null; }
  })();

  function apply(next, announce) {
    next = util.clamp(Math.round(Number(next)) || 0, 0, STAGES.length - 1);
    const prev = stage;
    stage = next;

    if (stage > 0) { L.water.start(); L.refract.start(); } // both are no-ops if already started
    L.water.power = STAGES[stage].power;

    for (const g of gags) {
      const want = stage >= g.min && stage > 0 && !admin.muted.includes(g.id);
      try {
        if (want && !running.has(g.id)) { g.start(L); running.add(g.id); }
        else if (!want && running.has(g.id)) { g.stop(L); running.delete(g.id); }
        if (want && g.onStage) g.onStage(stage, L);
      } catch (e) { console.warn('[Liquid Life] gag failed:', g.id, e); }
    }

    if (stage === 0) { L.refract.stop(); L.water.stop(); if (prev > 0) util.clearToasts(); }
    if (announce && stage !== prev && !document.hidden) {
      util.toast(STAGES[stage].title, STAGES[stage].body);
      if (stage > 0) L.water.splash(innerWidth / 2, innerHeight / 2, 120, -4 - stage);
    }
  }

  function setStage(n) {
    n = util.clamp(n, 0, STAGES.length - 1);
    if (store) {
      try { store.set({ [KEY]: n }); return; } // onChanged applies it in every tab
      catch (e) { /* extension was reloaded under us; apply locally */ }
    }
    apply(n, true);
  }

  // ---------- admin settings (set from the admin panel) ----------
  //   fightBack: features switch each other on, and switch back on after being turned off
  //   autoChaos: things happen unprompted (level creeps up, monsters and ships arrive, random alerts)
  //   chaosSeconds: how long between automatic updates
  //   muted:     ids of gags to leave out, for showing one thing in isolation
  const ADMIN_KEY = 'liquidOSAdmin';
  const ADMIN_DEFAULTS = { fightBack: true, autoChaos: true, chaosSeconds: 20, muted: [] };
  let admin = { ...ADMIN_DEFAULTS };
  const readAdmin = (v) => ({ ...ADMIN_DEFAULTS, ...(v || {}), muted: Array.isArray(v && v.muted) ? v.muted : [] });

  // Panic: everything off, and nothing is allowed to turn itself back on.
  function panic() {
    const calm = { ...admin, fightBack: false, autoChaos: false };
    const featuresOff = L.os ? { ...L.os.DEFAULTS } : {};
    if (store) {
      try { store.set({ [ADMIN_KEY]: calm, liquidOS: featuresOff, [KEY]: 0 }); return; }
      catch (e) { /* extension was reloaded under us; do it locally */ }
    }
    admin = calm;
    if (L.os) L.os.allOff();
    apply(0, true);
  }

  // ---------- presenter hotkeys + panic ----------
  let escTimes = [];
  function onKey(e) {
    if (e.key === 'Escape') {
      const now = performance.now();
      escTimes = escTimes.filter((t) => now - t < 1200).concat(now);
      if (escTimes.length >= 3) { escTimes = []; panic(); }
      return;
    }
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    let n = null;
    const m = /^(?:Digit|Numpad)([0-5])$/.exec(e.code);
    if (m) n = Number(m[1]);
    else if (e.code === 'Period') n = stage + 1;
    else if (e.code === 'Comma') n = stage - 1;
    if (n === null) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    setStage(n);
  }

  L.util = util;
  L.STAGES = STAGES;
  L.CHAOS = STAGES.length - 1;
  L.gag = (g) => { gags.push(g); };
  L.setStage = setStage;
  L.panic = panic;
  Object.defineProperty(L, 'stage', { get: () => stage });
  Object.defineProperty(L, 'admin', { get: () => admin });
  // for testing outside the extension, where there is no storage to change
  L.setAdmin = (patch) => { admin = readAdmin({ ...admin, ...patch }); apply(stage, false); };

  L.boot = async () => {
    window.addEventListener('keydown', onKey, true);
    let saved = DEFAULT_STAGE;
    if (store) {
      try {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area !== 'local') return;
          if (changes[ADMIN_KEY]) { admin = readAdmin(changes[ADMIN_KEY].newValue); if (!changes[KEY]) apply(stage, false); }
          if (changes[KEY]) apply(changes[KEY].newValue, true);
        });
        const got = await store.get([KEY, ADMIN_KEY]);
        if (typeof got[KEY] === 'number') saved = got[KEY];
        admin = readAdmin(got[ADMIN_KEY]);
      } catch (e) { /* not an extension context */ }
    }
    apply(saved, false);
    if (L.os) L.os.boot();
  };
})();
