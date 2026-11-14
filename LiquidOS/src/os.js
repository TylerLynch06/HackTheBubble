// Liquid OS settings: the five features that ship alongside Liquid Life.
// One object in chrome.storage, shared by every tab and the Control Centre.
//
//   settings: { a11y: bool, dark: 'off' | 'torch' | 'blinding', focus: bool, lowPower: bool, readAloud: bool }
//
//   Liquid.os.feature({ id, isOn(settings), start(settings), stop(), update(settings) })
//   Liquid.os.get() / Liquid.os.set({ focus: true }) / Liquid.os.toggle('focus') / Liquid.os.allOff()
//
// Features switching each other on (the cascade) is decided in one place, the
// background worker, so that ten open tabs don't all try to do it at once. It
// leaves a `notice` in storage and whichever tab is visible shows it.
(() => {
  const L = window.Liquid;
  const KEY = 'liquidOS', NOTICE = 'liquidOSNotice';
  const DEFAULTS = { a11y: false, dark: 'off', focus: false, lowPower: false, readAloud: false };
  const HOTKEYS = { KeyA: 'a11y', KeyD: 'dark', KeyL: 'blinding', KeyF: 'focus', KeyE: 'lowPower', KeyR: 'readAloud' };

  const features = [];
  const running = new Set();
  let settings = { ...DEFAULTS };
  let booted = false;

  const store = (() => { try { return chrome.storage.local; } catch (e) { return null; } })();

  function apply() {
    if (!booted) return;
    for (const f of features) {
      const want = f.isOn(settings);
      try {
        if (want && !running.has(f.id)) { f.start(settings); running.add(f.id); }
        else if (!want && running.has(f.id)) { f.stop(); running.delete(f.id); }
        else if (want && f.update) f.update(settings);
      } catch (e) { console.warn('[Liquid OS] feature failed:', f.id, e); }
    }
  }

  function set(patch) {
    const next = { ...settings, ...patch };
    if (store) {
      try { store.set({ [KEY]: next }); return; } catch (e) { /* extension reloaded; fall through */ }
    }
    settings = next; apply();
  }

  function toggle(id) {
    if (id === 'dark') set({ dark: settings.dark === 'torch' ? 'off' : 'torch' });
    else if (id === 'blinding') set({ dark: settings.dark === 'blinding' ? 'off' : 'blinding' });
    else set({ [id]: !settings[id] });
  }

  function onKey(e) {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    const id = HOTKEYS[e.code];
    if (!id) return;
    e.preventDefault(); e.stopImmediatePropagation();
    toggle(id);
  }

  // The Control Centre asks the visible tab to do things (summon a kraken, etc).
  function onMessage(msg) {
    if (!msg || msg.to !== 'liquid-os-page') return;
    const sea = { kraken: () => L.kraken.summon(), megalodon: () => L.megalodon.summon(), whale: () => L.whale.summon(), ships: () => L.ships.battle() };
    if (sea[msg.cmd]) {
      if (L.stage < 3) { L.setStage(3); setTimeout(sea[msg.cmd], 900); } else sea[msg.cmd]();
    } else if (msg.cmd === 'whirlpool') {
      if (L.stage < 1) L.setStage(1);
      setTimeout(() => L.whirlpool.open(innerWidth / 2, innerHeight / 2), L.stage < 1 ? 600 : 0);
    } else if (msg.cmd === 'notify') {
      L.util.toast('Software Update', 'Liquid OS 26.1 is ready to install. It fixes nothing.');
    } else if (msg.cmd === 'clear') {
      L.util.clearToasts();
    } else if (msg.cmd === 'escalate') {
      L.autoChaos.stepNow();
    } else if (msg.cmd === 'paywall') {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', altKey: true }));
    }
  }

  L.os = {
    DEFAULTS,
    feature(f) { features.push(f); },
    get: () => settings,
    set, toggle,
    allOff() { set({ ...DEFAULTS }); },

    async boot() {
      window.addEventListener('keydown', onKey, true);
      if (store) {
        try {
          chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            if (changes[KEY]) { settings = { ...DEFAULTS, ...(changes[KEY].newValue || {}) }; apply(); }
            const n = changes[NOTICE] && changes[NOTICE].newValue;
            if (n && !document.hidden) L.util.toast(n.title, n.body);
          });
          chrome.runtime.onMessage.addListener(onMessage);
          const got = await store.get(KEY);
          settings = { ...DEFAULTS, ...(got[KEY] || {}) };
        } catch (e) { /* not an extension context */ }
      }
      booted = true;
      if (L.autoChaos) L.autoChaos.start();
      apply();
    }
  };
})();
