// Megalodon (stage 3+), seen from above. Most of the time all you get is a very
// large shadow under the page and a fin cutting the surface, heading for your
// cursor and eating the words it passes under.
//   - When it gets close it comes up: head out of the water, mouth open.
//     If the mouth reaches the cursor, it has it, and keeps swimming.
//   - To get the cursor back, pull the mouse the opposite way to the shark, hard.
//     It's a tug of war: pull well and you drag the shark backwards.
//   - Take too long and it leaves the page with your cursor. It comes back.
// You can dodge it by getting out of its line; it turns, but not quickly.
//
//   Liquid.megalodon.summon()   (Alt+M)
(() => {
  const L = window.Liquid;
  const PULL_NEEDED = 750;   // px of mouse travel against the shark
  const CRUISE_Z = -36;      // deep enough that only the fin shows
  const MOUTH_X = 128;       // along the body, in model units

  let ent = null, label = null, bar = null, offDelta = null, gulpTimer = 0;

  function summon() {
    if (ent || L.stage < 3 || (L.sea && L.sea.busy)) return;
    if (L.sea) L.sea.busy = true;
    const { el, FONT, rand, clamp } = L.util;
    const model = L.models.shark();
    const vw = innerWidth, vh = innerHeight;

    // Start off-screen, on a line through the cursor.
    const a0 = rand(0, 6.283), R = Math.hypot(vw, vh) * 0.62 + 220;
    const sh = {
      x: L.cursor.x + Math.cos(a0) * R, y: L.cursor.y + Math.sin(a0) * R,
      yaw: a0 + Math.PI, z: CRUISE_Z, pitch: 0, roll: 0, jaw: 0,
      state: 'approach', speed: 5.2, pull: 0, eaten: 0, frame: 0, committed: false, closest: 1e9, shake: 0
    };

    label = el('div', {
      position: 'absolute', left: '0', top: '0', width: '160px', padding: '7px 10px 9px', borderRadius: '12px',
      background: 'rgba(12,22,32,.88)', color: '#fff', font: `700 11px ${FONT}`, letterSpacing: '.07em',
      textAlign: 'center', pointerEvents: 'none', zIndex: '70', display: 'none', boxSizing: 'border-box'
    }, 'PULL IT OUT');
    const track = el('div', { height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,.25)', marginTop: '6px', overflow: 'hidden' });
    bar = el('div', { height: '100%', width: '0%', background: '#5ac8fa', borderRadius: '2px' });
    track.appendChild(bar); label.appendChild(track);
    L.util.layer().appendChild(label);

    offDelta = L.cursor.onDelta((dx, dy) => {
      if (sh.state !== 'hold') return;
      // movement against the shark's heading counts; going with it loses ground
      const against = -(dx * Math.cos(sh.yaw) + dy * Math.sin(sh.yaw));
      sh.pull = Math.max(0, sh.pull + (against > 0 ? against : against * 0.4));
    });

    // Where the mouth is, on the water and on screen.
    const mouth = () => {
      const c = Math.cos(sh.yaw), s = Math.sin(sh.yaw), cp = Math.cos(sh.pitch), sp = Math.sin(sh.pitch);
      const gx = sh.x + c * MOUTH_X * cp, gy = sh.y + s * MOUTH_X * cp, gz = sh.z + MOUTH_X * sp;
      const scr = L.scene.project(gx, gy, Math.max(0, gz));
      return { gx, gy, gz, sx: scr[0], sy: scr[1] };
    };

    // Tail sway: bends the back half of the body side to side.
    let swayT = 0;
    const sway = (v) => {
      const w = Math.max(0, (60 - v[0]) / 210);
      return [v[0], v[1] + Math.sin(swayT - v[0] * 0.022) * 26 * w * Math.sqrt(w), v[2]];
    };
    // Jaws hinge at the back of the mouth (x = 96).
    const hinge = (angle) => (v) => {
      const x = v[0] - 96, c = Math.cos(angle), s = Math.sin(angle);
      return sway([96 + x * c - v[2] * s, v[1], v[2] * c + x * s]);
    };

    ent = {
      update(t) {
        const vw = innerWidth, vh = innerHeight;
        sh.frame++;
        swayT = t * (sh.state === 'hold' ? 9 : 6.5);
        const fx = Math.cos(sh.yaw), fy = Math.sin(sh.yaw);
        const m = mouth();
        const dCur = Math.hypot(L.cursor.x - m.sx, L.cursor.y - m.sy);
        let pitchTo = 0, zTo = CRUISE_Z, jawTo = 0;

        if (sh.state === 'approach') {
          if (!sh.committed) {
            // steer for the cursor, with a wide turning circle
            let d = Math.atan2(L.cursor.y - sh.y, L.cursor.x - sh.x) - sh.yaw;
            while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
            sh.yaw += clamp(d, -0.03, 0.03);
          }
          if (dCur < 300) { pitchTo = 0.8; zTo = -30; jawTo = 0.62; }       // coming up
          if (dCur < 130) sh.committed = true;                               // too late to turn
          sh.closest = Math.min(sh.closest, dCur);
          if (sh.committed && dCur > sh.closest + 90) sh.state = 'leave';    // missed

          // eats the words it passes under
          if (sh.frame % 7 === 0 && L.flotsam && m.gx > 0 && m.gx < vw && m.gy > 0 && m.gy < vh &&
              L.flotsam.eatWordAt(m.gx + rand(-14, 14), m.gy + rand(-14, 14))) {
            sh.eaten++; L.water.splash(m.gx, m.gy, 18, -1);
          }
          if (dCur < 38 && sh.pitch > 0.45 && L.cursor.capture()) {
            sh.state = 'hold'; sh.pull = 0;
            L.water.splash(m.sx, m.sy, 80, -5);
            L.scene.burst('spray', m.gx, m.gy, 6, 18, { speed: 2.4, up: 5, life: 46, size: 3 });
          }
        } else if (sh.state === 'hold') {
          const k = sh.pull / PULL_NEEDED;
          sh.pull = Math.max(0, sh.pull - 2.2);
          sh.speed += ((1.9 - k * 4.4) - sh.speed) * 0.2;                    // you can drag it backwards
          pitchTo = 0.92; zTo = -28; jawTo = 0.22 + k * 0.3;
          sh.shake = Math.sin(t * 24) * (0.03 + k * 0.07);
          const j = 1 + k * 3;
          L.cursor.place(m.sx - fx * k * 34 + rand(-1.5, 1.5) * j, m.sy - fy * k * 34 + rand(-1.5, 1.5) * j, (sh.yaw * 180) / Math.PI + 90);
          label.style.display = 'block';
          label.style.transform = `translate(${clamp(m.sx - 80, 8, vw - 168)}px, ${clamp(m.sy - 96, 8, vh - 60)}px)`;
          bar.style.width = Math.round(Math.min(1, k) * 100) + '%';
          if (sh.frame % 5 === 0) L.scene.burst('spray', m.gx, m.gy, 4, 3, { speed: 2, up: 3.6, life: 34, size: 2.4 });

          if (sh.pull >= PULL_NEEDED) {
            L.cursor.release();
            label.style.display = 'none';
            sh.state = 'leave'; sh.shake = 0;
            L.water.splash(m.sx, m.sy, 90, 6);
            L.util.toast('Megalodon', 'You have recovered your cursor. Megalodon+ members keep theirs by default.');
          } else if (m.sx < -40 || m.sx > vw + 40 || m.sy < -40 || m.sy > vh + 40) {
            label.style.display = 'none';
            sh.state = 'gone';
            const ex = clamp(m.sx, 30, vw - 30), ey = clamp(m.sy, 30, vh - 30);
            L.cursor.place(-80, -80, 0);
            gulpTimer = setTimeout(() => {
              L.cursor.place(ex, ey, 0);
              L.cursor.release();
              L.water.splash(ex, ey, 70, -4);
              L.util.toast('Find My', 'Your cursor was located inside a megalodon. It has been returned.');
            }, 2000);
          }
        } else {
          sh.speed += (8.5 - sh.speed) * 0.05;                               // leave / gone: dive and go
        }

        sh.pitch += (pitchTo - sh.pitch) * 0.09;
        sh.z += (zTo - sh.z) * 0.09;
        sh.jaw += (jawTo - sh.jaw) * 0.2;
        sh.x += fx * sh.speed; sh.y += fy * sh.speed;
        if (sh.state === 'approach' && sh.speed < 5.2) sh.speed += 0.1;

        if (L.sea) L.sea.threat = { x: sh.x + fx * 60, y: sh.y + fy * 60 };

        // the fin cuts a wake; the body shoves the water about
        if (sh.frame % 2 === 0) {
          L.scene.emit({ k: 'foam', x: sh.x - fx * 18 + rand(-6, 6), y: sh.y - fy * 18 + rand(-6, 6), life: 40, size: rand(2.5, 5.5) });
        }
        if (sh.frame % 3 === 0) {
          const along = rand(-120, 110);
          L.water.splash(sh.x + fx * along, sh.y + fy * along, 34, -0.7);
        }

        const far = sh.x < -420 || sh.x > vw + 420 || sh.y < -420 || sh.y > vh + 420;
        const away = (sh.x - vw / 2) * fx + (sh.y - vh / 2) * fy > 0;
        if (far && away && sh.state !== 'hold') {
          finish(sh.eaten > 3 && sh.state === 'leave' ? `The megalodon ate ${sh.eaten} words. They were not important words.` : null);
        }
      },

      // The shadow of the whole animal under the surface, bigger than the animal.
      under(c) {
        const cy = Math.cos(sh.yaw), sy = Math.sin(sh.yaw);
        const pt = (x, y) => {
          const w = Math.max(0, (60 - x) / 210);
          const yy = y + Math.sin(swayT - x * 0.022) * 26 * w * Math.sqrt(w);
          return [sh.x + 8 + x * cy - yy * sy, sh.y + 12 + x * sy + yy * cy];
        };
        const up = [], down = [];
        const out = [[-196, 2], [-150, 5], [-100, 14], [-40, 31], [10, 39], [22, 96], [52, 40], [96, 30], [130, 19], [158, 0]];
        for (const [x, w] of out) { up.push(pt(x, -w * 1.2)); down.push(pt(x, w * 1.2)); }
        const depth = clamp((-sh.z) / 40, 0.35, 1);
        c.save();
        c.filter = 'blur(7px)';
        c.fillStyle = `rgba(4,18,40,${(0.5 * depth + 0.12).toFixed(2)})`;
        c.beginPath();
        c.moveTo(up[0][0], up[0][1]);
        for (const p of up) c.lineTo(p[0], p[1]);
        for (let i = down.length - 1; i >= 0; i--) c.lineTo(down[i][0], down[i][1]);
        c.closePath(); c.fill();
        c.restore();
      },

      draw(S) {
        const pose = { x: sh.x, y: sh.y, z: sh.z, yaw: sh.yaw + sh.shake, pitch: sh.pitch, roll: sh.roll };
        S.mesh(model.body, pose, { deform: sway });
        S.mesh(model.upper, pose, { deform: hinge(sh.jaw * 0.45) });
        S.mesh(model.lower, pose, { deform: hinge(-sh.jaw) });
      }
    };
    L.scene.add(ent);
  }

  function finish(message) {
    if (!ent) return;
    ent.dead = true; ent = null;
    offDelta?.(); offDelta = null;
    label?.remove(); label = bar = null;
    if (L.sea) { L.sea.threat = null; L.sea.busy = false; }
    if (message) L.util.toast('Megalodon', message);
  }

  L.megalodon = { summon, get active() { return !!ent; } };

  L.gag({
    id: 'megalodon',
    min: 3,
    start() {},
    stop() { clearTimeout(gulpTimer); if (L.cursor.held) L.cursor.drop(); finish(null); }
  });
})();
