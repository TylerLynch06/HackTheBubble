chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle') {
    chrome.storage.sync.get({ enabled: true }, ({ enabled }) => chrome.storage.sync.set({ enabled: !enabled }));
  } else if (cmd === 'toggle-mode') {
    chrome.storage.sync.get({ mode: 'dark' }, ({ mode }) =>
      chrome.storage.sync.set({ mode: mode === 'dark' ? 'bright' : 'dark', enabled: true }));
  }
});
