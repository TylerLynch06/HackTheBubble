// Syrup Scroll: the mouse wheel feeds momentum into the page slowly, the page
// keeps flowing after you stop, bounces off the top and bottom, and the whole
// body sloshes (skews) with the scroll speed like water in a tank.
(() => {
  // Leave scrollable inner panels (chat boxes, code blocks, maps) alone.
  function innerScrollable(target) {
    for (let n = target; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.nodeType !== 1) continue;
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  }

  Liquid.register({
    id: 'slosh',
    start(L) {
      let v = 0, acc = 0, tilt = 0, tiltV = 0, lastY = scrollY;
      const body = document.body;
      this.prevTransform = body.style.transform;
      this.prevOrigin = body.style.transformOrigin;

      this.onWheel = (e) => {
        if (e.ctrlKey || e.defaultPrevented || innerScrollable(e.target)) return;
        e.preventDefault();
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
        v += dy * L.util.lerp(0.2, 0.06, L.intensity); // slow to get going...
      };
      window.addEventListener('wheel', this.onWheel, { passive: false });

      const loop = () => {
        const i = L.intensity;
        // ...and refuses to stop.
        v *= L.util.lerp(0.9, 0.975, i);
        acc += v;
        const step = Math.trunc(acc);
        if (step) {
          acc -= step;
          const max = document.documentElement.scrollHeight - innerHeight;
          const next = scrollY + step;
          if ((next <= 0 && v < 0) || (next >= max && v > 0)) v *= -0.55; // slosh back off the walls
          window.scrollBy({ top: step, behavior: 'instant' });
        }
        // Spring the tilt towards the actual scroll speed.
        const speed = scrollY - lastY;
        lastY = scrollY;
        const target = L.util.clamp(-speed * 0.25, -7, 7) * i;
        tiltV = (tiltV + (target - tilt) * 0.09) * 0.86;
        tilt += tiltV;
        if (Math.abs(tilt) > 0.02 || Math.abs(tiltV) > 0.02) {
          body.style.transformOrigin = `50% ${scrollY + innerHeight / 2}px`;
          body.style.transform = `skewY(${tilt.toFixed(3)}deg)`;
        } else if (body.style.transform) {
          // Clear the transform at rest so fixed headers behave again.
          body.style.transform = this.prevTransform;
          body.style.transformOrigin = this.prevOrigin;
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(this.raf);
      window.removeEventListener('wheel', this.onWheel, { passive: false });
      document.body.style.transform = this.prevTransform || '';
      document.body.style.transformOrigin = this.prevOrigin || '';
    }
  });
})();
