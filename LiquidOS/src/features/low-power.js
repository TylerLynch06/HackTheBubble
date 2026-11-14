// Low Power Mode. Saves energy by rendering the web at about four frames a
// second, in chunky pixels and seven shades per colour. Originally the Power
// Saving Mode extension.
//
// Three parts:
//   1. A pixelate + posterise SVG filter on the whole page.
//   2. Liquid OS's own animation (water, ships, monsters) drops to ~4.5 fps.
//   3. The page's own animation is throttled too. That has to happen in the
//      page's JavaScript world, so main-world/throttle.js does it when it hears
//      the 'liquidos-low-power' event sent from here.
(() => {
  const L = window.Liquid;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const FRAME_MS = 1000 / 4.5;
  const root = document.documentElement;

  const realRAF = window.requestAnimationFrame.bind(window);
  const realCancel = window.cancelAnimationFrame.bind(window);
  let pendingFrames = new Map(), nextId = 1, timer = 0, svg = null, style = null, prevFilter = '';

  function s(tag, attrs, ...kids) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    kids.forEach((c) => n.appendChild(c));
    return n;
  }

  function buildFilter() {
    const steps = '0 0.16 0.33 0.5 0.66 0.83 1';
    const el = s('svg', { width: 0, height: 0, 'data-lq': '' },
      s('filter', { id: 'lq-low-power', x: '0%', y: '0%', width: '100%', height: '100%' },
        // sample one pixel in every 6x6 block, then spread it to fill the block
        s('feFlood', { x: 2, y: 2, width: 2, height: 2 }),
        s('feComposite', { width: 6, height: 6 }),
        s('feTile', { result: 'grid' }),
        s('feComposite', { in: 'SourceGraphic', in2: 'grid', operator: 'in' }),
        s('feMorphology', { operator: 'dilate', radius: 3, result: 'pixels' }),
        // crush the colour depth
        s('feComponentTransfer', { in: 'pixels' },
          s('feFuncR', { type: 'discrete', tableValues: steps }),
          s('feFuncG', { type: 'discrete', tableValues: steps }),
          s('feFuncB', { type: 'discrete', tableValues: steps }))));
    el.style.cssText = 'position:fixed;width:0;height:0;pointer-events:none;';
    return el;
  }

  function flush() {
    const now = performance.now(), run = Array.from(pendingFrames.values());
    pendingFrames.clear();
    for (const cb of run) { try { cb(now); } catch (e) { console.error(e); } }
  }

  const tellPage = (on) => window.dispatchEvent(new CustomEvent('liquidos-low-power', { detail: on }));

  L.os.feature({
    id: 'lowPower',
    isOn: (st) => !!st.lowPower,
    start() {
      svg = buildFilter();
      root.appendChild(svg);
      prevFilter = root.style.filter;
      root.style.setProperty('filter', 'url(#lq-low-power) contrast(1.15) saturate(.85)', 'important');
      style = document.createElement('style');
      style.setAttribute('data-lq', '');
      style.textContent = '*, *::before, *::after { animation-timing-function: steps(4, end) !important; ' +
        'transition-timing-function: steps(4, end) !important; scroll-behavior: auto !important; } ' +
        'img, video, canvas { image-rendering: pixelated !important; }';
      root.appendChild(style);

      window.requestAnimationFrame = (cb) => { const id = nextId++; pendingFrames.set(id, cb); return id; };
      window.cancelAnimationFrame = (id) => { if (!pendingFrames.delete(id)) realCancel(id); };
      timer = setInterval(flush, FRAME_MS);
      tellPage(true);
    },
    stop() {
      clearInterval(timer); timer = 0;
      window.requestAnimationFrame = realRAF;
      window.cancelAnimationFrame = realCancel;
      flush(); // hand any waiting frames back to the real clock
      root.style.removeProperty('filter');
      if (prevFilter) root.style.filter = prevFilter;
      svg?.remove(); style?.remove(); svg = style = null;
      tellPage(false);
    }
  });
})();
