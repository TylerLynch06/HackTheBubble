// Scene: a tiny low-poly 3D renderer for the high seas, drawn on one canvas over
// the page. The view is from above. The water surface is the page itself, so a
// point on the water at page position (x, y) is drawn exactly at (x, y); height
// above the water (z) leans up the screen, which is what makes the models read
// as little solid objects standing on your browser.
//
// Everything is flat-shaded polygons: each face gets one colour from its angle to
// the sun. Faces are cut off cleanly at the waterline (z = 0), so anything that
// sinks really does go under.
//
//   Liquid.scene.add(entity) / remove(entity)
//       entity.update(t)            move
//       entity.under(ctx, t)        draw things below the surface (shadows of the deep)
//       entity.shadow(ctx, t)       draw its shadow on the water
//       entity.draw(S, t)           S.mesh(mesh, pose, opts) / S.poly(points3D, rgb, opts)
//       entity.dead                 set true to be removed
//   Liquid.scene.project(x, y, z)   -> [screenX, screenY]
//   Liquid.scene.emit(particle)     chunk | smoke | fire | spray | foam | ring
(() => {
  const L = window.Liquid;
  const LEAN_X = 0.14, LEAN_Y = 0.62;  // screen offset per px of height

  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const CAM = norm([-LEAN_X, LEAN_Y, 1]);   // direction from the scene towards the viewer
  const SUN = norm([-0.5, 0.25, 0.83]);     // direction from the scene towards the light

  let cv = null, ctx = null, raf = 0, dpr = 1, vw = 0, vh = 0;
  const ents = new Set();
  let parts = [];
  let faces = [];

  const project = (x, y, z) => [x + z * LEAN_X, y - z * LEAN_Y];

  function ensure() {
    if (!cv) {
      cv = L.util.el('canvas', {
        position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '20'
      });
      ctx = cv.getContext('2d');
      L.util.layer().appendChild(cv);
    }
    if (vw !== innerWidth || vh !== innerHeight || !cv.width) {
      vw = innerWidth; vh = innerHeight;
      dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(vw * dpr)); cv.height = Math.max(1, Math.round(vh * dpr));
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // ---------- submitting geometry ----------
  // pose: { x, y, z, yaw, pitch, roll, s }. Local axes: +x forward, +y right, +z up.
  function place(pose, v) {
    let x = v[0], y = v[1], z = v[2];
    if (pose.roll) { const c = Math.cos(pose.roll), s = Math.sin(pose.roll); const y2 = y * c - z * s; z = y * s + z * c; y = y2; }
    if (pose.pitch) { const c = Math.cos(pose.pitch), s = Math.sin(pose.pitch); const x2 = x * c - z * s; z = z * c + x * s; x = x2; }
    const cy = Math.cos(pose.yaw || 0), sy = Math.sin(pose.yaw || 0), k = pose.s || 1;
    return [pose.x + (x * cy - y * sy) * k, pose.y + (x * sy + y * cy) * k, (pose.z || 0) + z * k];
  }

  // Keep the part of a polygon that is above the water.
  function clipWater(p) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const ina = a[2] >= 0, inb = b[2] >= 0;
      if (ina) out.push(a);
      if (ina !== inb) { const t = a[2] / (a[2] - b[2]); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0]); }
    }
    return out;
  }

  function poly(p, rgb, opts) {
    const o = opts || {};
    // face normal (the same cross product the model builder used to orient faces)
    const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2];
    const bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1], bz = p[2][2] - p[0][2];
    let n = norm([ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]);
    let facing = n[0] * CAM[0] + n[1] * CAM[1] + n[2] * CAM[2];
    if (facing <= 0) {
      if (!o.two) return;                    // back face
      n = [-n[0], -n[1], -n[2]];
    }
    if (o.clip !== false) { p = clipWater(p); if (p.length < 3) return; }
    const lit = o.flat ? 1 : 0.5 + 0.62 * Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]);
    let dx = 0, dy = 0, dz = 0;
    const flat = new Array(p.length * 2);
    for (let i = 0; i < p.length; i++) {
      const q = p[i];
      dx += q[0]; dy += q[1]; dz += q[2];
      flat[i * 2] = q[0] + q[2] * LEAN_X; flat[i * 2 + 1] = q[1] - q[2] * LEAN_Y;
    }
    const k = 1 / p.length;
    faces.push({
      flat, alpha: o.alpha == null ? 1 : o.alpha,
      depth: (dx * CAM[0] + dy * CAM[1] + dz * CAM[2]) * k + (o.bias || 0),
      css: `rgb(${Math.min(255, rgb[0] * lit) | 0},${Math.min(255, rgb[1] * lit) | 0},${Math.min(255, rgb[2] * lit) | 0})`
    });
  }

  const S = {
    project,
    poly,
    // opts.deform(v) can bend the model before it is posed (tail sway, jaw hinge).
    mesh(mesh, pose, opts) {
      const o = opts || {};
      const V = mesh.v, W = new Array(V.length);
      for (let i = 0; i < V.length; i++) W[i] = place(pose, o.deform ? o.deform(V[i]) : V[i]);
      for (const f of mesh.f) {
        const p = new Array(f.i.length);
        for (let j = 0; j < f.i.length; j++) p[j] = W[f.i[j]];
        poly(p, f.c, { two: f.two, clip: o.clip, alpha: o.alpha, bias: o.bias });
      }
    }
  };

  // ---------- particles ----------
  // { k, x, y, z, vx, vy, vz, life, size, c:[r,g,b] }  k: chunk | smoke | fire | spray | foam | ring
  function emit(p) {
    if (parts.length > 700) return;
    p.max = p.life; p.rot = Math.random() * 6.28; p.vr = (Math.random() - 0.5) * 0.4;
    p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0; p.z = p.z || 0;
    parts.push(p);
    ensure();
  }

  function shard(p, sides) {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = p.rot + (i / sides) * 6.283;
      // tumble: squash one axis so it looks like a flat chip turning over
      pts.push([p.x + Math.cos(a) * p.size, p.y + Math.sin(a) * p.size * Math.cos(p.rot * 1.7), p.z + Math.sin(a) * p.size * Math.sin(p.rot * 1.7)]);
    }
    return pts;
  }

  function stepParticles() {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life--; p.rot += p.vr;
      p.x += p.vx; p.y += p.vy; p.z += p.vz;
      if (p.k === 'chunk' || p.k === 'spray') {
        p.vz -= p.k === 'chunk' ? 0.32 : 0.22;
        if (p.z < 0 && p.vz < 0) {
          // lands in the water
          if (p.k === 'chunk') {
            L.water.splash(p.x, p.y, 12, -0.9);
            emit({ k: 'ring', x: p.x, y: p.y, life: 26, size: 4 });
            if (p.floats) { p.k = 'float'; p.z = 0; p.vx *= 0.2; p.vy *= 0.2; p.vz = 0; p.life = p.max = 380; continue; }
          }
          p.life = 0;
        }
      } else if (p.k === 'smoke') { p.vx *= 0.97; p.vy *= 0.97; p.size *= 1.012; }
      else if (p.k === 'fire') { p.size *= 0.95; }
      else if (p.k === 'float') { p.vx *= 0.98; p.vy *= 0.98; }
      if (p.life <= 0) parts.splice(i, 1);
    }
  }

  function drawSurfaceParticles() {
    for (const p of parts) {
      const f = p.life / p.max;
      if (p.k === 'ring') {
        const r = p.size + (1 - f) * (p.grow || 34);
        ctx.strokeStyle = `rgba(255,255,255,${(f * 0.8).toFixed(2)})`;
        ctx.lineWidth = 1 + f * 2;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) { const a = (i / 8) * 6.283 + p.rot; ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.8); }
        ctx.stroke();
      } else if (p.k === 'foam') {
        ctx.fillStyle = `rgba(255,255,255,${(f * 0.75).toFixed(2)})`;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) { const a = p.rot + i * 1.571; ctx.lineTo(p.x + Math.cos(a) * p.size, p.y + Math.sin(a) * p.size * 0.7); }
        ctx.fill();
      }
    }
  }

  function pushAirParticles() {
    for (const p of parts) {
      const f = p.life / p.max;
      if (p.k === 'chunk') poly(shard(p, p.sides || 4), p.c, { two: true, clip: false });
      else if (p.k === 'float') poly(shard({ ...p, rot: p.rot * 0.05, z: 0.6 }, 4), p.c, { two: true, clip: false, alpha: Math.min(1, f * 4) });
      else if (p.k === 'smoke') poly(shard({ ...p, rot: p.rot * 0.2 }, 6), p.c, { two: true, clip: false, alpha: f * 0.75, flat: true });
      else if (p.k === 'fire') poly(shard(p, 3), p.c, { two: true, clip: false, alpha: Math.min(1, f * 1.6), flat: true });
      else if (p.k === 'spray') poly(shard(p, 3), [255, 255, 255], { two: true, clip: false, alpha: f, flat: true });
    }
  }

  // ---------- frame ----------
  function frame(now) {
    raf = 0;
    if (!cv) return;
    const t = now / 1000;
    for (const e of ents) {
      try { e.update && e.update(t); } catch (err) { console.warn('[Liquid Life] scene update failed', err); e.dead = true; }
      if (e.dead) ents.delete(e);
    }
    stepParticles();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.lineJoin = 'round';
    for (const e of ents) if (e.under) e.under(ctx, t);
    drawSurfaceParticles();
    for (const e of ents) if (e.shadow) e.shadow(ctx, t);

    faces = [];
    for (const e of ents) if (e.draw) e.draw(S, t);
    pushAirParticles();
    faces.sort((a, b) => a.depth - b.depth);
    ctx.lineWidth = 0.7;
    for (const f of faces) {
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = ctx.strokeStyle = f.css;
      ctx.beginPath();
      const a = f.flat;
      ctx.moveTo(a[0], a[1]);
      for (let i = 2; i < a.length; i += 2) ctx.lineTo(a[i], a[i + 1]);
      ctx.closePath();
      ctx.fill();
      if (f.alpha === 1) ctx.stroke(); // seals hairline gaps between faces
    }
    ctx.globalAlpha = 1;
    for (const e of ents) if (e.over) e.over(ctx, t);

    if (ents.size || parts.length) { ensure(); }
    else { cv.remove(); cv = ctx = null; vw = vh = 0; }
  }

  // An elliptical shadow on the water, turned to match a heading.
  function blobShadow(c, x, y, yaw, rx, ry, alpha) {
    c.save();
    c.translate(x + 6, y + 7); c.rotate(yaw);
    c.fillStyle = `rgba(6,24,50,${alpha})`;
    c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 6.283); c.fill();
    c.restore();
  }

  L.scene = {
    project, emit, blobShadow,
    add(e) { ents.add(e); ensure(); return e; },
    remove(e) { ents.delete(e); },
    // a handy burst: n particles thrown outwards and upwards
    burst(k, x, y, z, n, opts) {
      const o = opts || {};
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, sp = (o.speed || 2) * (0.4 + Math.random());
        emit({
          k, x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: (o.up || 3) * (0.5 + Math.random()),
          life: (o.life || 50) * (0.6 + Math.random() * 0.8) | 0, size: (o.size || 3) * (0.6 + Math.random() * 0.8),
          c: o.colours ? o.colours[i % o.colours.length] : (o.c || [120, 80, 40]), floats: o.floats && Math.random() < 0.4,
          sides: o.sides
        });
      }
    }
  };

  L.gag({
    id: 'scene',
    min: 1,
    start() {},
    stop() {
      cancelAnimationFrame(raf); raf = 0;
      ents.clear(); parts = []; faces = [];
      cv?.remove(); cv = ctx = null; vw = vh = 0;
    }
  });
})();
