// Service worker: panic shortcut (Alt+Shift+L) and the toolbar badge.
const KEY = 'liquid';

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'toggle-liquid') return;
  const { [KEY]: s = {} } = await chrome.storage.local.get(KEY);
  await chrome.storage.local.set({ [KEY]: { ...s, enabled: !(s.enabled ?? true) } });
});

async function badge() {
  const { [KEY]: s = {} } = await chrome.storage.local.get(KEY);
  const on = s.enabled ?? true;
  chrome.action.setBadgeText({ text: on ? '💧' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#5ac8fa' });
}

chrome.runtime.onInstalled.addListener(badge);
chrome.runtime.onStartup.addListener(badge);
chrome.storage.onChanged.addListener((c, area) => { if (area === 'local' && c[KEY]) badge(); });
