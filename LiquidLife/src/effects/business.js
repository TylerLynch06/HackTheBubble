// The business model (stage 4+). Liquid Life is free. Not having Liquid Life costs money.
//
//  - Liquid damage indicator: a status pill that climbs to 100% as you use the page.
//  - A sponsored card for Liquid Life Dry™ that floats in the corner.
//  - The Liquid Life Dry™ paywall (click the pill or the card, or press Alt+P).
//    Subscribing fails: your card is wet.
//  - The free tier is a towel: ten seconds of one dry patch under the cursor.
//
// Nothing here takes real payment details; there are no input fields at all.
(() => {
  const L = window.Liquid;
  const TOWEL_MS = 10000;

  let pill, pillDot, pillText, card, sheet = null, towelEl = null, towelLabel = null;
  let timer = 0, raf = 0, towelUntil = 0, towelUsed = false;
  let damage = 0, said25 = false, said60 = false, said100 = false;
  let mx = innerWidth / 2, my = innerHeight / 2;

  const el = (...a) => L.util.el(...a);
  const button = (text, primary) => el('button', {
    all: 'unset', boxSizing: 'border-box', display: 'block', width: '100%', textAlign: 'center',
    padding: '9px 12px', borderRadius: '999px', cursor: 'pointer',
    font: `600 13px ${L.util.FONT}`,
    background: primary ? '#0a84ff' : 'rgba(255,255,255,.7)', color: primary ? '#fff' : '#1d1d1f',
    border: primary ? '1px solid #0a84ff' : '1px solid rgba(0,0,0,.12)'
  }, text);

  // ---------- liquid damage ----------
  function renderDamage() {
    const d = Math.round(damage);
    const colour = d < 35 ? '#34c759' : d < 70 ? '#ff9f0a' : '#ff3b30';
    pillDot.style.background = colour;
    pillDot.style.boxShadow = `0 0 8px ${colour}`;
    pillText.textContent = d >= 100 ? 'Liquid damage: Critical' : `Liquid damage: ${d}%`;
  }

  function addDamage(n) {
    if (!pill) return;
    damage = Math.min(100, damage + n * (L.stage >= L.CHAOS ? 2.5 : 1));
    renderDamage();
    if (!said25 && damage >= 25) {
      said25 = true;
      L.util.toast('Liquid detected', 'Liquid has been detected in your website. Do not attempt to dry it yourself.');
    } else if (!said60 && damage >= 60) {
      said60 = true;
      L.util.toast('LiquidCare+', 'Liquid damage is not covered by your warranty. LiquidCare+ would have covered this.');
    } else if (!said100 && damage >= 100) {
      said100 = true;
      openSheet('This website is water damaged.');
    }
  }

  // ---------- paywall ----------
  function plan(name, price, blurb, cta, onClick, featured) {
    const b = button(cta, featured);
    const note = el('div', { minHeight: '30px', marginTop: '7px', fontSize: '11.5px', lineHeight: '1.3', color: '#c9302c' });
    b.addEventListener('click', () => onClick(b, note));
    const box = el('div', {
      flex: '1 1 0', minWidth: '0', padding: '16px 14px 12px', borderRadius: '18px', textAlign: 'left',
      background: featured ? 'rgba(255,255,255,.82)' : 'rgba(255,255,255,.5)',
      border: featured ? '1.5px solid #0a84ff' : '1px solid rgba(255,255,255,.8)',
      display: 'flex', flexDirection: 'column'
    });
    box.append(
      el('div', { font: `700 15px ${L.util.FONT}` }, name),
      el('div', { font: `700 22px ${L.util.FONT}`, margin: '6px 0 2px', letterSpacing: '-.02em' }, price),
      el('div', { fontSize: '12.5px', lineHeight: '1.35', opacity: '.75', margin: '4px 0 14px', flex: '1' }, blurb),
      b, note);
    return box;
  }

  function subscribe(b, note) {
    if (b.dataset.busy) return;
    b.dataset.busy = '1';
    const label = b.textContent;
    b.textContent = 'Processing…'; b.style.opacity = '.6'; note.textContent = '';
    setTimeout(() => {
      b.textContent = label; b.style.opacity = '1'; delete b.dataset.busy;
      note.textContent = 'Payment failed. Your card appears to be wet.';
      L.water.splash(innerWidth / 2, innerHeight / 2, 90, -4);
    }, 1700);
  }

  function openSheet(headline) {
    if (sheet) return;
    const { FONT, glass } = L.util;
    sheet = el('div', {
      position: 'absolute', inset: '0', pointerEvents: 'auto', zIndex: '10',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,14,36,.28)', font: `500 14px/1.4 ${FONT}`, color: '#1d1d1f'
    });
    const panel = el('div', {
      ...glass, width: 'min(680px, 94vw)', padding: '30px 26px 18px', borderRadius: '30px', textAlign: 'center',
      background: 'linear-gradient(135deg, rgba(255,255,255,.86), rgba(235,246,255,.74))'
    });
    const plans = el('div', { display: 'flex', gap: '12px', margin: '22px 0 14px' });
    plans.append(
      plan('Towel', 'Free', 'One towel. Ten seconds. A patch of dry web about the size of your hand.',
        towelUsed ? 'Towel used' : 'Use Towel',
        (b, note) => {
          if (towelUsed) { note.textContent = 'Your towel is still damp. Towel+ is £4.99 a month.'; return; }
          closeSheet(); startTowel();
        }),
      plan('Dry™', '£9.99/mo', 'Turns Liquid Life off on one website. We choose the website.', 'Subscribe', subscribe, true),
      plan('Dry Pro Max', '£29.99/mo', 'Everything in Dry™, plus LiquidCare+ and a second duck.', 'Subscribe', subscribe));

    const no = el('button', {
      all: 'unset', cursor: 'pointer', fontSize: '12px', color: 'rgba(29,29,31,.5)', padding: '6px 10px'
    }, 'Continue with wet web');
    const pleas = ['Are you sure?', 'Your website is still wet.', 'Remind me in 4 seconds'];
    let asked = 0;
    no.addEventListener('click', () => {
      if (asked < pleas.length) { no.textContent = pleas[asked++]; return; }
      closeSheet();
      setTimeout(() => { if (pill) openSheet('Have you had a chance to think about it?'); }, 4000);
    });

    panel.append(
      el('div', { font: `700 12px ${FONT}`, letterSpacing: '.08em', textTransform: 'uppercase', color: '#0a84ff' },
        headline || 'New'),
      el('div', { font: `800 32px/1.1 ${FONT}`, letterSpacing: '-.03em', margin: '8px 0 6px' }, 'Liquid Life Dry™'),
      el('div', { fontSize: '15px', opacity: '.75' }, 'The web you love. Without the water we added.'),
      plans, no,
      el('div', { fontSize: '10.5px', opacity: '.45', marginTop: '6px' },
        'Dry™ does not make your website dry. Humidity may persist. Duck not included in base plan.'));
    sheet.appendChild(panel);
    sheet.addEventListener('pointerdown', (e) => e.stopPropagation()); // no splashing in the shop
    L.util.layer().appendChild(sheet);
    panel.animate([{ transform: 'scale(.86) translateY(26px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 520, easing: 'cubic-bezier(.2,1.4,.4,1)' });
  }

  function closeSheet() { sheet?.remove(); sheet = null; }

  // ---------- towel (free tier) ----------
  function startTowel() {
    towelUsed = true;
    towelUntil = performance.now() + TOWEL_MS;
    L.towel = true;
    towelEl = el('div', {
      position: 'absolute', left: '0', top: '0', width: '150px', height: '104px', pointerEvents: 'none',
      borderRadius: '12px', willChange: 'transform',
      background: 'repeating-linear-gradient(90deg, #fdfdfb 0 22px, #cfe6fb 22px 30px, #fdfdfb 30px 38px, #9fcaf3 38px 46px)',
      boxShadow: '0 10px 26px rgba(0,30,70,.3), inset 0 0 0 1px rgba(0,0,0,.06), inset 0 -8px 0 rgba(0,0,0,.04)'
    });
    towelLabel = el('div', {
      position: 'absolute', left: '50%', bottom: '-30px', transform: 'translateX(-50%)', whiteSpace: 'nowrap',
      padding: '4px 10px', borderRadius: '999px', background: 'rgba(29,29,31,.82)', color: '#fff',
      font: `600 12px ${L.util.FONT}`
    });
    towelEl.appendChild(towelLabel);
    L.util.layer().appendChild(towelEl);
    L.util.toast('Towel activated', 'Your free trial of dryness has begun.', 2600);
    raf = requestAnimationFrame(towelLoop);
  }

  function towelLoop(now) {
    const left = towelUntil - now;
    if (left <= 0) return endTowel(true);
    L.water.calm(mx, my, 130, 0.25);
    towelEl.style.transform = `translate(${mx - 75}px, ${my - 52}px) rotate(-6deg)`;
    towelLabel.textContent = `Towel trial · 0:${String(Math.ceil(left / 1000)).padStart(2, '0')}`;
    raf = requestAnimationFrame(towelLoop);
  }

  function endTowel(expired) {
    cancelAnimationFrame(raf);
    towelEl?.remove(); towelEl = towelLabel = null;
    L.towel = false;
    if (expired) {
      L.water.splash(mx, my, 110, -7); // the water has been waiting
      L.util.toast('Your towel has expired', 'Towel+ keeps you dry for up to 20 seconds. £4.99 a month.');
    }
  }

  // ---------- wiring ----------
  function onMove(e) { mx = e.clientX; my = e.clientY; }
  function onDown() { addDamage(1.5); }
  function onKey(e) {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyP') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (sheet) closeSheet(); else openSheet();
    }
  }

  L.gag({
    id: 'business',
    min: 4,
    start() {
      const { FONT, glass } = L.util;
      damage = 0; said25 = said60 = said100 = false; towelUsed = false;

      pill = el('div', {
        ...glass, position: 'absolute', left: '16px', bottom: '16px', padding: '8px 14px 8px 11px',
        borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '8px',
        font: `600 12.5px ${FONT}`, pointerEvents: 'auto', cursor: 'pointer'
      });
      pillDot = el('span', { width: '9px', height: '9px', borderRadius: '50%', display: 'block' });
      pillText = el('span', {});
      pill.append(pillDot, pillText);
      pill.addEventListener('click', (e) => { e.stopPropagation(); openSheet(); });
      pill.addEventListener('pointerdown', (e) => e.stopPropagation());

      // Sponsored card: floats, naturally.
      card = el('div', {
        ...glass, position: 'absolute', right: '18px', bottom: '18px', width: '250px', padding: '13px 15px',
        borderRadius: '20px', font: `500 13px/1.35 ${FONT}`, pointerEvents: 'auto', cursor: 'pointer', textAlign: 'left'
      });
      card.append(
        el('div', { fontSize: '10px', fontWeight: '700', letterSpacing: '.08em', opacity: '.5', textTransform: 'uppercase' }, 'Sponsored'),
        el('div', { font: `700 15px ${FONT}`, margin: '3px 0 2px' }, 'Liquid Life Dry™'),
        el('div', { opacity: '.78' }, 'Tired of water? Try the web, but dry. From £9.99 a month.'),
        el('div', { color: '#0a84ff', fontWeight: '600', marginTop: '6px' }, 'Learn more ›'));
      card.addEventListener('click', (e) => { e.stopPropagation(); openSheet(); });
      card.addEventListener('pointerdown', (e) => e.stopPropagation());

      L.util.layer().append(pill, card);
      card.animate([{ transform: 'translateY(120px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
        { duration: 2600, easing: 'cubic-bezier(.2,.9,.3,1)' });
      card.animate([{ transform: 'translateY(0) rotate(-1deg)' }, { transform: 'translateY(9px) rotate(1.2deg)' }],
        { duration: 2300, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: 2600 });
      renderDamage();

      timer = setInterval(() => { if (!document.hidden) addDamage(L.whirlpool?.active ? 5 : 1.5); }, 1000);
      window.addEventListener('pointermove', onMove, { capture: true, passive: true });
      window.addEventListener('pointerdown', onDown, { capture: true, passive: true });
      window.addEventListener('keydown', onKey, true);
    },
    stop() {
      clearInterval(timer);
      window.removeEventListener('pointermove', onMove, { capture: true });
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('keydown', onKey, true);
      endTowel(false); closeSheet();
      pill?.remove(); card?.remove(); pill = card = null;
    }
  });
})();
