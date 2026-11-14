// Zen Mode. White noise for a calmer web. Originally the Subtle Beep extension.
//
// While Zen Mode is on, every so often a low two-second drone plays (the original
// beep: a 150 Hz sawtooth, kept quiet). That is the white noise. Turn Zen Mode
// off and it is silent; nothing else in Liquid OS makes a sound.
//
// The original meant to wait 2 to 5 minutes between drones. That is too rare to
// catch in a demo, so here it is every 12 to 35 seconds, plus once straight away
// when Zen Mode is switched on.
// Browsers refuse to play sound until the page has been clicked or typed in, so
// nothing is heard before the first interaction.
//
//   Liquid.zen.drone()   play the drone now (admin panel "Beep" button)
(() => {
  const L = window.Liquid;
  let ctx = null, timer = 0;

  function audio() {
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function drone() {
    const a = audio();
    if (!a || a.state !== 'running') return;
    const osc = a.createOscillator(), gain = a.createGain();
    const t = a.currentTime, duration = 2.0, volume = 0.1;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    // short fades at each end so it doesn't click
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.03);
    gain.gain.setValueAtTime(volume, t + duration - 0.06);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(gain); gain.connect(a.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function schedule() {
    timer = setTimeout(() => {
      if (!document.hidden) drone();
      schedule();
    }, L.util.rand(12000, 35000));
  }

  const unlock = () => audio();

  L.zen = { drone: () => { audio(); drone(); } };

  L.os.feature({
    id: 'zen',
    isOn: (s) => !!s.zen,
    start() {
      audio();
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
      setTimeout(drone, 400); // so turning it on is immediately rewarded
      schedule();
    },
    stop() {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  });
})();
