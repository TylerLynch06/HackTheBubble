// Read Aloud. Reads the page to you at 8.5 times normal speed, so you can get
// through a whole article in the time it takes to wonder what is happening.
// Originally the Rapid Page Reader extension.
//
// The speaking is done by the background worker (src/background.js) using
// Chrome's built-in text-to-speech; this file just hands it the page's text.
// Only the tab you are looking at reads, so ten open tabs don't talk at once.
(() => {
  const L = window.Liquid;
  const RATE = 8.5;
  const MAX_CHARS = 15000;
  let on = false, speaking = false;

  const send = (msg) => { try { chrome.runtime.sendMessage({ to: 'liquid-os-tts', ...msg }, () => void chrome.runtime.lastError); } catch (e) { /* no extension */ } };

  function begin() {
    if (!on || speaking || document.hidden) return;
    const source = document.querySelector('article, main, [role="main"]') || document.body;
    const text = (source.innerText || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
    if (!text) return;
    speaking = true;
    send({ action: 'start', text, rate: RATE });
  }

  function end() {
    if (speaking) send({ action: 'stop' });
    speaking = false;
  }

  function onVisibility() { if (document.hidden) end(); else begin(); }

  L.os.feature({
    id: 'readAloud',
    isOn: (s) => !!s.readAloud,
    start() {
      on = true;
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', end);
      begin();
    },
    stop() {
      on = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', end);
      end();
    }
  });
})();
