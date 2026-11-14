let isEnabled = true;

chrome.storage.local.get({ enabled: true }, (data) => {
  isEnabled = data.enabled;
  if (isEnabled) {
    injectBaseCSS();
    isolateTopResult();
  }
});

// Inject CSS immediately at document_start to hide all clutter & extra results before paint
function injectBaseCSS() {
  if (document.getElementById('minimalist-mode-style')) return;
  const style = document.createElement('style');
  style.id = 'minimalist-mode-style';
  style.textContent = `
    /* Hide ads, right sidebar, AI overviews, People Also Ask, related searches, carousels, footer, extra tabs */
    #tads, #bottomads, #rhs, #botstuff, #taw, #appbar, #extabar, #top_nav,
    #fbar, #sfooter, footer, .related-question-pair, g-scrolling-carousel,
    .kp-blk, .VjDLd, .ifM9ad, #OICR, div[data-attrid="wa:/description"],
    #not-top-stuff, div[jsname="N760b"], div[data-mcpr], .ULSxyf, .g-blk {
      display: none !important;
    }

    /* Hide all children of #rso by default until JS marks the single winner */
    #rso > * {
      display: none !important;
    }

    /* Reveal ONLY the marked top result */
    #rso > [data-minimalist-winner="true"],
    [data-minimalist-winner="true"] {
      display: block !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function isOrganicResult(el) {
  if (!el || el.nodeType !== 1) return false;
  // Must contain a main result title (h3) and a standard external link (a[href^="http"])
  const h3 = el.querySelector('h3');
  const link = el.querySelector('a[href^="http"]');
  if (!h3 || !link) return false;

  // Exclude Google internal/special widgets: People Also Ask, AI Overviews, Ads, Videos/Images carousels
  if (el.closest('#tads, #bottomads, #rhs, #taw')) return false;
  if (el.querySelector('.related-question-pair, g-scrolling-carousel')) return false;
  if (el.getAttribute('data-text-ad') !== null) return false;

  // Ensure the h3 is actually inside or wrapping the link
  if (!link.contains(h3) && !h3.contains(link)) return false;

  return true;
}

function isolateTopResult() {
  if (!isEnabled) return;
  injectBaseCSS();

  const rso = document.getElementById('rso');
  if (!rso) return;

  // Find the first direct child of #rso (or nested block inside #rso) that is a genuine organic result
  let winner = null;

  // Check direct children of #rso first
  for (const child of rso.children) {
    if (isOrganicResult(child)) {
      winner = child;
      break;
    }
  }

  // Fallback: look for div.MjjYud or div.g anywhere inside #rso
  if (!winner) {
    const candidates = rso.querySelectorAll('div.MjjYud, div.g');
    for (const cand of candidates) {
      if (isOrganicResult(cand)) {
        // Find its top-level #rso child wrapper
        let topChild = cand;
        while (topChild.parentElement && topChild.parentElement !== rso) {
          topChild = topChild.parentElement;
        }
        winner = topChild;
        break;
      }
    }
  }

  if (winner) {
    // Mark only this single container as the winner
    document.querySelectorAll('[data-minimalist-winner]').forEach((el) => {
      if (el !== winner) el.removeAttribute('data-minimalist-winner');
    });
    winner.setAttribute('data-minimalist-winner', 'true');

    // If the winner wrapper itself holds multiple sub-results (e.g. grouped MjjYud), keep only the first sub-result
    const subResults = Array.from(winner.querySelectorAll('div.g')).filter(isOrganicResult);
    if (subResults.length > 1) {
      subResults.slice(1).forEach((sub) => {
        sub.style.setProperty('display', 'none', 'important');
      });
    }
  }
}

// Run repeatedly as DOM builds and mutates
const observer = new MutationObserver(() => {
  if (isEnabled) isolateTopResult();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('DOMContentLoaded', isolateTopResult);
window.addEventListener('load', isolateTopResult);
