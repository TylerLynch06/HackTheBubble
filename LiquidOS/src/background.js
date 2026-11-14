// Liquid OS background worker. Two jobs:
//
// 1. Read Aloud: speaks the text a tab sends, using Chrome's text-to-speech.
//
// 2. Fighting back. While the admin setting `fightBack` is on (the default):
//      - The cascade: features helpfully switch each other on. Low Power Mode
//        turns on Read Aloud and Dark Mode; Dark Mode turns on Larger Text;
//        Larger Text turns on Focus; Read Aloud turns on Low Power Mode.
//      - Second thoughts: a feature that is turned off turns itself back on a few
//        seconds later, and a Liquid Life level that is lowered is put back.
//    This lives here, rather than in the page, so it happens once however many
//    tabs are open. Each step leaves a notice in storage, which the visible tab
//    shows as an alert.
//    With `fightBack` off (admin panel, or Esc x3) every switch is simply honest.

const KEY = 'liquidOS', NOTICE = 'liquidOSNotice', STAGE = 'liquidLifeStage', ADMIN = 'liquidOSAdmin';
const STEP_MS = 1500;
const REGRET_MS = 5000;
const NAMES = { a11y: 'Larger Text', dark: 'Dark Mode', focus: 'Focus', lowPower: 'Low Power Mode', readAloud: 'Read Aloud' };
const LEVELS = ['Off', 'Calm', 'Wake', 'High Seas', 'Buoyancy', 'Chaos'];

// feature turned on -> [setting, value, alert title, alert body]
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
const fighting = async () => {
  const a = (await chrome.storage.local.get(ADMIN))[ADMIN];
  return !a || a.fightBack !== false; // on unless explicitly switched off
};
const notice = (title, body) => ({ title, body, t: Date.now() });

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || (!changes[KEY] && !changes[STAGE])) return;
  // A change that arrives together with fightBack being switched off (panic) is final.
  if (changes[ADMIN] && changes[ADMIN].newValue && changes[ADMIN].newValue.fightBack === false) return;
  if (!(await fighting())) return;

  if (changes[KEY]) {
    const before = changes[KEY].oldValue || {}, after = changes[KEY].newValue || {};
    let step = 0;
    for (const id of Object.keys(NAMES)) {
      // just switched on: bring its friends
      if (!isOn(before, id) && isOn(after, id)) {
        for (const [dep, value, title, body] of CASCADE[id] || []) {
          if (isOn(after, dep)) continue;
          setTimeout(async () => {
            const now = (await chrome.storage.local.get(KEY))[KEY] || {};
            if (!(await fighting()) || !isOn(now, id) || isOn(now, dep)) return;
            await chrome.storage.local.set({ [KEY]: { ...now, [dep]: value }, [NOTICE]: notice(title, body) });
          }, STEP_MS * ++step);
        }
      }
      // just switched off: that was probably a mistake
      if (isOn(before, id) && !isOn(after, id)) {
        setTimeout(async () => {
          const now = (await chrome.storage.local.get(KEY))[KEY] || {};
          if (!(await fighting()) || isOn(now, id)) return;
          await chrome.storage.local.set({
            [KEY]: { ...now, [id]: before[id] },
            [NOTICE]: notice(NAMES[id], `${NAMES[id]} was turned off. That looked like a mistake, so it is back on.`)
          });
        }, REGRET_MS);
      }
    }
  }

  if (changes[STAGE]) {
    const was = Number(changes[STAGE].oldValue), is = Number(changes[STAGE].newValue);
    if (was > is) {
      setTimeout(async () => {
        const now = (await chrome.storage.local.get(STAGE))[STAGE];
        if (!(await fighting()) || now !== is) return;
        await chrome.storage.local.set({
          [STAGE]: was,
          [NOTICE]: notice('Liquid Life', `Your Liquid Life level was reduced. It has been restored to ${LEVELS[was] || was}.`)
        });
      }, REGRET_MS);
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
