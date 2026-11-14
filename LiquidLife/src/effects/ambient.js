// Ambient (stage 1+): the surface is never quite still. A lazy drop now and then
// at low stages; by Chaos it is properly raining.
(() => {
  const L = window.Liquid;
  //            stage: 0  1     2     3     4    5 (Chaos)
  const EVERY_MS =    [0, 1400, 1100, 1500, 900,  220];
  const STRENGTH =    [0, 0.9,  1.1,  0.9,  1.3,  1.8];
  let timer = 0;

  function drop() {
    const s = L.stage, { rand } = L.util;
    if (!document.hidden) {
      L.water.splash(rand(0, innerWidth), rand(0, innerHeight), rand(18, 34), -STRENGTH[s] * rand(0.6, 1.2));
    }
    timer = setTimeout(drop, EVERY_MS[s] * rand(0.5, 1.5));
  }

  L.gag({
    id: 'ambient',
    min: 1,
    start() { timer = setTimeout(drop, 400); },
    stop() { clearTimeout(timer); }
  });
})();
