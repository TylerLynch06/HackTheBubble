function playDroningBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    // Droning low frequency tone
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);

    // Keep volume low/subtle
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 2.0); // Plays for 2 seconds
  } catch (e) {
    // Browsers block audio until there is page interaction
  }
}

function scheduleNextBeep() {
  // Random time between 2 and 5 minutes (in milliseconds)
  const randomDelay = Math.random() * (300000 - 120000) + 120000;
  setTimeout(() => {
    playDroningBeep();
    scheduleNextBeep();
  }, randomDelay);
}

scheduleNextBeep();