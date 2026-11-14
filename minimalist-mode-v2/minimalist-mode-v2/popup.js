const btn = document.getElementById('toggleBtn');

chrome.storage.local.get({ enabled: true }, (data) => {
  updateButton(data.enabled);
});

btn.addEventListener('click', () => {
  chrome.storage.local.get({ enabled: true }, (data) => {
    const newState = !data.enabled;
    chrome.storage.local.set({ enabled: newState }, () => {
      updateButton(newState);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.reload(tabs[0].id);
      });
    });
  });
});

function updateButton(enabled) {
  btn.textContent = enabled ? 'Enabled' : 'Disabled';
  btn.className = enabled ? '' : 'off';
}
