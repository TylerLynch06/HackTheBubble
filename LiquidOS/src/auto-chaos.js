// Chaos progresses by itself. While this is switched on (it is by default; the
// admin panel turns it off), Liquid OS keeps upgrading you: every half minute or
// so the Liquid Life level goes up one, and once it is at the top, features that
// are still off get switched on, one at a time. Each step is announced.
//
// Only the tab you are looking at does this, so several open tabs don't race.
(() => {
  const L = window.Liquid;
  const FEATURE_NAMES = { a11y: 'Larger Text', dark: 'Dark Mode', focus: 'Focus', lowPower: 'Low Power Mode', readAloud: 'Read Aloud' };
  let timer = 0;

  function step(force) {
    if (force === true || (L.admin.autoChaos && !document.hidden && document.hasFocus())) {
      if (L.stage < L.CHAOS) {
        const next = L.stage + 1;
        L.setStage(next);
        setTimeout(() => L.util.toast('Automatic Update', `Liquid Life has been upgraded to ${L.STAGES[next].name}. You did not need to do anything.`), 700);
      } else if (L.os) {
        const s = L.os.get();
        const off = Object.keys(FEATURE_NAMES).filter((id) => !s[id] || s[id] === 'off');
        if (off.length) {
          const id = L.util.pick(off);
          L.os.set({ [id]: id === 'dark' ? 'torch' : true });
          L.util.toast('Recommended for you', `${FEATURE_NAMES[id]} has been turned on, based on how you use the web.`);
        }
      }
    }
    if (force !== true) timer = setTimeout(step, L.util.rand(26000, 40000));
  }

  L.autoChaos = {
    start() { clearTimeout(timer); timer = setTimeout(step, L.util.rand(26000, 40000)); },
    stepNow: () => step(true) // admin panel: one step on demand, whatever the switch says
  };
})();
