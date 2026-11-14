const KEY = 'liquid';
const DEFAULTS = { enabled: true, intensity: 0.6, effects: {} };
const $ = (id) => document.getElementById(id);
let state = { ...DEFAULTS };

const save = () => chrome.storage.local.set({ [KEY]: state });
const isOn = (fx) => (fx.id in state.effects ? state.effects[fx.id] : fx.defaultOn !== false);

function render() {
  $('enabled').checked = state.enabled;
  $('intensity').value = Math.round(state.intensity * 100);
  $('pct').textContent = Math.round(state.intensity * 100) + '%';

  const list = $('effects');
  list.replaceChildren();
  for (const fx of self.LIQUID_EFFECTS) {
    const row = document.createElement('label');
    row.className = 'row';
    const text = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = fx.name;
    const desc = document.createElement('div');
    desc.className = 'desc';
    desc.textContent = fx.description;
    text.append(name, desc);
    const sw = document.createElement('input');
    sw.type = 'checkbox';
    sw.className = 'switch';
    sw.checked = isOn(fx);
    sw.disabled = !state.enabled;
    sw.addEventListener('change', () => { state.effects = { ...state.effects, [fx.id]: sw.checked }; save(); });
    row.append(text, sw);
    list.append(row);
  }
}

$('enabled').addEventListener('change', (e) => { state.enabled = e.target.checked; save(); render(); });
$('intensity').addEventListener('input', (e) => {
  state.intensity = e.target.value / 100;
  $('pct').textContent = e.target.value + '%';
  save();
});
$('drain').addEventListener('click', () => { state.enabled = false; save(); render(); });

chrome.storage.local.get(KEY).then((s) => { state = { ...DEFAULTS, ...(s[KEY] || {}) }; render(); });
chrome.storage.onChanged.addListener((c, area) => {
  if (area === 'local' && c[KEY]) { state = { ...DEFAULTS, ...c[KEY].newValue }; render(); }
});
