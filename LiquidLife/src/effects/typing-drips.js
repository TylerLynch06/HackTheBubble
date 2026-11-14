// Typing drips (stage 2+): every keystroke lands in the water roughly where the
// caret is, so the thing you are typing is the thing you can no longer read.
(() => {
  const L = window.Liquid;

  function editable(t) {
    if (!t || t.nodeType !== 1) return false;
    return t.isContentEditable || t.tagName === 'TEXTAREA' ||
      (t.tagName === 'INPUT' && !/^(checkbox|radio|range|button|submit|file|color)$/i.test(t.type));
  }

  function caretPoint(t) {
    const r = t.getBoundingClientRect();
    // Real caret position for rich-text editors.
    if (t.isContentEditable) {
      const sel = getSelection();
      if (sel && sel.rangeCount) {
        const c = sel.getRangeAt(0).getBoundingClientRect();
        if (c.width || c.height) return { x: c.left, y: c.top + c.height / 2 };
      }
      return { x: r.left + 20, y: r.top + Math.min(r.height / 2, 20) };
    }
    // Inputs don't expose caret pixels, so estimate from the character index.
    let idx = 0;
    try { idx = t.selectionStart || 0; } catch (e) { idx = (t.value || '').length; }
    const size = parseFloat(getComputedStyle(t).fontSize) || 16;
    if (t.tagName === 'TEXTAREA') return { x: r.left + L.util.rand(12, Math.max(13, r.width - 12)), y: r.top + r.height / 2 };
    return { x: r.left + Math.min(r.width - 10, 12 + idx * size * 0.55), y: r.top + r.height / 2 };
  }

  function onKey(e) {
    if (e.altKey || e.ctrlKey || e.metaKey || !editable(e.target)) return;
    const p = caretPoint(e.target);
    const big = e.key === 'Enter' || e.key === 'Backspace';
    L.water.splash(p.x, p.y, big ? 34 : 18, (big ? -2.6 : -1.5) * (L.stage >= L.CHAOS ? 1.6 : 1));
  }

  L.gag({
    id: 'typing-drips',
    min: 2,
    start() { window.addEventListener('keydown', onKey, { capture: true, passive: true }); },
    stop() { window.removeEventListener('keydown', onKey, { capture: true }); }
  });
})();
