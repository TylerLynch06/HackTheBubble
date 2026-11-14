// TEMPLATE: copy this to src/effects/<your-id>.js. It is NOT loaded until you add it to manifest.json.
//
// 1. Copy this file and rename it (e.g. src/effects/evaporate.js)
// 2. Add a line to src/effect-list.js:  { id: 'evaporate', name: 'Evaporation', defaultOn: true, description: '...' }
// 3. Add "src/effects/evaporate.js" to manifest.json content_scripts.js (before src/boot.js)
// 4. chrome://extensions → reload the extension → refresh your test tab
//
// Rules so we don't break each other's stuff:
//  - Everything you add to the page must be removed in stop() (the popup toggles effects live).
//  - Make elements with Liquid.util.el(...) so they get data-lq and other effects ignore them.
//  - Put overlays in Liquid.util.layer(), never in <body>.
//  - Read Liquid.intensity (0..1) every frame instead of caching it, so the slider works live.
//  - No innerHTML (Google/YouTube block it). Build elements with util.el / util.svg.
(() => {
  Liquid.register({
    id: 'my-effect',

    start(L) {
      const { el } = L.util;
      this.thing = el('div', { text: 'hello', style: { position: 'absolute', top: '50%', left: '50%' } });
      L.util.layer().appendChild(this.thing);

      const loop = () => {
        // animate using L.intensity here
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },

    // Optional: called when the slider moves (only needed if you cache values in start()).
    setIntensity(i, L) {},

    stop() {
      cancelAnimationFrame(this.raf);
      this.thing?.remove();
    }
  });
})();
