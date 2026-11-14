// Ducks (stage 2+): a mother duck and her ducklings, as little low-poly models
// seen from above. They paddle about on their own business in a line, leave real
// wakes in the water, get pushed around by waves, and scatter when something
// large and hungry turns up. They can't be removed. Clicking one makes it hop and
// explains this.
(() => {
  const L = window.Liquid;
  const DUCKLINGS = 4;
  const REPLIES = [
    ['Ducks', 'Ducks cannot be removed. Ducks are a core part of the Liquid Life experience.'],
    ['Duck Pack', 'Enjoying your ducks? Add up to twelve more for £2.99 a month.'],
    ['Feedback received', 'The ducks have been notified of your concerns.']
  ];

  let ducks = [], ent = null, reply = 0, frame = 0;
  let goal = { x: 0, y: 0, until: 0 };

  function newGoal(now) {
    const m = 90;
    goal = {
      x: L.util.rand(m, Math.max(m + 1, innerWidth - m)), y: L.util.rand(m, Math.max(m + 1, innerHeight - m)),
      until: now + L.util.rand(5000, 9000)
    };
  }

  function onClick(e) {
    if (!e.isTrusted) return;
    for (const d of ducks) {
      if (Math.hypot(e.clientX - d.x, e.clientY - (d.y - 6 * d.s)) < 16 * d.s) {
        e.preventDefault(); e.stopImmediatePropagation();
        d.hop = 5;
        L.water.splash(d.x, d.y, 26, -1.8);
        const [title, text] = REPLIES[reply++ % REPLIES.length];
        L.util.toast(title, text, 3400);
        return;
      }
    }
  }

  L.gag({
    id: 'ducks',
    min: 2,
    start() {
      const mesh = L.models.duck();
      ducks = [];
      for (let i = 0; i <= DUCKLINGS; i++) {
        ducks.push({
          s: i === 0 ? 1.5 : 0.9, x: innerWidth + 60 + i * 34, y: innerHeight * 0.3 + i * 5,
          vx: -1.4, vy: 0, yaw: Math.PI, z: 0, vz: 0, hop: 0, ph: Math.random() * 10
        });
      }
      newGoal(performance.now());

      ent = {
        update(t) {
          const now = performance.now(), vw = innerWidth, vh = innerHeight;
          frame++;
          const lead = ducks[0];
          if (now > goal.until || Math.hypot(goal.x - lead.x, goal.y - lead.y) < 50) newGoal(now);
          const threat = L.sea && L.sea.threat;

          for (let i = 0; i < ducks.length; i++) {
            const d = ducks[i];
            // the mother heads for the next spot; each duckling follows the duck in front
            let tx, ty, cruise;
            if (i === 0) { tx = goal.x; ty = goal.y; cruise = 1.1; }
            else {
              const p = ducks[i - 1], gap = 19 * p.s + 6;
              tx = p.x - Math.cos(p.yaw) * gap; ty = p.y - Math.sin(p.yaw) * gap;
              cruise = 1.7;
            }
            const dx = tx - d.x, dy = ty - d.y, dist = Math.hypot(dx, dy) || 1;
            const want = Math.min(cruise, dist * 0.06);
            let ax = (dx / dist) * want - d.vx, ay = (dy / dist) * want - d.vy;
            if (threat) {
              const fx = d.x - threat.x, fy = d.y - threat.y, fd = Math.hypot(fx, fy) || 1;
              if (fd < 340) { ax += (fx / fd) * 1.8; ay += (fy / fd) * 1.8; }
            }
            const sl = L.water.slopeAt(d.x, d.y);
            d.vx += ax * 0.05 - sl.x * 0.9; d.vy += ay * 0.05 - sl.y * 0.9;
            const speed = Math.hypot(d.vx, d.vy);
            if (speed > 4.5) { d.vx *= 4.5 / speed; d.vy *= 4.5 / speed; }
            d.x = L.util.clamp(d.x + d.vx, -80, vw + 300);
            d.y = L.util.clamp(d.y + d.vy, 16, vh - 12);
            if (speed > 0.15) {
              let turn = Math.atan2(d.vy, d.vx) - d.yaw;
              while (turn > Math.PI) turn -= 6.283; while (turn < -Math.PI) turn += 6.283;
              d.yaw += turn * 0.12;
            }
            // hop: a little jump with gravity
            if (d.hop) { d.vz = d.hop; d.hop = 0; }
            d.z += d.vz; d.vz -= 0.45;
            if (d.z <= 0) { if (d.vz < -1.5) L.water.splash(d.x, d.y, 18, -1.2); d.z = 0; d.vz = 0; }
            d.roll = L.util.clamp(sl.y * Math.cos(d.yaw) - sl.x * Math.sin(d.yaw), -0.4, 0.4) + Math.sin(t * 5 + d.ph) * 0.06;

            if ((frame + i * 3) % 9 === 0 && speed > 0.4 && d.x > 0 && d.x < vw) {
              const bx = d.x - Math.cos(d.yaw) * 9 * d.s, by = d.y - Math.sin(d.yaw) * 9 * d.s;
              L.water.splash(bx, by, 9, -0.2 * d.s);
              L.scene.emit({ k: 'foam', x: bx, y: by, life: 26, size: 1.6 * d.s });
            }
          }
        },
        shadow(c) { for (const d of ducks) L.scene.blobShadow(c, d.x - 3, d.y - 3, d.yaw, 10 * d.s, 6.5 * d.s, 0.26); },
        draw(S, t) {
          for (const d of ducks) {
            const bob = Math.sin(t * 2.3 + d.ph) * 0.5 - L.water.heightAt(d.x, d.y) * 2;
            S.mesh(mesh, { x: d.x, y: d.y, z: d.z + bob - 1.2 * d.s, yaw: d.yaw, roll: d.roll, s: d.s });
          }
        }
      };
      L.scene.add(ent);
      window.addEventListener('click', onClick, true);
    },
    stop() {
      window.removeEventListener('click', onClick, true);
      if (ent) { ent.dead = true; ent = null; }
      ducks = [];
    }
  });
})();
