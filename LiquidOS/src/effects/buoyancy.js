// Buoyancy by importance (stage 4+): things float according to how little they
// matter. Ads, cookie banners, newsletter boxes and sidebars rise to the top of
// the window and bob there. The article you came for slowly sinks, tilting and
// fading into the deep. Turning the stage down lets everything settle home.
(() => {
  const L = window.Liquid;

  // Lighter than water.
  const FLOAT_SEL = [
    'ins.adsbygoogle', '[id^="google_ads"]', '[id*="-ad-" i]', '[class*="-ad-" i]', '[class~="ad"]', '[class~="ads"]',
    '[class*="advert" i]', '[id*="advert" i]', '[class*="sponsor" i]', '[id*="sponsor" i]', '[class*="promo" i]',
    '[class*="cookie" i]', '[id*="cookie" i]', '[class*="consent" i]', '[id*="consent" i]',
    '[class*="newsletter" i]', '[id*="newsletter" i]', '[class*="subscribe" i]', '[id*="subscribe" i]',
    '[class*="banner" i]', '[id*="banner" i]', '[class*="sitenotice" i]', '[id*="sitenotice" i]',
    '[class*="sidebar" i]', '[id*="sidebar" i]', 'aside', '[role="complementary"]'
  ].join(',');

  // Denser than water.
  const SINK_SEL = 'article p, article h2, article h3, article li, article img, article figure, ' +
    'main p, main h2, main h3, [role="main"] p, p, h1, h2, blockquote, figure';

  const MAX_FLOAT = 10, SINK_PER_SCAN = 40;
  let timer = 0, floaters = 0;

  function scan() {
    const vw = innerWidth, vh = innerHeight;
    if (vw && vh && !document.hidden) {
      for (const el of document.querySelectorAll(FLOAT_SEL)) {
        if (floaters >= MAX_FLOAT) break;
        if (L.bodies.has(el) || L.util.isOurs(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 60 || r.height < 24 || r.bottom < 0 || r.top > vh) continue;
        if (r.width * r.height > vw * vh * 0.4) continue; // a wrapper, not a widget
        if (L.bodies.setBuoy(el, 1)) floaters++;
      }
      let n = 0;
      for (const el of document.querySelectorAll(SINK_SEL)) {
        if (n >= SINK_PER_SCAN) break;
        if (L.bodies.has(el) || L.util.isOurs(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 10 || r.bottom < 0 || r.top > vh) continue;
        if (el.closest(FLOAT_SEL)) continue; // it's riding on something that floats
        if (L.bodies.setBuoy(el, -1)) n++;
      }
    }
    timer = setTimeout(scan, 1500); // content scrolled into view starts sinking too
  }

  L.gag({
    id: 'buoyancy',
    min: 4,
    start() {
      floaters = 0;
      L.bodies.buoyancy.active = true;
      timer = setTimeout(scan, 900);
    },
    stop() {
      clearTimeout(timer);
      L.bodies.buoyancy.active = false; // everything springs home and is released
    }
  });
})();
