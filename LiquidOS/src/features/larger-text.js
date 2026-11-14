// Larger Text (Accessibility). Scales every piece of text on the page to 600%
// of its original size and makes it bold. Boxes and layouts stay the size they
// were, so everything overflows. For good measure the whole page is also zoomed
// to 140%, so there is even less room for it. A headline becomes roughly one
// word per screen. Originally the Accessibility Mode extension.
//
// Each element's font-size becomes calc(original * var(--lq-text-scale)), so the
// scale can change by setting one variable.
(() => {
  const L = window.Liquid;
  const SCALE = 6;         // text size multiplier
  const PAGE_ZOOM = 1.4;   // on top of that, zoom everything
  let prevZoom = '';
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK', 'TITLE', 'CANVAS', 'IMG',
    'VIDEO', 'AUDIO', 'BR', 'HR', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'PICTURE', 'SOURCE', 'SVG']);
  const FORM = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);
  const root = document.documentElement;
  const saved = new WeakMap(); // element -> its own inline font-size / line-height before we touched it
  const pending = new Map();
  let observer = null, timer = 0, on = false;

  function hasOwnText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }

  const wanted = (el) => el instanceof HTMLElement && !SKIP.has(el.tagName) && !el.hasAttribute('data-lq-text') &&
    !L.util.isOurs(el) && (FORM.has(el.tagName) || hasOwnText(el));

  function gather(el, deep, out) {
    if (wanted(el)) out.add(el);
    if (deep && el.querySelectorAll) for (const d of el.querySelectorAll('*')) if (wanted(d)) out.add(d);
  }

  function mark(els) {
    if (!els.size) return;
    root.style.setProperty('--lq-text-scale', '1'); // read the page's true sizes
    const info = [];
    for (const el of els) { const cs = getComputedStyle(el); info.push([el, cs.fontSize, cs.lineHeight]); }
    root.style.setProperty('--lq-text-scale', String(SCALE));
    for (const [el, fs, lh] of info) {
      if (!parseFloat(fs)) continue;
      saved.set(el, {
        fs: el.style.getPropertyValue('font-size'), fsp: el.style.getPropertyPriority('font-size'),
        fw: el.style.getPropertyValue('font-weight'), fwp: el.style.getPropertyPriority('font-weight'),
        lh: el.style.getPropertyValue('line-height'), lhp: el.style.getPropertyPriority('line-height')
      });
      el.style.setProperty('font-size', `calc(${fs} * var(--lq-text-scale, 1))`, 'important');
      el.style.setProperty('font-weight', '800', 'important');
      if (lh.endsWith('px')) el.style.setProperty('line-height', `calc(${lh} * var(--lq-text-scale, 1))`, 'important');
      el.setAttribute('data-lq-text', '');
    }
  }

  function unmarkAll() {
    for (const el of document.querySelectorAll('[data-lq-text]')) {
      const o = saved.get(el);
      el.style.removeProperty('font-size');
      el.style.removeProperty('line-height');
      el.style.removeProperty('font-weight');
      if (o) {
        if (o.fw) el.style.setProperty('font-weight', o.fw, o.fwp);
        if (o.fs) el.style.setProperty('font-size', o.fs, o.fsp);
        if (o.lh) el.style.setProperty('line-height', o.lh, o.lhp);
      }
      el.removeAttribute('data-lq-text');
    }
    root.style.removeProperty('--lq-text-scale');
  }

  // text that appears later (infinite scroll, menus, single-page apps)
  function flush() {
    timer = 0;
    if (!on) { pending.clear(); return; }
    const out = new Set();
    for (const [el, deep] of pending) if (el.isConnected) gather(el, deep, out);
    pending.clear();
    mark(out);
  }

  L.os.feature({
    id: 'a11y',
    isOn: (s) => !!s.a11y,
    start() {
      on = true;
      // Zoom the page body, not <html>: our own overlays hang off <html> and must stay 1:1.
      if (document.body) { prevZoom = document.body.style.zoom; document.body.style.zoom = String(PAGE_ZOOM); }
      const out = new Set();
      gather(root, true, out);
      mark(out);
      observer = new MutationObserver((muts) => {
        for (const m of muts) {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === 1) pending.set(n, true);
            else if (n.nodeType === 3 && n.parentElement && !pending.has(n.parentElement)) pending.set(n.parentElement, false);
          });
        }
        if (pending.size && !timer) timer = setTimeout(flush, 200);
      });
      observer.observe(root, { childList: true, subtree: true });
    },
    stop() {
      on = false;
      observer?.disconnect(); observer = null;
      clearTimeout(timer); timer = 0; pending.clear();
      unmarkAll();
      if (document.body) document.body.style.zoom = prevZoom;
    }
  });
})();
