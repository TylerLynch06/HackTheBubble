const DEFAULTS = {
  enabled: true, scale: 250, bold: false, spacing: false, theme: 'off',
  links: false, still: false, bigCursor: false, disabledHosts: []
};
const $ = (id) => document.getElementById(id);
let s = { ...DEFAULTS }, host = null;

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  try { host = new URL(tab.url).hostname; } catch { host = null; }
  render();
});
chrome.storage.sync.get(DEFAULTS, (v) => { s = { ...DEFAULTS, ...v }; render(); });
chrome.storage.onChanged.addListener((ch) => { for (const k in ch) s[k] = ch[k].newValue; render(); });

function render() {
  $('enabled').checked = s.enabled;
  $('scale').value = s.scale;
  $('scale-o').textContent = s.scale + '%';
  $('preview').style.fontSize = Math.min(64, (17 * s.scale) / 100) + 'px';
  document.querySelectorAll('.presets button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.v === s.scale)));
  document.querySelectorAll('.themes button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === s.theme)));
  for (const k of ['bold', 'spacing', 'links', 'still', 'bigCursor']) $(k).checked = s[k];
  const b = $('site');
  if (!host) { b.textContent = 'Not available on this page'; b.disabled = true; return; }
  b.textContent = s.disabledHosts.includes(host) ? `Turn on for ${host}` : `Turn off for ${host}`;
}
function save(p) { Object.assign(s, p); chrome.storage.sync.set(p); render(); }

$('enabled').addEventListener('change', (e) => save({ enabled: e.target.checked }));
$('scale').addEventListener('input', (e) => save({ scale: +e.target.value, enabled: true }));
document.querySelectorAll('.presets button').forEach((b) => b.addEventListener('click', () => save({ scale: +b.dataset.v, enabled: true })));
document.querySelectorAll('.themes button').forEach((b) => b.addEventListener('click', () => save({ theme: b.dataset.t, enabled: true })));
for (const k of ['bold', 'spacing', 'links', 'still', 'bigCursor']) $(k).addEventListener('change', (e) => save({ [k]: e.target.checked, enabled: true }));
$('site').addEventListener('click', () => {
  const l = new Set(s.disabledHosts);
  l.has(host) ? l.delete(host) : l.add(host);
  save({ disabledHosts: [...l] });
});
