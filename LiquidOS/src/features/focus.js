// Focus. Removes distractions, where "distractions" means nearly everything.
// Originally the Minimalist Mode extension.
//   - On a Google results page: exactly one result is shown. No ads, no sidebar,
//     no "People also ask", no page two.
//   - On any other page: one paragraph remains. Images, sidebars, navigation,
//     footers and every later paragraph are hidden.
// Everything hidden is restored when Focus is turned off.
(() => {
  const L = window.Liquid;
  const GOOGLE_CLUTTER = '#tads, #bottomads, #rhs, #botstuff, #taw, #appbar, #extabar, #top_nav, #fbar, #sfooter, footer, ' +
    '.related-question-pair, g-scrolling-carousel, .kp-blk, #OICR, #not-top-stuff, div[data-mcpr], .g-blk';
  const PAGE_CLUTTER = 'img, picture, video, figure, aside, nav, footer, iframe, [role="complementary"], [role="navigation"]';
  const PAGE_TEXT = 'p, li, h2, h3, h4, h5, blockquote, table, pre, dl';

  const hidden = new Map(); // element -> [display value, priority] before we hid it
  let timer = 0, announced = false;

  const isGoogleResults = () => /(^|\.)google\./.test(location.hostname) && location.pathname.startsWith('/search');

  function hide(el) {
    if (hidden.has(el) || L.util.isOurs(el)) return false;
    hidden.set(el, [el.style.getPropertyValue('display'), el.style.getPropertyPriority('display')]);
    el.style.setProperty('display', 'none', 'important');
    return true;
  }

  function isOrganicResult(el) {
    const h3 = el.querySelector('h3'), link = el.querySelector('a[href^="http"]');
    if (!h3 || !link) return false;
    if (el.closest('#tads, #bottomads, #rhs, #taw')) return false;
    if (el.querySelector('.related-question-pair, g-scrolling-carousel')) return false;
    return link.contains(h3) || h3.contains(link);
  }

  function focusGoogle() {
    let n = 0;
    for (const el of document.querySelectorAll(GOOGLE_CLUTTER)) if (hide(el)) n++;
    const rso = document.getElementById('rso');
    if (!rso) return n;
    let winner = null;
    for (const child of rso.children) {
      if (!winner && !hidden.has(child) && isOrganicResult(child)) winner = child;
      else if (child !== winner && hide(child)) n++;
    }
    if (winner) {
      // a wrapper can hold several results: keep only the first
      const subs = Array.from(winner.querySelectorAll('div.g')).filter(isOrganicResult);
      for (const sub of subs.slice(1)) if (hide(sub)) n++;
    }
    return n;
  }

  function focusPage() {
    let n = 0;
    for (const el of document.querySelectorAll(PAGE_CLUTTER)) if (hide(el)) n++;
    let keep = document.querySelector('[data-lq-focus-keep]');
    for (const el of document.querySelectorAll(PAGE_TEXT)) {
      if (hidden.has(el) || L.util.isOurs(el)) continue;
      if (!keep) {
        // the first paragraph of real length is the one you get
        if (el.tagName === 'P' && el.textContent.trim().length > 80 && el.offsetParent) {
          keep = el; el.setAttribute('data-lq-focus-keep', '');
        }
        continue; // anything before it (the headline) is allowed to stay
      }
      if (el === keep || keep.contains(el) || el.contains(keep)) continue;
      if (hide(el)) n++;
    }
    return n;
  }

  function scan() {
    const n = isGoogleResults() ? focusGoogle() : focusPage();
    if (n && !announced && !document.hidden) {
      announced = true;
      L.util.toast('Focus', isGoogleResults()
        ? 'Focus chose the best result for you. The other results were distractions.'
        : `Focus removed ${hidden.size} distractions from this page. One paragraph remains.`);
    }
    timer = setTimeout(scan, 1500); // pages keep loading more distractions
  }

  L.os.feature({
    id: 'focus',
    isOn: (s) => !!s.focus,
    start() { announced = false; scan(); },
    stop() {
      clearTimeout(timer);
      for (const [el, [value, priority]] of hidden) {
        el.style.removeProperty('display');
        if (value) el.style.setProperty('display', value, priority);
      }
      hidden.clear();
      for (const el of document.querySelectorAll('[data-lq-focus-keep]')) el.removeAttribute('data-lq-focus-keep');
    }
  });
})();
