// Liquid OS background worker. Two jobs:
//
// 1. Read Aloud: speaks the text a tab sends, using Chrome's text-to-speech.
//
// 2. The cascade: Liquid OS features helpfully switch each other on. Turning on
//    Low Power Mode turns on Read Aloud and Dark Mode; Dark Mode turns on Larger
//    Text; Larger Text turns on Focus. This lives here, rather than in the page,
//    so it happens once however many tabs are open. Each step leaves a notice in
//    storage, which the visible tab shows as a notification.
//    Turning a feature OFF never cascades: the switches themselves are honest.

const KEY = 'liquidOS', NOTICE = 'liquidOSNotice';
const STEP_MS = 1500;

// feature turned on -> [setting, value, notification title, notification body]
const CASCADE = {
  lowPower: [
    ['readAloud', true, 'Low Power Mode', 'To rest your display, Read Aloud has been turned on.'],
    ['dark', 'torch', 'Low Power Mode', 'To save energy, Dark Mode has been turned on.']
  ],
  dark: [['a11y', true, 'Dark Mode', 'To keep text legible in the dark, Larger Text has been turned on.']],
  a11y: [['focus', true, 'Larger Text', 'To make room for larger text, Focus has removed the rest of the page.']],
  readAloud: [['lowPower', true, 'Read Aloud', 'Speech uses significant energy. Low Power Mode has been turned on.']]
};

const isOn = (settings, id) => !!settings && !!settings[id] && settings[id] !== 'off';

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[KEY]) return;
  const before = changes[KEY].oldValue || {}, after = changes[KEY].newValue || {};
  let step = 0;
  for (const id of Object.keys(CASCADE)) {
    if (isOn(before, id) || !isOn(after, id)) continue; // only when something was just switched on
    for (const [dep, value, title, body] of CASCADE[id]) {
      if (isOn(after, dep)) continue;
      setTimeout(async () => {
        const now = (await chrome.storage.local.get(KEY))[KEY] || {};
        if (!isOn(now, id) || isOn(now, dep)) return; // the user changed their mind in the meantime
        await chrome.storage.local.set({ [KEY]: { ...now, [dep]: value }, [NOTICE]: { title, body, t: Date.now() } });
      }, STEP_MS * ++step);
    }
  }
});

// ---------- Read Aloud ----------
let chunks = [], index = 0, rate = 8.5, reading = false;

function splitText(text, max = 2500) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const out = [];
  let current = '';
  for (const sentence of sentences) {
    const part = sentence.trim();
    if (!part) continue;
    if ((current + ' ' + part).trim().length > max && current) { out.push(current); current = part; }
    else current = (current + ' ' + part).trim();
    while (current.length > max) { out.push(current.slice(0, max)); current = current.slice(max); }
  }
  if (current) out.push(current);
  return out;
}

function speakNext() {
  if (!reading) return;
  if (index >= chunks.length) { reading = false; return; }
  chrome.tts.speak(chunks[index], {
    rate,
    enqueue: false,
    onEvent: (event) => {
      if (event.type === 'end' || event.type === 'error') { index++; speakNext(); }
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.to !== 'liquid-os-tts') return;
  if (message.action === 'start') {
    chrome.tts.stop();
    chunks = splitText(message.text || '');
    index = 0;
    rate = Math.max(0.1, Math.min(10, Number(message.rate) || 8.5));
    reading = chunks.length > 0;
    speakNext();
  } else if (message.action === 'stop') {
    reading = false; chunks = []; index = 0;
    chrome.tts.stop();
  }
  sendResponse({ ok: true });
});
