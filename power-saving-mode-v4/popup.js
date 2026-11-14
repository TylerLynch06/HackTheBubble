const toggleBtn = document.getElementById('toggleBtn');
const statusText = document.getElementById('status');

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function updateUI(isEnabled) {
  if (isEnabled) {
    toggleBtn.textContent = 'Disable Eco Mode';
    toggleBtn.className = 'on';
    statusText.textContent = '~4-5 FPS + Heavy Compression (Active)';
  } else {
    toggleBtn.textContent = 'Enable Eco Mode';
    toggleBtn.className = 'off';
    statusText.textContent = '~4-5 FPS + Heavy Compression (Inactive)';
  }
}

(async () => {
  const tab = await getCurrentTab();
  const key = `eco_${tab.id}`;
  const data = await chrome.storage.session.get(key);
  updateUI(!!data[key]);
})();

toggleBtn.addEventListener('click', async () => {
  const tab = await getCurrentTab();
  const key = `eco_${tab.id}`;
  const data = await chrome.storage.session.get(key);
  const newState = !data[key];

  await chrome.storage.session.set({ [key]: newState });
  updateUI(newState);

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['throttle.js'],
    world: 'MAIN'
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (state) => {
      window.dispatchEvent(new CustomEvent('TOGGLE_POWER_SAVING', { detail: state }));
    },
    args: [newState],
    world: 'MAIN'
  });
});