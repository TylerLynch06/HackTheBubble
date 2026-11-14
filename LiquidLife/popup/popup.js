// Stage picker. Writes the stage to storage; every tab's content script reacts.
const KEY = 'liquidLifeStage';
const STAGES = ['Dry (off)', 'Calm', 'Wake', 'High Seas', 'Buoyancy', 'Chaos'];
const box = document.getElementById('stages');

function render(current) {
  box.replaceChildren(...STAGES.map((name, i) => {
    const b = document.createElement('button');
    if (i === current) b.className = 'on';
    const label = document.createElement('span');
    label.textContent = `${i} · ${name}`;
    const key = document.createElement('kbd');
    key.textContent = `Alt+${i}`;
    b.append(label, key);
    b.addEventListener('click', () => chrome.storage.local.set({ [KEY]: i }));
    return b;
  }));
}

chrome.storage.local.get(KEY).then((got) => render(typeof got[KEY] === 'number' ? got[KEY] : 1));
chrome.storage.onChanged.addListener((changes) => { if (changes[KEY]) render(changes[KEY].newValue); });
