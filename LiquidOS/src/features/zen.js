// Zen Mode. White noise for a calmer web. Originally the Subtle Beep extension.
//
// While Zen Mode is on, every so often a low two-second drone plays (the original
// beep: a 150 Hz sawtooth, kept quiet). That is the white noise. Turn Zen Mode
// off and it is silent; nothing else in Liquid OS makes a sound.
//
// The original meant to wait 2 to 5 minutes between drones. That is too rare to
// catch in a demo, so here it is every 12 to 35 seconds, plus once straight away
// when Zen Mode is switched on.
// Browsers refuse to play sound until the page has been clicked or typed in. If
// Zen Mode is switched on before that (from the Control Centre, say), the first
// drone is held back and plays on the first click or key press.
//
//   Liquid.zen.drone()   play the drone now (admin panel "Beep" button)
(() => {
  const L = window.Liquid;
  let ctx = null, timer = 0, owed = false;

  // Chrome only lets a page start audio once the user has clicked or pressed a
  // key on it. Creating the AudioContext before then logs a warning and plays
  // nothing, so until that has happened we don't touch audio at all.
  const interacted = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;

  function audio() {
    if (!interacted()) return null;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function drone() {
    const a = audio();
    if (!a) { owed = true; return; } // no interaction yet: play it on the first click instead
    owed = false;
    if (a.state !== 'running') {
      // just created or just resumed: it needs a moment before it can play
      a.resume().then(() => { if (a.state === 'running') play(a); }).catch(() => {});
      return;
    }
    play(a);
  }

  function play(a) {
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

  // First click or key press on the page: audio is now allowed, so play any drone we owe.
  const unlock = () => { if (owed) setTimeout(drone, 0); };

  L.zen = { drone };

  L.os.feature({
    id: 'zen',
    isOn: (s) => !!s.zen,
    start() {
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
      setTimeout(drone, 400); // so turning it on is immediately rewarded
      schedule();
    },
    stop() {
      clearTimeout(timer); owed = false;
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  });
})();
