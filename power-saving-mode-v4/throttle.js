(function() {
  if (window.__powerSavingInitialized) return;
  window.__powerSavingInitialized = true;

  const TARGET_FPS = 4.5; // ~4-5 frames per second (~222ms per frame)
  const FRAME_INTERVAL = 1000 / TARGET_FPS;

  const originalRAF = window.requestAnimationFrame;
  const originalCancelRAF = window.cancelAnimationFrame;

  let isThrottled = false;
  let pendingCallbacks = new Map();
  let nextHandleId = 1;
  let masterTimer = null;

  function flushFrames() {
    if (!isThrottled) return;
    const now = performance.now();
    const callbacksToRun = Array.from(pendingCallbacks.values());
    pendingCallbacks.clear();

    callbacksToRun.forEach(cb => {
      try { cb(now); } catch (e) { console.error(e); }
    });
  }

  function throttledRAF(callback) {
    if (!isThrottled) {
      return originalRAF.call(window, callback);
    }
    const id = nextHandleId++;
    pendingCallbacks.set(id, callback);
    return id;
  }

  function throttledCancelRAF(id) {
    if (pendingCallbacks.has(id)) {
      pendingCallbacks.delete(id);
    } else {
      originalCancelRAF.call(window, id);
    }
  }

  // Hidden SVG filter for heavy pixelation + color quantization (JPEG/low-bitrate compression look)
  const svgFilter = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgFilter.id = 'power-saving-svg-filter';
  svgFilter.setAttribute('style', 'position:fixed;width:0;height:0;pointer-events:none;');
  svgFilter.innerHTML = `
    <defs>
      <filter id="eco-compress-filter" x="0%" y="0%" width="100%" height="100%">
        <!-- Pixelate / downsample into chunky blocks -->
        <feFlood x="2" y="2" height="2" width="2" />
        <feComposite width="6" height="6" />
        <feTile result="a" />
        <feComposite in="SourceGraphic" in2="a" operator="in" />
        <feMorphology operator="dilate" radius="3" result="pixelated" />
        
        <!-- Posterize / crush color depth for heavy JPEG-like banding -->
        <feComponentTransfer in="pixelated" result="crushed">
          <feFuncR type="discrete" tableValues="0 0.16 0.33 0.5 0.66 0.83 1" />
          <feFuncG type="discrete" tableValues="0 0.16 0.33 0.5 0.66 0.83 1" />
          <feFuncB type="discrete" tableValues="0 0.16 0.33 0.5 0.66 0.83 1" />
        </feComponentTransfer>
      </filter>
    </defs>
  `;

  // CSS for 4-5 FPS animation stepping, nearest-neighbor scaling, and applying the compression filter
  const styleEl = document.createElement('style');
  styleEl.id = 'power-saving-css';
  styleEl.textContent = `
    html {
      filter: url(#eco-compress-filter) contrast(1.15) saturate(0.85) !important;
      image-rendering: pixelated !important;
      -webkit-font-smoothing: none !important;
      font-smooth: never !important;
    }
    img, video, canvas {
      image-rendering: pixelated !important;
      filter: blur(0.4px) contrast(1.2) !important;
    }
    *, *::before, *::after {
      animation-timing-function: steps(4, end) !important;
      transition-timing-function: steps(4, end) !important;
      scroll-behavior: auto !important;
    }
  `;

  window.addEventListener('TOGGLE_POWER_SAVING', (e) => {
    isThrottled = e.detail;

    if (isThrottled) {
      window.requestAnimationFrame = throttledRAF;
      window.cancelAnimationFrame = throttledCancelRAF;
      document.documentElement.appendChild(svgFilter);
      document.documentElement.appendChild(styleEl);
      
      if (!masterTimer) {
        masterTimer = setInterval(flushFrames, FRAME_INTERVAL);
      }
    } else {
      window.requestAnimationFrame = originalRAF;
      window.cancelAnimationFrame = originalCancelRAF;
      if (svgFilter.parentNode) {
        svgFilter.parentNode.removeChild(svgFilter);
      }
      if (styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
      if (masterTimer) {
        clearInterval(masterTimer);
        masterTimer = null;
      }
      flushFrames();
    }
  });
})();