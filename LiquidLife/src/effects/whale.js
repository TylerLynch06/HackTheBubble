// Whale (stage 3+): a shadow far larger than anything else drifts under the page.
// Halfway across, its back breaks the surface, it blows, and it sinks away again,
// leaving a swell that rocks every ship and duck on the screen. It has no
// interest in you whatsoever.
//
//   Liquid.whale.summon()   (Alt+H)
(() => {
  const L = window.Liquid;
  let ent = null;

  function summon() {
    if (ent || L.stage < 3 || (L.sea && L.sea.busy)) return;
    if (L.sea) L.sea.busy = true;
    const { rand } = L.util;
    const vw = innerWidth, vh = innerHeight, mesh = L.models.hump();
    const fromLeft = Math.random() < 0.5;
    const w = {
      x: fromLeft ? -320 : vw + 320, y: vh * rand(0.3, 0.7), yaw: (fromLeft ? 0 : Math.PI) + rand(-0.18, 0.18),
      z: -60, blown: 0, frame: 0
    };

    ent = {
      update(t) {
        const vw = innerWidth;
        w.frame++;
        w.x += Math.cos(w.yaw) * 1.9; w.y += Math.sin(w.yaw) * 1.9;
        // surface in the middle third of the crossing
        const mid = Math.abs(w.x - vw / 2) < vw * 0.16;
        w.z += ((mid ? -12 : -60) - w.z) * 0.03;
        if (mid && w.z > -16 && w.blown < 3 && w.frame % 26 === 0) {
          w.blown++;
          const bx = w.x + Math.cos(w.yaw) * 52, by = w.y + Math.sin(w.yaw) * 52;
          L.scene.burst('spray', bx, by, 12, 34, { speed: 1.5, up: 8.5, life: 70, size: 3 });
          L.scene.emit({ k: 'ring', x: w.x, y: w.y, life: 70, size: 60, grow: 170 });
          L.water.splash(w.x, w.y, 150, -5.5);
          if (w.blown === 1) L.util.toast('Whale', 'A whale has surfaced on this page. Whales are a protected feature and cannot be dismissed.');
        }
        if (w.frame % 5 === 0) L.water.splash(w.x + rand(-80, 80), w.y + rand(-30, 30), 40, -0.6);
        if (w.x < -360 || w.x > vw + 360) { this.dead = true; ent = null; if (L.sea) L.sea.busy = false; }
      },
      under(c, t) {
        const fx = Math.cos(w.yaw), fy = Math.sin(w.yaw);
        c.save();
        c.translate(w.x + 10, w.y + 14); c.rotate(w.yaw);
        c.filter = 'blur(9px)';
        c.fillStyle = 'rgba(4,20,44,.5)';
        c.beginPath(); c.ellipse(0, 0, 200, 62, 0, 0, 6.283); c.fill();
        // flukes, beating slowly
        const beat = Math.sin(t * 1.6) * 0.25;
        c.translate(-190, 0); c.rotate(beat);
        c.beginPath(); c.moveTo(10, 0); c.lineTo(-70, -78); c.lineTo(-44, 0); c.lineTo(-70, 78); c.closePath(); c.fill();
        c.restore();
      },
      draw(S) {
        if (w.z > -40) S.mesh(mesh, { x: w.x, y: w.y, z: w.z, yaw: w.yaw });
      }
    };
    L.scene.add(ent);
  }

  L.whale = { summon, get active() { return !!ent; } };

  L.gag({
    id: 'whale',
    min: 3,
    start() {},
    stop() { if (ent) { ent.dead = true; ent = null; } }
  });
})();
