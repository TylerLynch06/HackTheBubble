
const statusEl = document.getElementById("status");
const speedEl = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");

speedEl.addEventListener("input", () => {
    speedValue.textContent = `${speedEl.value}×`;
});

async function send(action, extra = {}) {
    const response = await chrome.runtime.sendMessage({
        action,
        ...extra
    });

    if (response?.error) {
        throw new Error(response.error);
    }

    return response;
}

async function startReading() {
    statusEl.textContent = "Extracting page text...";

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        if (!tab || !tab.id) {
            throw new Error("No active tab found.");
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const clone = document.body.cloneNode(true);

                clone.querySelectorAll(
                    "script, style, noscript, nav, footer, header, aside, form, button, input, textarea, select, [aria-hidden='true']"
                ).forEach(el => el.remove());

                return (clone.innerText || clone.textContent || "")
                    .replace(/\s+/g, " ")
                    .trim();
            }
        });

        const text = results?.[0]?.result || "";

        if (text.length < 2) {
            throw new Error("No readable text found.");
        }

        await send("start", {
            text: text,
            rate: Number(speedEl.value)
        });

        statusEl.textContent = `Reading ${text.length} characters.`;

    } catch (error) {
        statusEl.textContent = error.message;
        console.error(error);
    }
}

document.getElementById("read").addEventListener("click", startReading);

document.getElementById("pause").addEventListener("click", async () => {
    await send("pause");
    statusEl.textContent = "Paused.";
});

document.getElementById("resume").addEventListener("click", async () => {
    await send("resume");
    statusEl.textContent = "Resumed.";
});

document.getElementById("stop").addEventListener("click", async () => {
    await send("stop");
    statusEl.textContent = "Stopped.";
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startReading);
} else {
    startReading();
}