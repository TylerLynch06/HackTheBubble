// Zen Mode. White noise for a calmer web. Originally the Subtle Beep extension.
// The sound is the original beep: a low sawtooth drone around 150 Hz.
//
// Two modes (settings.zen):
//   'random' (or true)  Drones at unpredictable moments, 1.5 to 9 seconds apart
//                       and sometimes two or three in quick succession. Each one
//                       has its own volume (from barely audible to quite loud),
//                       length and pitch, so you can never tune it out.
//   'constant'          One drone that never stops.
// Off is silent; nothing else in Liquid OS makes a sound.
//
// Browsers refuse to play sound until the page has been clicked or typed in. If
// Zen Mode is switched on before that (from the Control Centre, say), it starts
// on the first click or key press.
//
//   Liquid.zen.drone()   play one drone now (admin panel "Beep" button)
(() => {
  const L = window.Liquid;
  let ctx = null, timer = 0, owed = false, mode = 'off';
  let hum = null; // { osc, gain } while the constant drone is playing

  const modeOf = (s) => (s.zen === 'constant' ? 'constant' : s.zen && s.zen !== 'off' ? 'random' : 'off');

  // Chrome only lets a page start audio once the user has clicked or pressed a
  // key on it. Creating the AudioContext before then logs a warning and plays
  // nothing, so until that has happened we don't touch audio at all.
  const interacted = () => !navigator.userActivation || navigator.userActivation.hasBeenActive;

  // Calls fn(audioContext) once audio is actually running; false if it can't yet.
  function withAudio(fn) {
    if (!interacted()) return false;
    try {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'running') fn(ctx);
      else ctx.resume().then(() => { if (ctx.state === 'running') fn(ctx); }).catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  function playDrone(a, volume, duration, freq) {
    const osc = a.createOscillator(), gain = a.createGain(), t = a.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    // short fades at each end so it doesn't click
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.03);
    gain.gain.setValueAtTime(volume, t + duration - 0.06);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(gain); gain.connect(a.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // One drone. Random mode gives every one a different volume, length and pitch.
  function drone(plain) {
    const { rand } = L.util;
    const volume = plain === true ? 0.1 : rand(0.02, 0.32);
    const duration = plain === true ? 2.0 : rand(0.5, 2.6);
    const freq = plain === true ? 150 : rand(118, 186);
    if (!withAudio((a) => playDrone(a, volume, duration, freq))) owed = true;
  }

  function scheduleRandom() {
    const { rand } = L.util;
    // usually a few seconds; one time in four, almost immediately (a little cluster)
    const wait = Math.random() < 0.25 ? rand(250, 900) : rand(1500, 9000);
    timer = setTimeout(() => {
      if (mode !== 'random') return;
      if (!document.hidden) drone();
      scheduleRandom();
    }, wait);
  }

  function startHum() {
    if (hum) return;
    const ok = withAudio((a) => {
      if (hum || mode !== 'constant') return;
      const osc = a.createOscillator(), gain = a.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, a.currentTime);
      gain.gain.setValueAtTime(0, a.currentTime);
      gain.gain.linearRampToValueAtTime(0.09, a.currentTime + 0.4);
      osc.connect(gain); gain.connect(a.destination);
      osc.start();
      hum = { osc, gain };
    });
    if (!ok) owed = true;
  }

  function stopHum() {
    if (!hum) return;
    const { osc, gain } = hum;
    hum = null;
    try {
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) { /* already stopped */ }
  }

  function setMode(next) {
    if (next === mode) return;
    clearTimeout(timer);
    stopHum();
    owed = false;
    mode = next;
    if (mode === 'random') { drone(); scheduleRandom(); }
    else if (mode === 'constant') startHum();
  }

  // First click or key press on the page: audio is now allowed, so start what we owe.
  function unlock() {
    if (!owed) return;
    owed = false;
    setTimeout(() => { if (mode === 'constant') startHum(); else if (mode === 'random') drone(); }, 0);
  }

  L.zen = { drone: () => drone(true), get mode() { return mode; } };

  L.os.feature({
    id: 'zen',
    isOn: (s) => modeOf(s) !== 'off',
    start(s) {
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
      setMode(modeOf(s));
    },
    update(s) { setMode(modeOf(s)); },
    stop() {
      setMode('off');
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    }
  });
})();
