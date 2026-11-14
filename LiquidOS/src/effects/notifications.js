// Notifications (stage 4+): helpful updates from the operating system. Each one
// also belly-flops into the water, so it disturbs whatever you were reading twice.
(() => {
  const L = window.Liquid;
  const NOTES = [
    ['Hydration', 'This page is now 47% wet.'],
    ['Legibility', 'Contrast has been courageously removed.'],
    ['Software Update', 'Liquid Life 26.1 is ready to install. It fixes nothing.'],
    ['Accessibility', '"Reduce Motion" has been renamed to "Give Up".'],
    ['Screen Time', 'You have spent 3 minutes trying to click one button.'],
    ['Assistant', 'Here is what I found on the web for "why is my screen damp".'],
    ['Privacy', 'We can see right through you. It is water.'],
    ['Battery', 'Rendering water uses significant energy. We think it is worth it.'],
    ['Tip', 'Try reading faster, before the next wave.'],
    ['LiquidCare+', 'Liquid damage is not covered by your warranty.'],
    ['Weather', 'Rain expected in your browser for the next: forever.'],
    ['Find My', 'Your cursor was last seen somewhere over there.']
  ];
  let timer = 0, deck = [];

  function next() {
    const chaos = L.stage >= L.CHAOS;
    timer = setTimeout(() => {
      if (L.admin.autoChaos && !document.hidden) {
        if (!deck.length) deck = NOTES.slice().sort(() => Math.random() - 0.5);
        const [title, body] = deck.pop();
        L.util.toast(title, body);
      }
      next();
    }, (chaos ? 5000 : 11000) * L.util.rand(0.7, 1.3));
  }

  L.gag({
    id: 'notifications',
    min: 4,
    start() { next(); },
    stop() { clearTimeout(timer); },
    onStage() { clearTimeout(timer); next(); } // re-time when the stage changes
  });
})();
