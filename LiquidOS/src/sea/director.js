// Sea director (stage 3+): decides when things happen on the high seas.
// Ships fight continuously. Monsters take turns: kraken, megalodon, whale...
// one at a time, with a breather in between.
// Presenter hotkeys: Alt+S ships, Alt+K kraken, Alt+M megalodon, Alt+H whale.
//
//   Liquid.sea.busy     a monster event is in progress
//   Liquid.sea.threat   { x, y } of something the ducks should flee, or null
(() => {
  const L = window.Liquid;
  L.sea = { busy: false, threat: null };
  let timer = 0, next = 0;

  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (L.admin.autoChaos && !document.hidden && !L.sea.busy && !L.whirlpool?.active) {
        [L.kraken, L.megalodon, L.whale][next++ % 3].summon();
      }
      schedule(L.util.rand(18000, 26000));
    }, ms);
  }

  function onKey(e) {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const act = { KeyS: () => L.ships.battle(), KeyK: () => L.kraken.summon(), KeyM: () => L.megalodon.summon(), KeyH: () => L.whale.summon() }[e.code];
    if (!act) return;
    e.preventDefault(); e.stopImmediatePropagation();
    act();
  }

  L.gag({
    id: 'sea-director',
    min: 3,
    start() {
      next = 0;
      schedule(13000); // first monster arrives mid-battle
      window.addEventListener('keydown', onKey, true);
    },
    stop() {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey, true);
      L.sea.busy = false; L.sea.threat = null;
    }
  });
})();
