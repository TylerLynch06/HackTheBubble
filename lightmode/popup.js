const DEFAULTS = {
  enabled: true, mode: 'dark', radius: 150, softness: 55, darkness: 100,
  intensity: 85, warm: true, hideCursor: false, disabledHosts: []
};
const fmt = { radius: (v) => v + ' px', softness: (v) => v + '%', darkness: (v) => v + '%', intensity: (v) => v + '%' };
const $ = (id) => document.getElementById(id);
let s = { ...DEFAULTS }, host = null;

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  try { host = new URL(tab.url).hostname; } catch { host = null; }
  render();
});
chrome.storage.sync.get(DEFAULTS, (v) => { s = { ...DEFAULTS, ...v }; render(); });
chrome.storage.onChanged.addListener((ch) => { for (const k in ch) s[k] = ch[k].newValue; render(); });

function render() {
  for (const k of ['radius', 'softness', 'darkness', 'intensity']) { $(k).value = s[k]; $(k + '-o').textContent = fmt[k](s[k]); }
  for (const k of ['enabled', 'warm', 'hideCursor']) $(k).checked = s[k];
  const bright = s.mode === 'bright';
  document.body.dataset.mode = s.mode;
  $('mode-dark').setAttribute('aria-pressed', String(!bright));
  $('mode-bright').setAttribute('aria-pressed', String(bright));
  for (const id of ['row-dark', 'darkness', 'row-warm']) $(id).hidden = bright;
  for (const id of ['row-bright', 'intensity', 'warn']) $(id).hidden = !bright;
  const b = $('site');
  if (!host) { b.textContent = 'Not available on this page'; b.disabled = true; return; }
  b.textContent = s.disabledHosts.includes(host) ? `Turn on for ${host}` : `Turn off for ${host}`;
}
function save(p) { Object.assign(s, p); chrome.storage.sync.set(p); render(); }

for (const k of ['radius', 'softness', 'darkness', 'intensity']) $(k).addEventListener('input', (e) => save({ [k]: +e.target.value }));
for (const k of ['enabled', 'warm', 'hideCursor']) $(k).addEventListener('change', (e) => save({ [k]: e.target.checked }));
$('site').addEventListener('click', () => {
  const l = new Set(s.disabledHosts);
  l.has(host) ? l.delete(host) : l.add(host);
  save({ disabledHosts: [...l] });
});
document.addEventListener('pointermove', (e) => {
  document.body.style.setProperty('--mx', e.clientX + 'px');
  document.body.style.setProperty('--my', e.clientY + 'px');
});

$('mode-dark').addEventListener('click', () => save({ mode: 'dark' }));
$('mode-bright').addEventListener('click', () => save({ mode: 'bright' }));
