// Chaos progresses by itself, presented to the user as Automatic Updates.
//
// While the admin switch `autoChaos` is on (it is by default), Liquid OS keeps
// upgrading you. A countdown pill at the top of the page says when the next
// update lands and what it will be. When it reaches zero:
//   - the Liquid Life level goes up one (Calm -> Wake -> High Seas -> Buoyancy -> Chaos);
//   - once the level is at the top, a feature that is still off is switched on.
// When there is nothing left to switch on, the pill goes away.
//
// The time of the next update is kept in storage, not in the page, so moving to
// another page or tab does not restart the countdown. Hidden tabs do nothing;
// the tab you are looking at does the work.
//
// The interval is admin.chaosSeconds (default 20), set in the admin panel.
(() => {
  const L = window.Liquid;
  const AT_KEY = 'liquidOSChaosAt';
  const FEATURE_NAMES = { a11y: 'Larger Text', dark: 'Dark Mode', focus: 'Focus', lowPower: 'Low Power Mode', readAloud: 'Read Aloud', zen: 'Zen Mode' };
  const store = (() => { try { return chrome.storage.local; } catch (e) { return null; } })();

  let nextAt = 0, ticker = 0, hud = null, hudText = null, hudBar = null;

  const intervalMs = () => Math.max(5, Number(L.admin.chaosSeconds) || 20) * 1000;
  const offFeatures = () => { const s = L.os.get(); return Object.keys(FEATURE_NAMES).filter((id) => !s[id] || s[id] === 'off'); };

  // What the next update would be, or null when everything is already on.
  function upcoming() {
    if (L.stage < L.CHAOS) return L.STAGES[L.stage + 1].name;
    return offFeatures().length ? 'a recommended feature' : null;
  }

  function plan(ms) {
    nextAt = Date.now() + ms;
    if (store) { try { store.set({ [AT_KEY]: nextAt }); } catch (e) { /* extension reloaded */ } }
  }

  function step() {
    if (L.stage < L.CHAOS) {
      const next = L.stage + 1;
      L.setStage(next);
      setTimeout(() => L.util.toast('Automatic Update', `Liquid Life has been upgraded to ${L.STAGES[next].name}. You did not need to do anything.`), 700);
    } else {
      const off = offFeatures();
      if (!off.length) return;
      const id = L.util.pick(off);
      L.os.set({ [id]: id === 'dark' ? 'torch' : true });
      L.util.toast('Recommended for you', `${FEATURE_NAMES[id]} has been turned on, based on how you use the web.`);
    }
  }

  function showHud(what, msLeft) {
    if (!hud || !hud.isConnected) {
      const { el, FONT } = L.util;
      hud = el('div', {
        position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: '85',
        padding: '7px 14px 9px', borderRadius: '14px', minWidth: '250px', boxSizing: 'border-box',
        background: 'rgba(22,24,30,.9)', color: '#fff', font: `600 12.5px/1.3 ${FONT}`, textAlign: 'center',
        boxShadow: '0 8px 26px rgba(0,0,0,.35)', pointerEvents: 'none', letterSpacing: 'normal'
      });
      hudText = el('div', {});
      const track = el('div', { height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,.22)', marginTop: '6px', overflow: 'hidden' });
      hudBar = el('div', { height: '100%', width: '0%', background: '#0a84ff', borderRadius: '2px' });
      track.appendChild(hudBar);
      hud.append(hudText, track);
      L.util.layer().appendChild(hud);
    }
    const secs = Math.max(0, Math.ceil(msLeft / 1000));
    hudText.textContent = `Automatic update in 0:${String(secs).padStart(2, '0')} · ${what}`;
    const done = 1 - Math.min(1, Math.max(0, msLeft / intervalMs()));
    hudBar.style.width = (done * 100).toFixed(1) + '%';
    hudBar.style.background = secs <= 5 ? '#ff453a' : '#0a84ff'; // goes red for the last five seconds
  }

  function hideHud() { hud?.remove(); hud = hudText = hudBar = null; }

  function tick() {
    if (!L.admin.autoChaos || document.hidden) { hideHud(); return; }
    const what = upcoming();
    if (!what) { hideHud(); return; }
    const now = Date.now();
    // no time set yet, or one left over from a longer interval: start a fresh countdown
    if (!nextAt || nextAt - now > intervalMs() + 1500) plan(intervalMs());
    if (now >= nextAt) { plan(intervalMs()); step(); return; }
    showHud(what, nextAt - now);
  }

  L.autoChaos = {
    async start() {
      if (store) {
        try {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes[AT_KEY]) nextAt = Number(changes[AT_KEY].newValue) || 0;
          });
          nextAt = Number((await store.get(AT_KEY))[AT_KEY]) || 0;
        } catch (e) { /* not an extension context */ }
      }
      clearInterval(ticker);
      ticker = setInterval(tick, 250);
    },
    // admin panel: one step on demand, whatever the switch says
    stepNow() { step(); if (L.admin.autoChaos) plan(intervalMs()); },
    get nextAt() { return nextAt; }
  };
})();
