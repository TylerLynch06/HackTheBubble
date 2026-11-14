// Jelly Text: SVG turbulence + displacement filters. Headings and images shimmer
// like they're at the bottom of a pool; anything under the cursor turns to jelly.
(() => {
  const CSS = `
    html.lq-wobble :is(h1, h2, h3, img, video):not([data-lq]) { filter: url(#lq-wobble-soft); }
    html.lq-wobble :is(p, li, a, button, td, label, input, h4, h5, h6, span):not([data-lq]):hover {
      filter: url(#lq-wobble-strong) !important;
    }
  `;

  function makeFilter(L, id, freq, scale, dur) {
    const { svg } = L.util;
    const turb = svg('feTurbulence', {
      type: 'fractalNoise', baseFrequency: `${freq} ${freq * 1.6}`, numOctaves: '2', seed: String(Math.floor(Math.random() * 99)), result: 'noise'
    }, svg('animate', {
      attributeName: 'baseFrequency', dur, repeatCount: 'indefinite',
      values: `${freq} ${freq * 1.6};${freq * 1.6} ${freq};${freq} ${freq * 1.6}`
    }));
    const disp = svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: String(scale), xChannelSelector: 'R', yChannelSelector: 'G' });
    return { node: svg('filter', { id, x: '-10%', y: '-10%', width: '120%', height: '120%' }, turb, disp), disp };
  }

  Liquid.register({
    id: 'wobble',
    start(L) {
      this.soft = makeFilter(L, 'lq-wobble-soft', 0.01, 6, '9s');
      this.strong = makeFilter(L, 'lq-wobble-strong', 0.03, 18, '2.5s');
      this.svgRoot = L.util.svg('svg', { 'data-lq': '', width: '0', height: '0', style: 'position:absolute;width:0;height:0' },
        this.soft.node, this.strong.node);
      document.documentElement.appendChild(this.svgRoot);
      this.style = L.util.addStyle('lq-wobble-css', CSS);
      document.documentElement.classList.add('lq-wobble');
      this.setIntensity(L.intensity);
    },
    setIntensity(i) {
      this.soft?.disp.setAttribute('scale', String(2 + 10 * i));
      this.strong?.disp.setAttribute('scale', String(6 + 34 * i));
    },
    stop() {
      this.svgRoot?.remove();
      this.style?.remove();
      document.documentElement.classList.remove('lq-wobble');
    }
  });
})();
