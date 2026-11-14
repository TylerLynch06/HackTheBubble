const STEP = 25, MIN = 100, MAX = 500;
chrome.commands.onCommand.addListener((cmd) => {
  chrome.storage.sync.get({ enabled: true, scale: 250 }, ({ enabled, scale }) => {
    if (cmd === 'toggle') chrome.storage.sync.set({ enabled: !enabled });
    else if (cmd === 'bigger') chrome.storage.sync.set({ enabled: true, scale: Math.min(MAX, scale + STEP) });
    else if (cmd === 'smaller') chrome.storage.sync.set({ enabled: true, scale: Math.max(MIN, scale - STEP) });
  });
});
