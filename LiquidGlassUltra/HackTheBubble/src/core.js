// Liquid core: effect registry, settings, panic button and shared helpers.
// Every effect file calls Liquid.register({...}). boot.js starts everything.
(() => {
  if (window.Liquid) return;

  const STORAGE_KEY = 'liquid';
  const META = self.LIQUID_EFFECTS || [];
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const impls = new Map();   // id -> effect object
  const running = new Set(); // ids currently started
  const state = { enabled: true, intensity: 0.6, effects: {} };

  // ---------- helpers (no innerHTML anywhere: some sites enforce Trusted Types) ----------
  const util = {
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

    // Create an element. Everything we create gets data-lq so effects can ignore it.
    el(tag, { style = {}, text, cls, attrs = {} } = {}, ...children) {
      const n = document.createElement(tag);
      n.setAttribute('data-lq', '');
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      Object.assign(n.style, style);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      children.forEach((c) => c && n.appendChild(c));
      return n;
    },

    svg(tag, attrs = {}, ...children) {
      const n = document.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      children.forEach((c) => c && n.appendChild(c));
      return n;
    },

    addStyle(id, css) {
      let s = document.getElementById(id);
      if (!s) {
        s = document.createElement('style');
        s.id = id;
        s.setAttribute('data-lq', '');
        document.documentElement.appendChild(s);
      }
      s.textContent = css;
      return s;
    },

    // Fixed full-screen overlay, attached to <html> (not <body>, which Syrup Scroll transforms).
    layer() {
      let l = document.getElementById('lq-layer');
      if (!l) {
        l = util.el('div', { attrs: { id: 'lq-layer' } });
        document.documentElement.appendChild(l);
      }
      return l;
    },

    isOurs: (node) => !!(node && node.nodeType === 1 ? node.closest('[data-lq]') : node?.parentElement?.closest('[data-lq]')),

    // iOS-style glass notification.
    toast(title, body, ms = 4500) {
      const t = util.el('div', { cls: 'lq-toast lq-glass' },
        util.el('div', { cls: 'lq-toast-title', text: title }),
        body ? util.el('div', { cls: 'lq-toast-body', text: body }) : null);
      util.layer().appendChild(t);
      requestAnimationFrame(() => t.classList.add('lq-in'));
      setTimeout(() => { t.classList.remove('lq-in'); setTimeout(() => t.remove(), 600); }, ms);
      return t;
    }
  };

  const BASE_CSS = `
    #lq-layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; overflow: hidden; }
    #lq-layer * { box-sizing: border-box; }
    .lq-glass {
      background: linear-gradient(135deg, rgba(255,255,255,.45), rgba(255,255,255,.12));
      -webkit-backdrop-filter: blur(18px) saturate(190%); backdrop-filter: blur(18px) saturate(190%);
      border: 1px solid rgba(255,255,255,.6);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.95), inset 0 -10px 20px rgba(255,255,255,.18), 0 12px 40px rgba(0,0,0,.22);
      color: #1d1d1f;
      font: 500 14px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
    }
    .lq-toast {
      position: absolute; top: 14px; left: 50%; width: min(380px, 92vw);
      padding: 12px 16px; border-radius: 22px;
      transform: translate(-50%, -140%) scale(.9); opacity: 0;
      transition: transform .55s cubic-bezier(.2,1.6,.4,1), opacity .4s;
      pointer-events: auto;
    }
    .lq-toast.lq-in { transform: translate(-50%, 0) scale(1); opacity: 1; }
    .lq-toast-title { font-weight: 700; font-size: 13px; letter-spacing: .01em; }
    .lq-toast-body { opacity: .8; margin-top: 2px; }
  `;

  // ---------- registry ----------
  const isOn = (id) => {
    if (id in state.effects) return !!state.effects[id];
    const m = META.find((e) => e.id === id);
    return m ? m.defaultOn !== false : true;
  };

  function apply() {
    for (const [id, fx] of impls) {
      const want = state.enabled && isOn(id);
      if (want && !running.has(id)) {
        try { fx.start(Liquid); running.add(id); }
        catch (e) { console.warn('[Liquid] start failed:', id, e); }
      } else if (!want && running.has(id)) {
        try { fx.stop(Liquid); } catch (e) { console.warn('[Liquid] stop failed:', id, e); }
        running.delete(id);
      } else if (want && fx.setIntensity) {
        try { fx.setIntensity(state.intensity, Liquid); } catch (e) { /* ignore */ }
      }
    }
    if (!state.enabled) document.getElementById('lq-layer')?.replaceChildren();
  }

  function load(saved) {
    Object.assign(state, { enabled: true, intensity: 0.6, effects: {} }, saved || {});
    apply();
  }

  function save(patch) {
    const next = { ...state, ...patch };
    return chrome.storage.local.set({ [STORAGE_KEY]: next });
  }

  // ---------- panic: press Escape 3 times quickly (Alt+Shift+L also works, via background.js) ----------
  let escTimes = [];
  function onKey(e) {
    if (e.key !== 'Escape') return;
    const now = performance.now();
    escTimes = escTimes.filter((t) => now - t < 1200).concat(now);
    if (escTimes.length >= 3 && state.enabled) {
      escTimes = [];
      state.enabled = false;
      apply();
      save({ enabled: false });
      util.toast('Liquid drained', 'Boring mode restored. Coward.');
    }
  }

  const Liquid = {
    util,
    get intensity() { return state.intensity; },
    get enabled() { return state.enabled; },
    register(fx) {
      if (!fx || !fx.id) throw new Error('[Liquid] effect needs an id');
      impls.set(fx.id, fx);
    },
    setIntensity(v) { return save({ intensity: util.clamp(v, 0, 1) }); },
    async boot() {
      util.addStyle('lq-base', BASE_CSS);
      window.addEventListener('keydown', onKey, true);
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[STORAGE_KEY]) load(changes[STORAGE_KEY].newValue);
      });
      const saved = await chrome.storage.local.get(STORAGE_KEY);
      load(saved[STORAGE_KEY]);
    }
  };

  window.Liquid = Liquid;
})();
