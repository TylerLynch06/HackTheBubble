let chunks = [];
let currentIndex = 0;
let currentRate = 8.5;
let isPaused = false;
let isReading = false;

function splitText(text, maxLength = 2500) {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const result = [];
  let current = "";
  for (const sentence of sentences) {
    const part = sentence.trim();
    if (!part) continue;
    if ((current + " " + part).trim().length > maxLength && current) {
      result.push(current);
      current = part;
    } else {
      current = (current + " " + part).trim();
    }
    while (current.length > maxLength) {
      result.push(current.slice(0, maxLength));
      current = current.slice(maxLength);
    }
  }
  if (current) result.push(current);
  return result;
}

function speakNext() {
  if (!isReading || isPaused) return;
  if (currentIndex >= chunks.length) {
    isReading = false;
    return;
  }

  const utterance = chunks[currentIndex];
  chrome.tts.speak(utterance, {
    rate: currentRate,
    enqueue: false,
    onEvent: event => {
      if (event.type === "end") {
        currentIndex++;
        speakNext();
      } else if (event.type === "error") {
        currentIndex++;
        speakNext();
      }
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case "start":
        chrome.tts.stop();
        chunks = splitText(message.text || "");
        currentIndex = 0;
        currentRate = Math.max(0.1, Math.min(10, Number(message.rate) || 8.5));
        isPaused = false;
        isReading = chunks.length > 0;
        speakNext();
        sendResponse({ ok: true, chunks: chunks.length });
        break;
      case "pause":
        chrome.tts.pause();
        isPaused = true;
        sendResponse({ ok: true });
        break;
      case "resume":
        isPaused = false;
        chrome.tts.resume();
        if (isReading) speakNext();
        sendResponse({ ok: true });
        break;
      case "stop":
        isReading = false;
        isPaused = false;
        chunks = [];
        currentIndex = 0;
        chrome.tts.stop();
        sendResponse({ ok: true });
        break;
      default:
        sendResponse({ error: "Unknown action." });
    }
  } catch (error) {
    sendResponse({ error: error.message || "Text-to-speech failed." });
  }
  return true;
});
