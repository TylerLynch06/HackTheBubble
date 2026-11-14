// Liquid OS Control Centre. It only reads and writes settings in chrome.storage;
// every tab's content script reacts to the change. The switches are honest:
// what you see here is the real state, and off means off.
const STAGE_KEY = 'liquidLifeStage', OS_KEY = 'liquidOS';
const DEFAULTS = { a11y: false, dark: 'off', focus: false, lowPower: false, readAloud: false };

const STAGES = [
  ['Off', 'Liquid Life is off. The web is dry.'],
  ['Calm', 'Cursor wake and whirlpools. Stir five laps to open one.'],
  ['Wake', 'Scrolling and typing make waves. Ducks arrive.'],
  ['High Seas', 'Ships, a kraken, a megalodon and a whale.'],
  ['Buoyancy', 'Ads float, articles sink. Liquid Life Dry™ is offered.'],
  ['Chaos', 'Rain. Letters come loose. Everything at once.']
];

const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const FEATURES = [
  { id: 'a11y', name: 'Larger Text', key: 'A', on: 'On · 250%', icon: icon('<path d="M4 19 9.5 5h1L16 19M6 14h8M17 19l2.5-7h.5l2.5 7M18 17h4"/>') },
  { id: 'dark', name: 'Dark Mode', key: 'D', on: 'On', icon: icon('<path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/>') },
  { id: 'blinding', name: 'Light Mode', key: 'L', on: 'On · Maximum', icon: icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>') },
  { id: 'focus', name: 'Focus', key: 'F', on: 'On · 1 item', icon: icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>') },
  { id: 'lowPower', name: 'Low Power', key: 'E', on: 'On · 4 fps', icon: icon('<rect x="3" y="8" width="16" height="9" rx="2.5"/><path d="M21.5 11v3M6 11v3"/>') },
  { id: 'readAloud', name: 'Read Aloud', key: 'R', on: 'On · 8.5×', icon: icon('<path d="M4 10v4h3l4 3.5v-11L7 10H4ZM15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10"/>') }
];

const ACTIONS = [
  ['ships', 'Ships', 'Alt+S'], ['kraken', 'Kraken', 'Alt+K'], ['megalodon', 'Megalodon', 'Alt+M'],
  ['whale', 'Whale', 'Alt+H'], ['whirlpool', 'Whirlpool', 'Alt+W'], ['paywall', 'Dry™ Store', 'Alt+P']
];

let stage = 1, settings = { ...DEFAULTS };

const isOn = (id) => id === 'dark' ? settings.dark === 'torch' : id === 'blinding' ? settings.dark === 'blinding' : !!settings[id];

function toggle(id) {
  const next = { ...settings };
  if (id === 'dark') next.dark = settings.dark === 'torch' ? 'off' : 'torch';
  else if (id === 'blinding') next.dark = settings.dark === 'blinding' ? 'off' : 'blinding';
  else next[id] = !settings[id];
  chrome.storage.local.set({ [OS_KEY]: next });
}

function render() {
  document.getElementById('stageName').textContent = STAGES[stage][0];
  document.getElementById('stageHint').textContent = STAGES[stage][1];

  const seg = document.getElementById('stages');
  seg.replaceChildren(...STAGES.map(([name], i) => {
    const b = document.createElement('button');
    b.textContent = String(i);
    b.title = `${name} (Alt+${i})`;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === stage));
    b.setAttribute('aria-label', name);
    if (i === stage) b.className = 'on';
    b.addEventListener('click', () => chrome.storage.local.set({ [STAGE_KEY]: i }));
    return b;
  }));

  const tiles = document.getElementById('tiles');
  tiles.replaceChildren(...FEATURES.map((f) => {
    const on = isOn(f.id);
    const b = document.createElement('button');
    b.className = 'tile' + (on ? ' on' : '');
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(on));
    b.title = `Alt+Shift+${f.key}`;
    const ic = document.createElement('span');
    ic.className = 'icon';
    ic.innerHTML = f.icon; // static markup defined above, never page content
    const text = document.createElement('span');
    const name = document.createElement('div'); name.className = 'name'; name.textContent = f.name;
    const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = on ? f.on : 'Off';
    text.append(name, sub);
    b.append(ic, text);
    b.addEventListener('click', () => toggle(f.id));
    return b;
  }));
}

async function sendToPage(cmd) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try { await chrome.tabs.sendMessage(tab.id, { to: 'liquid-os-page', cmd }); } catch (e) { /* page has no Liquid OS (chrome:// etc) */ }
}

document.getElementById('actions').replaceChildren(...ACTIONS.map(([cmd, label, key]) => {
  const b = document.createElement('button');
  b.textContent = label;
  const small = document.createElement('small'); small.textContent = key;
  b.appendChild(small);
  b.addEventListener('click', () => sendToPage(cmd));
  return b;
}));

// Backstage: the admin panel opens in its own small window so it can sit beside the demo.
document.getElementById('admin').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.windows.create({ url: chrome.runtime.getURL('admin/admin.html'), type: 'popup', width: 470, height: 860 });
});

document.getElementById('allOff').addEventListener('click', () => {
  chrome.storage.local.set({ [STAGE_KEY]: 0, [OS_KEY]: { ...DEFAULTS } });
});

chrome.storage.local.get([STAGE_KEY, OS_KEY]).then((got) => {
  if (typeof got[STAGE_KEY] === 'number') stage = Math.min(5, Math.max(0, got[STAGE_KEY]));
  settings = { ...DEFAULTS, ...(got[OS_KEY] || {}) };
  render();
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STAGE_KEY]) stage = Math.min(5, Math.max(0, changes[STAGE_KEY].newValue));
  if (changes[OS_KEY]) settings = { ...DEFAULTS, ...(changes[OS_KEY].newValue || {}) };
  render();
});
