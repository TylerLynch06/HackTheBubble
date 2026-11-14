// Refraction + shine: turns the wave sim into
//  1. a displacement map fed to an SVG filter, applied as a backdrop-filter on a
//     full-viewport overlay, so the live page underneath bends with the waves;
//  2. a highlight/shadow canvas on top so the surface reads as wet.
// The overlay ignores the pointer, so the page stays fully usable. Tragically.
(() => {
  const L = window.Liquid;
  if (!L || !L.water || L.refract) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STRENGTH = 70;     // px of displacement at full map deflection
  const SLOPE_GAIN = 110;  // sim slope -> map channel units
  const LIGHT_X = -0.55, LIGHT_Y = -0.83;

  let root, svg, feImage, feDisp, lens, shine, shineCtx, mapCanvas, mapCtx, mapData, shineData;
  let mw = 0, mh = 0, visible = false, off1, off2, lastPower = -1;

  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function build() {
    root = document.createElement('div');
    root.setAttribute('data-lq', '');
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483645;display:none;contain:strict;';

    svg = svgEl('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
    svg.style.cssText = 'position:absolute;width:0;height:0;';
    const filter = svgEl('filter', {
      id: 'lq-refract', x: 0, y: 0, width: '100%', height: '100%',
      filterUnits: 'objectBoundingBox', primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB'
    });
    feImage = svgEl('feImage', { x: 0, y: 0, preserveAspectRatio: 'none', result: 'map' });
    feDisp = svgEl('feDisplacementMap', {
      in: 'SourceGraphic', in2: 'map', scale: STRENGTH, xChannelSelector: 'R', yChannelSelector: 'G'
    });
    filter.append(feImage, feDisp);
    svg.append(filter);

    lens = document.createElement('div');
    lens.style.cssText = 'position:absolute;inset:0;-webkit-backdrop-filter:url(#lq-refract);backdrop-filter:url(#lq-refract);';

    shine = document.createElement('canvas');
    shine.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    shineCtx = shine.getContext('2d');

    mapCanvas = document.createElement('canvas');
    mapCtx = mapCanvas.getContext('2d', { willReadFrequently: true }); // CPU canvas: toDataURL is ~8x faster

    root.append(svg, lens, shine);
    document.documentElement.appendChild(root);
  }

  function fit(W, H) {
    mw = W; mh = H;
    mapCanvas.width = shine.width = W;
    mapCanvas.height = shine.height = H;
    mapData = mapCtx.createImageData(W, H);
    shineData = shineCtx.createImageData(W, H);
    // The sim has a 1-cell border outside the viewport; stretch the map so it lines up.
    const cell = L.water.cell;
    feImage.setAttribute('x', -cell);
    feImage.setAttribute('y', -cell);
    feImage.setAttribute('width', W * cell);
    feImage.setAttribute('height', H * cell);
    shine.style.left = shine.style.top = -cell + 'px';
    shine.style.width = W * cell + 'px';
    shine.style.height = H * cell + 'px';
  }

  function draw({ h, W, H }) {
    if (W !== mw || H !== mh) fit(W, H);
    if (L.water.power !== lastPower) { lastPower = L.water.power; feDisp.setAttribute('scale', lastPower); }
    const m = mapData.data, s = shineData.data;
    for (let j = 0; j < H; j++) {
      const jm = j > 0 ? -W : 0, jp = j < H - 1 ? W : 0;
      for (let i = 0; i < W; i++) {
        const k = j * W + i, p = k * 4;
        const gx = h[k + (i < W - 1 ? 1 : 0)] - h[k - (i > 0 ? 1 : 0)];
        const gy = h[k + jp] - h[k + jm];
        let r = 128 + gx * SLOPE_GAIN, g = 128 + gy * SLOPE_GAIN;
        m[p] = r < 0 ? 0 : r > 255 ? 255 : r;
        m[p + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        m[p + 2] = 128; m[p + 3] = 255;

        // Slopes facing the light glint white; slopes facing away go deep blue.
        const lit = (gx * LIGHT_X + gy * LIGHT_Y) * 1.3;
        if (lit > 0) {
          const a = lit * lit * 255;
          s[p] = 255; s[p + 1] = 255; s[p + 2] = 255; s[p + 3] = a > 215 ? 215 : a;
        } else {
          const a = -lit * 80;
          s[p] = 0; s[p + 1] = 45; s[p + 2] = 110; s[p + 3] = a > 70 ? 70 : a;
        }
      }
    }
    mapCtx.putImageData(mapData, 0, 0);
    shineCtx.putImageData(shineData, 0, 0);
    feImage.setAttribute('href', mapCanvas.toDataURL('image/png'));
    if (!visible) { root.style.display = 'block'; visible = true; }
  }

  function hide() {
    if (root) root.style.display = 'none';
    visible = false;
  }

  L.refract = {
    start() {
      if (!root) build();
      off1 = L.water.onFrame(draw);
      off2 = L.water.onSleep(hide);
    },
    stop() {
      off1?.(); off2?.();
      root?.remove(); root = null; visible = false; mw = mh = 0; lastPower = -1;
    }
  };
})();
