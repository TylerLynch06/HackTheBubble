// Bodies: page content that the water has picked up. One small physics system
// shared by the tide (floats things on the surface), the whirlpool (sucks them in
// and spits them out) and flotsam (loose letters).
//
//   Liquid.bodies.pickup(filter, cap)     lift page elements in view; filter(rect) optional
//   Liquid.bodies.addFree(el, x, y, w, h) add one of our own floating elements (a loose letter)
//   Liquid.bodies.tide = { active, y }    water surface in viewport px, set by the tide
//   Liquid.bodies.setBuoy(el, v)          v > 0 floats to the top, v < 0 sinks, while buoyancy.active
//   Liquid.bodies.startVortex(x, y, dir)  everything orbits this point; setVortexSpeed(s) spins it up
//   Liquid.bodies.gulp()                  the orbit collapses down the drain
//   Liquid.bodies.spit()                  ...and is flung back out
//
// A page element is only ever moved with an inline transform, and gets its
// original inline styles back the moment it settles home.
(() => {
  const L = window.Liquid;
  const SEL = 'img,picture,video,canvas,svg,h1,h2,h3,h4,h5,h6,p,li,button,input,textarea,select,' +
    'figure,blockquote,pre,td,th,dt,dd,label,[role="button"],a';
  const MAX = 220;

  const bodies = [];
  const byEl = new Map();
  const tide = { active: false, y: 0 };
  const buoyancy = { active: false };
  let vortex = null;
  let raf = 0;

  // Fixed-position content (cookie banners, sticky bars) has a home in the viewport,
  // not the document, so scrolling must not move it.
  function isFixed(el) {
    for (let p = el, n = 0; p && n < 12; p = p.parentElement, n++) {
      if (getComputedStyle(p).position === 'fixed') return true;
    }
    return false;
  }

  function add(el, r, checkFixed) {
    const fixed = !!checkFixed && isFixed(el);
    const b = {
      el, free: false, fixed,
      hx: r.left + r.width / 2 + (fixed ? 0 : scrollX), hy: r.top + r.height / 2 + (fixed ? 0 : scrollY),
      px: r.left + r.width / 2, py: r.top + r.height / 2,
      vx: 0, vy: 0, rot: 0, vr: 0, sc: 1, w: r.width, h: r.height,
      seed: Math.random(), fling: 0, buoy: 0, depth: 0, dim: false,
      orig: {
        transform: el.style.transform, transition: el.style.transition, opacity: el.style.opacity,
        filter: el.style.filter, position: el.style.position, zIndex: el.style.zIndex
      }
    };
    el.style.transition = 'none';
    bodies.push(b); byEl.set(el, b);
    return b;
  }

  function pickup(filter, cap = 60) {
    const vw = innerWidth, vh = innerHeight, picked = new Set();
    let n = 0;
    for (const el of document.querySelectorAll(SEL)) {
      if (n >= cap || bodies.length >= MAX) break;
      if (byEl.has(el) || L.util.isOurs(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      if (r.width * r.height > vw * vh * 0.45) continue;
      if (filter && !filter(r)) continue;
      let nested = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (picked.has(p) || byEl.has(p)) { nested = true; break; }
      }
      if (nested) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'inline' || cs.display === 'contents' || cs.visibility === 'hidden') continue;
      picked.add(el);
      add(el, r);
      n++;
    }
    if (n) wake();
    return n;
  }

  function addFree(el, x, y, w, h) {
    const b = {
      el, free: true, hx: 0, hy: 0, px: x + w / 2, py: y + h / 2,
      vx: L.util.rand(-0.6, 0.6), vy: L.util.rand(-0.8, 0.1), rot: 0, vr: L.util.rand(-1.5, 1.5),
      sc: 1, w, h, seed: Math.random(), fling: 0, orig: null
    };
    bodies.push(b); byEl.set(el, b);
    wake();
    return b;
  }

  function release(b) {
    if (b.free) b.el.remove();
    else if (b.orig) {
      for (const k in b.orig) b.el.style[k] = b.orig[k];
    }
    byEl.delete(b.el);
  }

  // Buoyancy by importance: v > 0 floats to the top of the window, v < 0 sinks.
  function setBuoy(el, v) {
    let b = byEl.get(el);
    if (!b) {
      if (bodies.length >= MAX || L.util.isOurs(el)) return false;
      for (let p = el.parentElement; p; p = p.parentElement) if (byEl.has(p)) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      b = add(el, r, true);
      wake();
    }
    if (b.free) return false;
    b.buoy = v;
    if (v > 0) {
      // Floaters ride above everything else on the page.
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.style.zIndex = '2147483000';
    }
    return true;
  }

  function remove(b) {
    const i = bodies.indexOf(b);
    if (i >= 0) { bodies.splice(i, 1); release(b); }
  }

  function step() {
    const t = performance.now() / 1000;
    const vw = innerWidth, vh = innerHeight, sx = scrollX, sy = scrollY;

    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      if (!b.el.isConnected) { bodies.splice(i, 1); byEl.delete(b.el); continue; }
      const homeX = b.fixed ? b.hx : b.hx - sx, homeY = b.fixed ? b.hy : b.hy - sy;

      if (vortex) {
        // Kinematic orbit: each body is drawn in to its own ring and carried round,
        // faster the harder the whirlpool is being stirred. On the final gulp the
        // rings collapse into the drain.
        const dx = b.px - vortex.x, dy = b.py - vortex.y;
        let r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
        const sp = vortex.speed;
        if (vortex.gulp) r = Math.max(2, r * 0.9 - 2);
        else r += (34 + b.seed * 190 - r) * 0.035;
        th += vortex.dir * sp * (0.028 + 3.2 / (r + 60));
        b.px = vortex.x + Math.cos(th) * r;
        b.py = vortex.y + Math.sin(th) * r;
        b.rot += vortex.dir * sp * 4.5;
        b.sc += (L.util.clamp(0.22 + r / 420, 0.04, 0.8) - b.sc) * 0.12;
        b.vx = b.vy = 0;
      } else {
        let fx = 0, fy = 0, damp = 0.9, done = false;
        const wet = tide.active && b.py > tide.y - 6;
        const homeWet = !b.free && tide.active && homeY + b.h / 2 > tide.y + 4;

        if (b.fling > 0) {
          // Just spat out of the whirlpool: fly free for a moment.
          b.fling--; damp = 0.955; b.rot += b.vr;
        } else if (b.free) {
          if (wet || !tide.active) {
            // Loose letters drift on the surface and ride the waves.
            const s = L.water.slopeAt(b.px, b.py);
            fy += (tide.active ? (tide.y + 6 + b.seed * 46 - b.py) * 0.02 : 0) - s.y * 1.5;
            fx += Math.sin(t * 0.9 + b.seed * 20) * 0.07 - s.x * 1.5;
            b.vr = (b.vr + (s.x - s.y) * 2) * 0.95;
            b.rot += b.vr; damp = 0.95;
          } else {
            damp = 0.82; b.vr *= 0.9; b.rot += b.vr; // stranded on the beach
          }
        } else if (homeWet) {
          // The water has reached this element: lift it to the surface and let it bob.
          const depth = 8 + b.seed * 70 + b.h * 0.35;
          fy += (tide.y + depth - b.py) * 0.028;
          fx += (homeX + Math.sin(t * 0.6 + b.seed * 20) * 46 - b.px) * 0.012;
          b.rot += (Math.sin(t * 1.2 + b.seed * 9) * 9 - b.rot) * 0.06;
          damp = 0.92;
        } else if (b.buoy > 0 && buoyancy.active) {
          // Unimportant content floats: up to the top of the window, bobbing gently.
          const ty = 12 + b.seed * 46 + b.h / 2 + Math.sin(t * 1.1 + b.seed * 30) * 7;
          fy += (ty - b.py) * 0.012;
          fx += (homeX + Math.sin(t * 0.7 + b.seed * 20) * 12 - b.px) * 0.03;
          b.rot += (Math.sin(t * 0.9 + b.seed * 9) * 2.5 - b.rot) * 0.05;
          damp = 0.9;
        } else if (b.buoy < 0 && buoyancy.active) {
          // Important content sinks, each piece at its own pace, tilting as it goes.
          const maxDepth = vh * 0.6;
          b.depth = Math.min(maxDepth, b.depth + 0.14 + b.seed * 0.3);
          const k = b.depth / maxDepth;
          fy += (homeY + b.depth - b.py) * 0.05;
          fx += (homeX + Math.sin(t * 0.5 + b.seed * 20) * 16 * k - b.px) * 0.03;
          b.rot += ((b.seed - 0.5) * 16 * k - b.rot) * 0.05;
          damp = 0.85;
        } else {
          // Dry again: spring back to where the page had it.
          fx += (homeX - b.px) * 0.07; fy += (homeY - b.py) * 0.07;
          b.rot *= 0.88; damp = 0.78;
          done = Math.abs(homeX - b.px) < 0.6 && Math.abs(homeY - b.py) < 0.6 &&
            Math.abs(b.vx) + Math.abs(b.vy) < 0.3 && Math.abs(b.rot) < 0.4 && b.sc > 0.985;
        }

        b.vx = (b.vx + fx) * damp; b.vy = (b.vy + fy) * damp;
        b.px += b.vx; b.py += b.vy;
        b.sc += (1 - b.sc) * 0.09;

        if (b.free || b.fling > 0) {
          if (b.px < 8 || b.px > vw - 8) { b.vx *= -0.7; b.px = L.util.clamp(b.px, 8, vw - 8); }
          if (b.py < 8 || b.py > vh - 8) { b.vy *= -0.7; b.py = L.util.clamp(b.py, 8, vh - 8); }
        }
        if (done) { bodies.splice(i, 1); release(b); continue; }
      }

      const tx = b.free ? b.px - b.w / 2 : b.px - homeX;
      const ty = b.free ? b.py - b.h / 2 : b.py - homeY;
      b.el.style.transform =
        `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) rotate(${b.rot.toFixed(1)}deg) scale(${b.sc.toFixed(3)})`;

      // Sinking content fades into the deep.
      if (b.buoy < 0 && buoyancy.active) {
        const k = b.depth / (vh * 0.6);
        b.el.style.opacity = (1 - 0.75 * k).toFixed(2);
        b.el.style.filter = `blur(${(k * 2.4).toFixed(1)}px)`;
        b.dim = true;
      } else if (b.dim) {
        b.el.style.opacity = b.orig.opacity; b.el.style.filter = b.orig.filter;
        b.dim = false; b.depth = 0;
      }
    }
    raf = bodies.length ? requestAnimationFrame(step) : 0;
  }

  function wake() { if (!raf) raf = requestAnimationFrame(step); }

  L.bodies = {
    tide,
    buoyancy, setBuoy,
    has: (el) => byEl.has(el),
    pickup, addFree, remove,
    get count() { return bodies.length; },
    get vortexActive() { return !!vortex; },
    startVortex(x, y, dir = 1) { vortex = { x, y, dir, speed: 1, gulp: false }; wake(); },
    setVortexSpeed(s) { if (vortex) vortex.speed = s; },
    gulp() { if (vortex) vortex.gulp = true; },
    spit() {
      if (!vortex) return;
      // The harder it was spinning, the further everything is thrown.
      const power = Math.min(2.4, 0.75 + vortex.speed * 0.22);
      for (const b of bodies) {
        const a = Math.random() * Math.PI * 2, sp = L.util.rand(14, 34) * power;
        b.px = vortex.x; b.py = vortex.y;
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
        b.vr = L.util.rand(-18, 18); b.fling = Math.round(L.util.rand(34, 60));
      }
      vortex = null;
    },
    removeFree() { for (const b of bodies.filter((x) => x.free)) remove(b); },
    releaseAll() {
      cancelAnimationFrame(raf); raf = 0; vortex = null; tide.active = false; buoyancy.active = false;
      for (const b of bodies.splice(0)) release(b);
    }
  };

  // Registered as a gag only so that draining (stage 0) puts every element back.
  L.gag({ id: 'bodies', min: 1, start() {}, stop() { L.bodies.releaseAll(); } });
})();
