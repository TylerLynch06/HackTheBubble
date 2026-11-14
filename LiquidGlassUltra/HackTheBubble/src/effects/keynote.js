// Keynote Mode: a launch-event "Introducing…" modal on each new page visit, plus
// helpful glass notifications at random intervals. "Reduce Transparency" makes it worse.
(() => {
  const TOASTS = [
    ['Hydration', 'Your text has been moved to the floor for your convenience.'],
    ['Legibility', 'Contrast has been courageously reduced.'],
    ['Water level', 'Please keep your hands and tabs inside the liquid at all times.'],
    ['Software Update', 'Liquid OS 26.1 is ready. It fixes nothing.'],
    ['Accessibility', '"Reduce Transparency" has been renamed to "Give Up".'],
    ['Battery', 'This page is 47% wet.'],
    ['Assistant', 'Here\'s what I found on the web for "why is my screen damp".'],
    ['Liquid Glass™', 'Now refracting 12% more of what you were trying to read.'],
    ['Privacy', 'We can see right through you. Literally. It\'s glass.'],
    ['Storage', 'Your browser is almost full. Of water.']
  ];

  const CSS = `
    #lq-keynote {
      position: absolute; inset: 0; display: grid; place-items: center; pointer-events: auto;
      background: radial-gradient(circle at 50% 40%, rgba(255,255,255,.05), rgba(0,0,0,.35));
      animation: lq-fade .5s ease both;
    }
    #lq-keynote .lq-card {
      width: min(460px, 90vw); padding: 34px 30px 24px; border-radius: 38px; text-align: center;
      animation: lq-pop .8s cubic-bezier(.2,1.7,.4,1) both;
    }
    #lq-keynote h1 { all: unset; display: block; font: 800 30px/1.1 -apple-system, "SF Pro Display", "Segoe UI", sans-serif; letter-spacing: -.02em;
      background: linear-gradient(90deg, #5ac8fa, #af52de, #ff2d55, #5ac8fa); background-size: 300%;
      -webkit-background-clip: text; background-clip: text; color: transparent; animation: lq-shine 6s linear infinite; }
    #lq-keynote .lq-sub { margin: 10px 0 18px; font-size: 15px; opacity: .8; }
    #lq-keynote ul { all: unset; display: block; text-align: left; margin: 0 auto 22px; max-width: 330px; }
    #lq-keynote li { all: unset; display: block; padding: 5px 0; font-size: 14px; }
    #lq-keynote .lq-row { display: flex; gap: 10px; justify-content: center; }
    #lq-keynote button { all: unset; cursor: pointer; padding: 11px 20px; border-radius: 999px; font: 600 14px -apple-system, "Segoe UI", sans-serif; }
    #lq-keynote .lq-primary { background: rgba(10,132,255,.85); color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.5); }
    #lq-keynote .lq-secondary { background: rgba(255,255,255,.4); color: #1d1d1f; border: 1px solid rgba(255,255,255,.7); }
    @keyframes lq-fade { from { opacity: 0; } }
    @keyframes lq-pop { from { transform: scale(.7) translateY(30px); opacity: 0; } }
    @keyframes lq-shine { to { background-position: 300%; } }
  `;

  Liquid.register({
    id: 'keynote',
    start(L) {
      const { el, pick, rand, lerp } = L.util;
      this.style = L.util.addStyle('lq-keynote-css', CSS);

      const showModal = () => {
        const close = () => { this.modal?.remove(); this.modal = null; };
        const reduce = el('button', { cls: 'lq-secondary', text: 'Reduce Transparency' });
        const embrace = el('button', { cls: 'lq-primary', text: 'Embrace the Liquid' });
        this.modal = el('div', { attrs: { id: 'lq-keynote' } },
          el('div', { cls: 'lq-card lq-glass' },
            el('h1', { text: 'Introducing Liquid Glass Ultra™' }),
            el('div', { cls: 'lq-sub', text: 'Our most liquid interface ever. Now with 0% solids.' }),
            el('ul', {},
              el('li', { text: '💧  Text that flows. Off the page.' }),
              el('li', { text: '🫧  Buttons that move freely, like you never could.' }),
              el('li', { text: '🌊  Up to 85% water by volume.' }),
              el('li', { text: '🔍  Legibility: courageously removed.' })),
            el('div', { cls: 'lq-row' }, reduce, embrace)));
        embrace.addEventListener('click', close);
        reduce.addEventListener('click', () => {
          close();
          L.setIntensity(Math.min(1, L.intensity + 0.1));
          L.util.toast('Request denied', 'Transparency increased by 10%. You\'re welcome.');
        });
        L.util.layer().appendChild(this.modal);
      };

      // Once per tab visit to a site (sessionStorage), after a dramatic pause.
      let seen = false;
      try { seen = sessionStorage.getItem('lq-keynote-seen') === '1'; sessionStorage.setItem('lq-keynote-seen', '1'); } catch (e) { /* sandboxed page */ }
      if (!seen) this.modalTimer = setTimeout(showModal, 1800);

      const nextToast = () => {
        this.toastTimer = setTimeout(() => {
          if (!document.hidden) { const [t, b] = pick(TOASTS); L.util.toast(t, b); }
          nextToast();
        }, lerp(60000, 15000, L.intensity) * rand(0.6, 1.3));
      };
      nextToast();
    },
    stop() {
      clearTimeout(this.modalTimer);
      clearTimeout(this.toastTimer);
      this.modal?.remove();
      this.modal = null;
      this.style?.remove();
    }
  });
})();
