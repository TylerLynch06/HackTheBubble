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

    // Apple-style glass notification, dropping in from the top.
    toast(title, body, ms = 4200) {
      const t = util.el('div', {
        ...util.glass, position: 'absolute', top: '16px', left: '50%',
        width: 'min(400px, 92vw)', padding: '13px 18px', borderRadius: '22px',
        font: `500 14px/1.35 ${FONT}`, textAlign: 'left', letterSpacing: 'normal', zIndex: '90'
      });
      t.append(
        util.el('div', { fontWeight: '700', fontSize: '14px' }, title),
        util.el('div', { opacity: '.8', marginTop: '2px' }, body || '')
      );
      // Stack below any toast already showing.
      const others = util.layer().querySelectorAll('[data-lq-toast]').length;
      t.setAttribute('data-lq-toast', '');
      t.style.top = 16 + others * 76 + 'px';
      util.layer().appendChild(t);
      const off = 'translate(-50%, -160%) scale(.9)', on = 'translate(-50%, 0) scale(1)';
      t.style.transform = on;
      t.animate([{ transform: off, opacity: 0 }, { transform: on, opacity: 1 }],
        { duration: 550, easing: 'cubic-bezier(.2,1.6,.4,1)' });
      setTimeout(() => {
        const a = t.animate([{ transform: on, opacity: 1 }, { transform: off, opacity: 0 }],
          { duration: 400, easing: 'ease-in', fill: 'forwards' });
        a.onfinish = () => t.remove();
      }, ms);
      if (L.water && stage > 0) L.water.splash(innerWidth / 2, 50, 70, -2);
      return t;
    }
  };

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
      const want = stage >= g.min && stage > 0;
      try {
        if (want && !running.has(g.id)) { g.start(L); running.add(g.id); }
        else if (!want && running.has(g.id)) { g.stop(L); running.delete(g.id); }
        if (want && g.onStage) g.onStage(stage, L);
      } catch (e) { console.warn('[Liquid Life] gag failed:', g.id, e); }
    }

    if (stage === 0) { L.refract.stop(); L.water.stop(); }
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

  // ---------- presenter hotkeys + panic ----------
  let escTimes = [];
  function onKey(e) {
    if (e.key === 'Escape') {
      const now = performance.now();
      escTimes = escTimes.filter((t) => now - t < 1200).concat(now);
      if (escTimes.length >= 3) { escTimes = []; if (L.os) L.os.allOff(); if (stage > 0) setStage(0); }
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
  Object.defineProperty(L, 'stage', { get: () => stage });

  L.boot = async () => {
    window.addEventListener('keydown', onKey, true);
    let saved = DEFAULT_STAGE;
    if (store) {
      try {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes[KEY]) apply(changes[KEY].newValue, true);
        });
        const got = await store.get(KEY);
        if (typeof got[KEY] === 'number') saved = got[KEY];
      } catch (e) { /* not an extension context */ }
    }
    apply(saved, false);
    if (L.os) L.os.boot();
  };
})();
