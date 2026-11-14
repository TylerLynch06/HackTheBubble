// Liquid Glass™: frost every control and card. The glass gets thicker and the
// text gets fainter the longer you stay on the page. Legibility is a legacy concept.
(() => {
  const CONTROLS = 'button, input, select, textarea, [role="button"], [class*="btn" i], [class*="button" i]';
  const PANELS = 'nav, header, footer, aside, dialog, [class*="card" i], [class*="panel" i], [class*="modal" i]';
  const TEXT = 'p, li, td, th, label, h1, h2, h3, h4, h5, h6, a, span, blockquote, figcaption';
  const NOT_OURS = ':not([data-lq]):not([data-lq] *)';

  const CSS = `
    html.lq-glassify :is(${CONTROLS}, ${PANELS})${NOT_OURS} {
      background: linear-gradient(135deg, rgba(255,255,255,.38), rgba(255,255,255,.06)) !important;
      -webkit-backdrop-filter: blur(var(--lq-blur, 6px)) saturate(190%) !important;
      backdrop-filter: blur(var(--lq-blur, 6px)) saturate(190%) !important;
      border: 1px solid rgba(255,255,255,.6) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.95), inset 0 -8px 18px rgba(255,255,255,.2), 0 8px 30px rgba(0,0,0,.16) !important;
      transition: border-radius .6s cubic-bezier(.2,1.6,.4,1) !important;
    }
    html.lq-glassify :is(${CONTROLS})${NOT_OURS} { border-radius: 999px !important; }
    html.lq-glassify :is(${PANELS})${NOT_OURS} { border-radius: 30px !important; }
    html.lq-glassify :is(img, video, iframe, canvas)${NOT_OURS} { border-radius: 30px !important; }
    html.lq-glassify body :is(${TEXT})${NOT_OURS} {
      color: rgba(40, 40, 55, var(--lq-ink, .85)) !important;
      text-shadow: 0 1px 0 rgba(255,255,255,.85), 0 0 14px rgba(255,255,255,.95) !important;
    }
    #lq-glare {
      position: absolute; inset: -50%;
      background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.55) 48%, rgba(255,255,255,.1) 52%, transparent 60%);
      mix-blend-mode: overlay;
      animation: lq-glare 7s ease-in-out infinite;
    }
    @keyframes lq-glare { 0% { transform: translateX(-60%); } 60%, 100% { transform: translateX(60%); } }
  `;

  Liquid.register({
    id: 'glassify',
    start(L) {
      this.style = L.util.addStyle('lq-glassify-css', CSS);
      document.documentElement.classList.add('lq-glassify');
      this.glare = L.util.el('div', { attrs: { id: 'lq-glare' } });
      L.util.layer().appendChild(this.glare);
      this.t0 = performance.now();
      this.tick = () => {
        const mins = (performance.now() - this.t0) / 60000;
        const i = L.intensity;
        // Blur grows ~5px a minute up to a cap; ink fades over ~3 minutes.
        const blur = Math.min(3 + mins * 5, 4 + 16 * i);
        const ink = Math.max(0.85 - mins * 0.2, 0.85 - 0.6 * i);
        const root = document.documentElement.style;
        root.setProperty('--lq-blur', blur.toFixed(1) + 'px');
        root.setProperty('--lq-ink', ink.toFixed(2));
      };
      this.tick();
      this.timer = setInterval(this.tick, 1000);
    },
    setIntensity() { this.tick?.(); },
    stop() {
      clearInterval(this.timer);
      this.style?.remove();
      this.glare?.remove();
      document.documentElement.classList.remove('lq-glassify');
      document.documentElement.style.removeProperty('--lq-blur');
      document.documentElement.style.removeProperty('--lq-ink');
    }
  });
})();
