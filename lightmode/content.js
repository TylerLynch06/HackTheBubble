(() => {
  if (window.top !== window) return;

  const DEFAULTS = {
    enabled: true, mode: 'dark', radius: 150, softness: 55, darkness: 100,
    intensity: 85, warm: true, hideCursor: false, disabledHosts: []
  };
  const HOST = location.hostname;
  const root = document.documentElement;
  let s = { ...DEFAULTS };
  let overlay = null, cursorStyle = null;
  let x = innerWidth / 2, y = innerHeight / 2, raf = 0;

  function ensure() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText =
        'position:fixed;left:0;top:0;width:100vw;height:100vh;margin:0;padding:0;border:0;' +
        'z-index:2147483647;pointer-events:none;opacity:0;transition:opacity .6s ease;';
    }
    if (!overlay.isConnected) {
      root.appendChild(overlay);
      requestAnimationFrame(() => requestAnimationFrame(() => overlay && (overlay.style.opacity = '1')));
    }
    return overlay;
  }

  function active() { return s.enabled && !s.disabledHosts.includes(HOST); }

  function position() {
    raf = 0;
    if (!overlay) return;
    overlay.style.setProperty('--fl-x', x + 'px');
    overlay.style.setProperty('--fl-y', y + 'px');
  }

  function apply() {
    if (!active()) {
      overlay && overlay.remove();
      overlay = null;
      cursorStyle && cursorStyle.remove();
      cursorStyle = null;
      return;
    }
    const o = ensure();
    const r = s.radius;
    o.style.setProperty('--fl-r', r + 'px');

    if (s.mode === 'bright') {
      const k = s.intensity / 100;
      o.style.setProperty('--fl-r3', Math.round(r * (1 + s.softness / 25)) + 'px');
      o.style.setProperty('--fl-glow', (0.55 + 0.45 * k).toFixed(2));
      o.style.setProperty('--fl-base', (0.12 + 0.78 * k).toFixed(2));
      o.style.background =
        'radial-gradient(circle at var(--fl-x) var(--fl-y), #fff 0, ' +
        'rgba(255,250,232,var(--fl-glow)) var(--fl-r), rgba(255,255,255,var(--fl-base)) var(--fl-r3))';
      const f = `brightness(${(1 + k * 5).toFixed(2)}) contrast(${(1 - k * 0.4).toFixed(2)}) saturate(1.2)`;
      o.style.backdropFilter = f;
      o.style.webkitBackdropFilter = f;
    } else {
      o.style.setProperty('--fl-in', Math.round(r * (1 - s.softness / 100)) + 'px');
      o.style.setProperty('--fl-dark', String(s.darkness / 100));
      o.style.setProperty('--fl-tint', s.warm ? 'rgba(255, 214, 140, 0.10)' : 'transparent');
      o.style.background =
        'radial-gradient(circle at var(--fl-x) var(--fl-y), var(--fl-tint) 0, ' +
        'transparent var(--fl-in), rgba(0,0,0,var(--fl-dark)) var(--fl-r))';
      o.style.backdropFilter = 'none';
      o.style.webkitBackdropFilter = 'none';
    }
    position();

    if (s.hideCursor) {
      if (!cursorStyle) {
        cursorStyle = document.createElement('style');
        cursorStyle.textContent = 'html, html * { cursor: none !important; }';
      }
      if (!cursorStyle.isConnected) root.appendChild(cursorStyle);
    } else if (cursorStyle) {
      cursorStyle.remove();
    }
  }

  addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    if (!raf && overlay) raf = requestAnimationFrame(position);
  }, { capture: true, passive: true });

  new MutationObserver(() => { if (active() && overlay && !overlay.isConnected) root.appendChild(overlay); })
    .observe(root, { childList: true });

  chrome.storage.sync.get(DEFAULTS, (v) => { s = { ...DEFAULTS, ...v }; apply(); });
  chrome.storage.onChanged.addListener((ch) => {
    for (const k in ch) s[k] = ch[k].newValue;
    apply();
  });
})();
