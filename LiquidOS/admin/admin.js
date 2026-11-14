// Liquid OS admin panel: backstage controls for presenting.
// Opens in its own small window (from the "Admin" link in the Control Centre, or
// the extension's Options). It writes the same settings the product uses, plus
// the admin settings that decide whether the product is allowed to misbehave:
//
//   liquidOSAdmin = { fightBack, autoChaos, muted: [gag ids] }
//
// With both switches off, nothing happens unless you make it happen here.
const STAGE_KEY = 'liquidLifeStage', OS_KEY = 'liquidOS', ADMIN_KEY = 'liquidOSAdmin';
const OS_DEFAULTS = { a11y: false, dark: 'off', focus: false, lowPower: false, readAloud: false };
const ADMIN_DEFAULTS = { fightBack: true, autoChaos: true, muted: [] };

const STAGES = [
  ['Off', 'Liquid Life is off.'],
  ['Calm', 'Cursor wake and whirlpools.'],
  ['Wake', 'Scroll and typing waves. Ducks.'],
  ['High Seas', 'Ships and monsters. With chaos off, only what you trigger below.'],
  ['Buoyancy', 'Floating ads, sinking articles, the Dry™ store.'],
  ['Chaos', 'Rain, loose letters, everything.']
];
const FEATURES = [
  ['a11y', 'Larger Text', 'A'], ['dark', 'Dark Mode', 'D'], ['blinding', 'Light Mode', 'L'],
  ['focus', 'Focus', 'F'], ['lowPower', 'Low Power', 'E'], ['readAloud', 'Read Aloud', 'R']
];
const ACTIONS = [
  ['ships', 'Ship battle'], ['kraken', 'Kraken'], ['megalodon', 'Megalodon'],
  ['whale', 'Whale'], ['whirlpool', 'Whirlpool'], ['paywall', 'Dry™ store'],
  ['notify', 'Test alert'], ['clear', 'Clear alerts'], ['escalate', 'Chaos +1 step']
];
// gag id -> label, for the "leave out" chips
const GAGS = [
  ['cursor-wake', 'Cursor wake'], ['ambient', 'Random drops'], ['whirlpool', 'Whirlpool'],
  ['scroll-slosh', 'Scroll waves'], ['typing-drips', 'Typing drips'], ['ducks', 'Ducks'],
  ['ships', 'Ships'], ['buoyancy', 'Buoyancy'], ['business', 'Dry™ store & damage'],
  ['notifications', 'Random alerts']
];

let stage = 1, settings = { ...OS_DEFAULTS }, admin = { ...ADMIN_DEFAULTS };
const $ = (id) => document.getElementById(id);
const save = (obj) => chrome.storage.local.set(obj);
const isOn = (id) => id === 'dark' ? settings.dark === 'torch' : id === 'blinding' ? settings.dark === 'blinding' : !!settings[id];

function button(label, cls, onClick) {
  const b = document.createElement('button');
  b.textContent = label;
  if (cls) b.className = cls;
  b.addEventListener('click', onClick);
  return b;
}

function render() {
  $('fightBack').checked = admin.fightBack;
  $('autoChaos').checked = admin.autoChaos;
  $('modeNote').textContent = !admin.fightBack && !admin.autoChaos
    ? 'Isolation: nothing changes unless you change it here.'
    : admin.fightBack && admin.autoChaos ? 'Product behaviour: it fights back and escalates.'
      : admin.fightBack ? 'It fights back, but nothing starts by itself.' : 'It escalates by itself, but every switch is obeyed.';

  $('stages').replaceChildren(...STAGES.map(([name], i) => {
    const b = button(String(i), i === stage ? 'on' : '', () => save({ [STAGE_KEY]: i }));
    b.title = name; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(i === stage)); b.setAttribute('aria-label', name);
    return b;
  }));
  $('stageHint').textContent = `${STAGES[stage][0]}: ${STAGES[stage][1]}`;

  $('tiles').replaceChildren(...FEATURES.map(([id, name, key]) => {
    const on = isOn(id);
    const b = button('', 'tile' + (on ? ' on' : ''), () => {
      const next = { ...settings };
      if (id === 'dark') next.dark = on ? 'off' : 'torch';
      else if (id === 'blinding') next.dark = on ? 'off' : 'blinding';
      else next[id] = !on;
      save({ [OS_KEY]: next });
    });
    b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(on));
    const text = document.createElement('span');
    const n = document.createElement('div'); n.className = 'name'; n.textContent = name;
    const s = document.createElement('div'); s.className = 'sub'; s.textContent = `${on ? 'On' : 'Off'} · Alt+Shift+${key}`;
    text.append(n, s); b.append(text);
    return b;
  }));

  $('mutes').replaceChildren(...GAGS.map(([id, label]) => {
    const off = admin.muted.includes(id);
    const b = button(label, off ? 'off' : '', () => {
      const muted = off ? admin.muted.filter((m) => m !== id) : admin.muted.concat(id);
      save({ [ADMIN_KEY]: { ...admin, muted } });
    });
    b.setAttribute('aria-pressed', String(off));
    b.title = off ? 'Left out. Click to bring back.' : 'Click to leave this out.';
    return b;
  }));
}

// Send a command to the page the audience is looking at: the active tab of each
// ordinary browser window (this panel lives in its own popup window).
async function sendToPage(cmd) {
  const tabs = await chrome.tabs.query({ active: true, windowType: 'normal' });
  for (const tab of tabs) {
    try { await chrome.tabs.sendMessage(tab.id, { to: 'liquid-os-page', cmd }); } catch (e) { /* no Liquid OS on that page */ }
  }
}

$('actions').replaceChildren(...ACTIONS.map(([cmd, label]) => button(label, '', () => sendToPage(cmd))));
$('fightBack').addEventListener('change', (e) => save({ [ADMIN_KEY]: { ...admin, fightBack: e.target.checked } }));
$('autoChaos').addEventListener('change', (e) => save({ [ADMIN_KEY]: { ...admin, autoChaos: e.target.checked } }));

// "Everything off" turns the product off but leaves the two switches alone, so if
// fighting back is on, it will come back. That is the thing being demonstrated.
$('allOff').addEventListener('click', () => save({ [STAGE_KEY]: 0, [OS_KEY]: { ...OS_DEFAULTS } }));
$('reset').addEventListener('click', () => save({ [STAGE_KEY]: 1, [OS_KEY]: { ...OS_DEFAULTS }, [ADMIN_KEY]: { ...ADMIN_DEFAULTS } }));

const readAdmin = (v) => ({ ...ADMIN_DEFAULTS, ...(v || {}), muted: Array.isArray(v && v.muted) ? v.muted : [] });

chrome.storage.local.get([STAGE_KEY, OS_KEY, ADMIN_KEY]).then((got) => {
  if (typeof got[STAGE_KEY] === 'number') stage = Math.min(5, Math.max(0, got[STAGE_KEY]));
  settings = { ...OS_DEFAULTS, ...(got[OS_KEY] || {}) };
  admin = readAdmin(got[ADMIN_KEY]);
  render();
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STAGE_KEY]) stage = Math.min(5, Math.max(0, changes[STAGE_KEY].newValue));
  if (changes[OS_KEY]) settings = { ...OS_DEFAULTS, ...(changes[OS_KEY].newValue || {}) };
  if (changes[ADMIN_KEY]) admin = readAdmin(changes[ADMIN_KEY].newValue);
  render();
});
