(() => {
  const DEFAULTS = {
    enabled: true, scale: 250, bold: false, spacing: false, theme: 'off',
    links: false, still: false, bigCursor: false, disabledHosts: []
  };
  const root = document.documentElement;
  // use the top page's host so per-site switches also cover embedded frames
  let HOST = location.hostname;
  try {
    const o = location.ancestorOrigins;
    if (o && o.length) HOST = new URL(o[o.length - 1]).hostname;
  } catch {}

  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK', 'TITLE', 'CANVAS', 'IMG',
    'VIDEO', 'AUDIO', 'BR', 'HR', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'PICTURE', 'SOURCE']);
  const FORM = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);
  const THEMES = { wb: 'am-t-wb', yb: 'am-t-yb', bk: 'am-t-bk' };
  const saved = new WeakMap();   // element -> its own inline font-size / line-height before we touched it
  let s = { ...DEFAULTS };
  let scanned = false;

  const active = () => s.enabled && !s.disabledHosts.includes(HOST);

  function hasOwnText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }

  function wanted(el) {
    return el instanceof HTMLElement && !SKIP.has(el.tagName) && !el.hasAttribute('data-am') &&
      (FORM.has(el.tagName) || hasOwnText(el));
  }

  function gather(el, deep, out) {
    if (wanted(el)) out.add(el);
    if (deep && el.querySelectorAll) for (const d of el.querySelectorAll('*')) if (wanted(d)) out.add(d);
  }

  // Text is scaled with  calc(original * var(--am-scale))  so the slider only changes one variable.
  function mark(els) {
    if (!els.size) return;
    const prev = root.style.getPropertyValue('--am-scale');
    root.style.setProperty('--am-scale', '1');          // read the page's true sizes
    const info = [];
    for (const el of els) {
      const cs = getComputedStyle(el);
      info.push([el, cs.fontSize, cs.lineHeight]);
    }
    root.style.setProperty('--am-scale', prev || String(s.scale / 100));
    for (const [el, fs, lh] of info) {
      if (!parseFloat(fs)) continue;
      saved.set(el, {
        fs: el.style.getPropertyValue('font-size'), fsp: el.style.getPropertyPriority('font-size'),
        lh: el.style.getPropertyValue('line-height'), lhp: el.style.getPropertyPriority('line-height')
      });
      el.style.setProperty('font-size', `calc(${fs} * var(--am-scale, 1))`, 'important');
      if (lh.endsWith('px')) el.style.setProperty('line-height', `calc(${lh} * var(--am-scale, 1))`, 'important');
      el.setAttribute('data-am', '');
    }
  }

  function unmarkAll() {
    for (const el of document.querySelectorAll('[data-am]')) {
      const o = saved.get(el);
      el.style.removeProperty('font-size');
      el.style.removeProperty('line-height');
      if (o) {
        if (o.fs) el.style.setProperty('font-size', o.fs, o.fsp);
        if (o.lh) el.style.setProperty('line-height', o.lh, o.lhp);
      }
      el.removeAttribute('data-am');
    }
    scanned = false;
  }

  function whenBody(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  function apply() {
    const on = active();
    root.classList.toggle('am-on', on);
    for (const c of Object.values(THEMES)) root.classList.remove(c);
    if (!on) {
      unmarkAll();
      root.style.removeProperty('--am-scale');
      for (const c of ['am-bold', 'am-space', 'am-links', 'am-still', 'am-cursor']) root.classList.remove(c);
      return;
    }
    root.style.setProperty('--am-scale', String(s.scale / 100));
    root.classList.toggle('am-bold', s.bold);
    root.classList.toggle('am-space', s.spacing);
    root.classList.toggle('am-links', s.links);
    root.classList.toggle('am-still', s.still);
    root.classList.toggle('am-cursor', s.bigCursor);
    if (THEMES[s.theme]) root.classList.add(THEMES[s.theme]);
    if (!scanned) {
      scanned = true;
      whenBody(() => { const out = new Set(); gather(root, true, out); mark(out); });
    }
  }

  // text that appears later (infinite scroll, menus, single-page apps)
  const pending = new Map();
  let timer = 0;
  function flush() {
    timer = 0;
    if (!active()) { pending.clear(); return; }
    const out = new Set();
    for (const [el, deep] of pending) if (el.isConnected) gather(el, deep, out);
    pending.clear();
    mark(out);
  }
  new MutationObserver((muts) => {
    if (!active() || !scanned) return;
    for (const m of muts) {
      if (m.type === 'characterData') {
        const p = m.target.parentElement;
        if (p && !pending.has(p)) pending.set(p, false);
      } else {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) pending.set(n, true);
          else if (n.nodeType === 3 && n.parentElement && !pending.has(n.parentElement)) pending.set(n.parentElement, false);
        });
      }
    }
    if (pending.size && !timer) timer = setTimeout(flush, 150);
  }).observe(root, { childList: true, subtree: true, characterData: true });

  chrome.storage.sync.get(DEFAULTS, (v) => { s = { ...DEFAULTS, ...v }; apply(); });
  chrome.storage.onChanged.addListener((ch) => {
    for (const k in ch) s[k] = ch[k].newValue;
    apply();
  });
})();
