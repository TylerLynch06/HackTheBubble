// Flotsam: letters knocked off the page. Each one leaves a hole in the text and
// becomes a loose floating body (see bodies.js). Cannonballs that miss knock
// letters off; at Chaos (level 5) they also come loose at random. The megalodon
// eats whole words the same way. stop() puts everything back.
//
//   Liquid.flotsam.knockAt(x, y)   knock loose the character under a viewport point
(() => {
  const L = window.Liquid;
  const MAX = 160;
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|NOSCRIPT|IFRAME|SVG|CODE|PRE)$/i;
  let timer = 0, on = false;
  let loose = [];  // bodies
  let holes = [];  // hidden <span> wrappers left in the page

  function knockAt(x, y) {
    if (!on) return false;
    let range = null;
    try { range = document.caretRangeFromPoint(x, y); } catch (e) { return false; }
    if (!range) return false;
    const node = range.startContainer;
    if (!node || node.nodeType !== 3) return false;
    const parent = node.parentElement;
    if (!parent || L.util.isOurs(parent) || SKIP.test(parent.tagName) || parent.isContentEditable) return false;
    const i = Math.min(range.startOffset, node.data.length - 1);
    const ch = node.data[i];
    if (i < 0 || !ch || !ch.trim()) return false;

    const r = document.createRange();
    r.setStart(node, i); r.setEnd(node, i + 1);
    const box = r.getBoundingClientRect();
    if (!box.width || !box.height || box.height > 200) return false;
    const cs = getComputedStyle(parent);

    // Floating copy on our layer.
    const f = L.util.el('span', {
      position: 'absolute', left: '0', top: '0', margin: '0', padding: '0', display: 'block',
      width: box.width + 'px', height: box.height + 'px',
      font: cs.font, color: cs.color, lineHeight: box.height + 'px', whiteSpace: 'pre',
      textShadow: '0 2px 6px rgba(0,40,110,.35)', willChange: 'transform', pointerEvents: 'none'
    }, ch);

    // Hole in the page: isolate the character and hide it without changing layout.
    try {
      const tail = node.splitText(i);
      tail.splitText(1);
      const hole = document.createElement('span');
      hole.setAttribute('data-lq', '');
      hole.style.visibility = 'hidden';
      parent.insertBefore(hole, tail);
      hole.appendChild(tail);
      holes.push(hole);
    } catch (e) { return false; }

    L.util.layer().appendChild(f);
    loose.push(L.bodies.addFree(f, box.left, box.top, box.width, box.height));
    L.water.splash(box.left, box.top + box.height / 2, 16, 1.2);
    if (loose.length > MAX) L.bodies.remove(loose.shift());
    return true;
  }

  function tick() {
    if (L.admin.autoChaos && L.stage >= L.CHAOS && !document.hidden) {
      knockAt(L.util.rand(20, innerWidth - 20), L.util.rand(20, innerHeight - 20));
    }
    timer = setTimeout(tick, L.util.rand(140, 460));
  }

  // Remove the whole word under a viewport point (the megalodon's lunch). It leaves
  // a hole in the text, restored on stop() like any other.
  function eatWordAt(x, y) {
    if (!on) return false;
    let range = null;
    try { range = document.caretRangeFromPoint(x, y); } catch (e) { return false; }
    if (!range) return false;
    const node = range.startContainer;
    if (!node || node.nodeType !== 3) return false;
    const parent = node.parentElement;
    if (!parent || L.util.isOurs(parent) || SKIP.test(parent.tagName) || parent.isContentEditable) return false;
    const str = node.data;
    const i = Math.min(range.startOffset, str.length - 1);
    if (i < 0 || !str[i] || !str[i].trim()) return false;
    let a = i, b = i + 1;
    while (a > 0 && str[a - 1].trim()) a--;
    while (b < str.length && str[b].trim()) b++;
    try {
      const tail = node.splitText(a);
      tail.splitText(b - a);
      const hole = document.createElement('span');
      hole.setAttribute('data-lq', '');
      hole.style.visibility = 'hidden';
      parent.insertBefore(hole, tail);
      hole.appendChild(tail);
      holes.push(hole);
    } catch (e) { return false; }
    return true;
  }

  L.flotsam = { knockAt, eatWordAt };

  L.gag({
    id: 'flotsam',
    min: 1, // always available to other gags; letters only come loose by themselves at Chaos
    start() { on = true; timer = setTimeout(tick, 1200); },
    stop() {
      on = false;
      clearTimeout(timer);
      for (const b of loose) L.bodies.remove(b);
      loose = [];
      for (const hole of holes) {
        const p = hole.parentNode;
        if (!p) continue;
        while (hole.firstChild) p.insertBefore(hole.firstChild, hole);
        hole.remove();
        p.normalize();
      }
      holes = [];
    }
  });
})();
