// Ships (stage 3+): a small war, seen from above. Ships of three flags wander in
// from the edges of the window at random. Pirates and the navy fire broadsides at
// each other on sight; merchants are fair game for pirates and just try to leave.
// Cannonballs arc through the air with their shadows on the water; the ones that
// miss land on your page and knock letters loose.
// A ship that takes three hits explodes, breaks in two and goes down: the bow
// rears up and slides under, the stern rolls over, planks are left floating.
//
//   Liquid.ships.battle()   bring in an opposing pair right now (Alt+S)
//   Liquid.ships.afloat()   ships a kraken could take an interest in
(() => {
  const L = window.Liquid;
  const MAX_SHIPS = 5;
  const RANGE = 330;
  const NAMES = {
    pirate: ['The Unsubscribe', 'Dark Pattern', 'The Paywall', 'Captcha\'s Revenge'],
    navy: ['HMS Terms & Conditions', 'HMS Cookie Consent', 'HMS Two-Factor', 'HMS Mandatory Update'],
    merchant: ['SS Free Trial', 'SS Newsletter', 'SS Sponsored Content']
  };
  const HOSTILE = { pirate: ['navy', 'merchant'], navy: ['pirate'], merchant: [] };

  let ships = [], running = false, spawnTimer = 0, lastToast = 0, frame = 0;

  const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

  // ---------- cannonball ----------
  function fire(from, at, side) {
    const { rand } = L.util;
    const hit = Math.random() < 0.28;
    let tx = at.x, ty = at.y;
    if (!hit) { const a = rand(0, 6.283), d = rand(55, 150); tx += Math.cos(a) * d; ty += Math.sin(a) * d; }
    // leaves from the gun deck on the side facing the enemy
    const sx = from.x - Math.sin(from.yaw) * side * 13, sy = from.y + Math.cos(from.yaw) * side * 13;
    const T = Math.max(34, Math.hypot(tx - sx, ty - sy) / 5.2);
    const ball = {
      t: 0, x: sx, y: sy, z: 10,
      update() {
        const p = ++this.t / T;
        this.x = sx + (tx - sx) * p; this.y = sy + (ty - sy) * p;
        this.z = 10 + Math.sin(Math.PI * p) * (30 + T * 0.5);
        if (p >= 1) { this.dead = true; land(tx, ty, hit ? at : null, from); }
      },
      shadow(c) { L.scene.blobShadow(c, this.x - 4, this.y - 4, 0, 4, 3, 0.3); },
      draw(S) { S.mesh(L.models.ball(), { x: this.x, y: this.y, z: this.z, yaw: this.t * 0.3 }, { clip: false }); }
    };
    L.scene.add(ball);
    // muzzle: flash, smoke, recoil
    L.scene.burst('fire', sx, sy, 10, 4, { speed: 1.2, up: 0.6, life: 12, size: 4, colours: [[255, 210, 90], [255, 150, 40]] });
    L.scene.burst('smoke', sx, sy, 11, 4, { speed: 0.7, up: 0.5, life: 46, size: 5, c: [235, 235, 235] });
    L.water.splash(from.x, from.y, 22, -1.1);
    from.kick = -side * 0.22;
  }

  function land(x, y, target, from) {
    if (target && target.afloat && Math.hypot(target.x - x, target.y - y) < 46) {
      target.hp--;
      target.kick = (Math.random() < 0.5 ? 1 : -1) * 0.35;
      L.scene.burst('chunk', target.x, target.y, 12, 9, { speed: 2.2, up: 4, life: 60, size: 3, colours: [[92, 60, 34], [140, 100, 60], [60, 40, 24]], floats: true });
      L.scene.burst('fire', target.x, target.y, 14, 6, { speed: 1, up: 1.2, life: 22, size: 6, colours: [[255, 200, 70], [255, 120, 30]] });
      L.water.splash(target.x, target.y, 30, -1.6);
      if (target.hp <= 0) sink(target, from.name);
    } else {
      // Missed: it lands on your webpage instead.
      L.water.splash(x, y, 40, -2.8);
      L.scene.emit({ k: 'ring', x, y, life: 34, size: 6, grow: 46 });
      L.scene.burst('spray', x, y, 2, 10, { speed: 1.6, up: 4.2, life: 40, size: 2.6 });
      if (L.flotsam) for (let k = 0; k < 4; k++) L.flotsam.knockAt(x + L.util.rand(-22, 22), y + L.util.rand(-14, 14));
    }
  }

  // ---------- wreck: the two halves going down ----------
  function wreck(ship) {
    const model = L.models.ship(ship.kind);
    const fx = Math.cos(ship.yaw), fy = Math.sin(ship.yaw);
    const half = (mesh, sign) => ({
      mesh, sign, x: ship.x, y: ship.y, z: 0, yaw: ship.yaw, pitch: 0, roll: ship.roll,
      vx: fx * sign * 0.5 + ship.vx * 0.4, vy: fy * sign * 0.5 + ship.vy * 0.4, vyaw: L.util.rand(-0.006, 0.006) + sign * 0.004
    });
    const bow = half(model.bow, 1), stern = half(model.stern, -1);
    let age = 0;

    // the moment it breaks
    L.scene.burst('chunk', ship.x, ship.y, 10, 26, { speed: 3.4, up: 5.5, life: 80, size: 3.6, colours: [[92, 60, 34], [140, 100, 60], [60, 40, 24], [230, 220, 200]], floats: true });
    L.scene.burst('fire', ship.x, ship.y, 12, 16, { speed: 2, up: 2, life: 30, size: 9, colours: [[255, 220, 110], [255, 140, 40], [255, 80, 30]] });
    L.scene.burst('smoke', ship.x, ship.y, 16, 10, { speed: 0.9, up: 0.9, life: 110, size: 8, colours: [[60, 60, 64], [96, 96, 100]] });
    L.scene.emit({ k: 'ring', x: ship.x, y: ship.y, life: 50, size: 12, grow: 90 });
    L.water.splash(ship.x, ship.y, 60, -3.6);

    L.scene.add({
      update() {
        age++;
        const k = Math.min(1, age / 230), ease = k * k * (3 - 2 * k);
        for (const h of [bow, stern]) {
          h.x += h.vx; h.y += h.vy; h.vx *= 0.985; h.vy *= 0.985; h.yaw += h.vyaw;
        }
        // The bow rears up and slides under stern-first; the stern rolls onto its side.
        bow.pitch = ease * 1.15;
        bow.z = -ease * ease * 78;
        stern.roll = ship.roll + ease * 1.35 * (ship.roll >= 0 ? 1 : -1);
        stern.pitch = -ease * 0.5;
        stern.z = -Math.max(0, k - 0.15) * 74;

        if (age % 5 === 0 && age < 250) {
          const h = age % 10 === 0 ? bow : stern;
          L.scene.emit({ k: 'ring', x: h.x + L.util.rand(-22, 22), y: h.y + L.util.rand(-16, 16), life: 30, size: 3, grow: 22 });
          L.water.splash(h.x + L.util.rand(-24, 24), h.y + L.util.rand(-16, 16), 14, L.util.rand(-0.8, 0.5));
        }
        if (age % 9 === 0 && age < 110) {
          L.scene.emit({ k: 'smoke', x: stern.x, y: stern.y, z: 18, vz: 0.9, vx: 0.2, life: 90, size: 7, c: [70, 70, 74] });
        }
        if (age > 270) this.dead = true;
      },
      draw(S) {
        for (const h of [bow, stern]) S.mesh(h.mesh, h);
      }
    });
  }

  function sink(ship, who) {
    if (!ship.afloat) return;
    ship.afloat = false; ship.dead = true;
    ships = ships.filter((s) => s !== ship);
    wreck(ship);
    const now = performance.now();
    if (now - lastToast > 7000) {
      lastToast = now;
      L.util.toast('Shipping update', `${ship.name} has been sunk by ${who}. Your delivery may be delayed.`, 4000);
    }
  }

  // ---------- a ship ----------
  function spawn(kind) {
    const { rand, pick } = L.util;
    const vw = innerWidth, vh = innerHeight, edge = Math.floor(rand(0, 4));
    const pos = [[-70, rand(0.15, 0.85) * vh], [vw + 70, rand(0.15, 0.85) * vh], [rand(0.15, 0.85) * vw, -70], [rand(0.15, 0.85) * vw, vh + 70]][edge];
    const model = L.models.ship(kind);
    const ship = {
      kind, name: pick(NAMES[kind]), x: pos[0], y: pos[1], vx: 0, vy: 0,
      yaw: Math.atan2(vh / 2 - pos[1], vw / 2 - pos[0]), roll: 0, kick: 0, speed: 0,
      hp: 3, afloat: true, reload: rand(160, 300), life: rand(2400, 4200), orbit: Math.random() < 0.5 ? 1 : -1,
      ph: rand(0, 10), wp: null, leaving: false,
      sinkBy(who) { sink(this, who); },

      update(t) {
        const vw = innerWidth, vh = innerHeight;
        if (--this.life <= 0) this.leaving = true;
        const enemy = this.leaving ? null : nearest(this, HOSTILE[this.kind]);
        const hunter = this.kind === 'merchant' ? nearest(this, ['pirate'], true) : null;
        let want;
        if (this.leaving) {
          want = Math.atan2(this.y - vh / 2, this.x - vw / 2);            // straight out
        } else if (hunter && hunter.d < 300) {
          want = Math.atan2(this.y - hunter.s.y, this.x - hunter.s.x);     // run away
        } else if (enemy) {
          const bearing = Math.atan2(enemy.s.y - this.y, enemy.s.x - this.x);
          // close in, then turn side-on and circle so the guns bear
          want = enemy.d > 210 ? bearing + 0.45 * this.orbit : bearing + (Math.PI / 2) * this.orbit;
        } else {
          if (!this.wp || Math.hypot(this.wp[0] - this.x, this.wp[1] - this.y) < 70) {
            this.wp = [rand(0.12, 0.88) * vw, rand(0.15, 0.85) * vh];
          }
          want = Math.atan2(this.wp[1] - this.y, this.wp[0] - this.x);
        }
        // stay on the page unless leaving
        const m = 60;
        if (!this.leaving && (this.x < m || this.x > vw - m || this.y < m || this.y > vh - m)) {
          want = Math.atan2(vh / 2 - this.y, vw / 2 - this.x);
        }
        const turn = L.util.clamp(wrap(want - this.yaw), -0.017, 0.017);
        this.yaw += turn;
        this.speed += ((this.leaving ? 1.7 : hunter ? 1.5 : 1.05) - this.speed) * 0.03;
        this.vx = Math.cos(this.yaw) * this.speed; this.vy = Math.sin(this.yaw) * this.speed;
        this.x += this.vx; this.y += this.vy;

        // heel into the turn, rock on the swell and from recoil
        const sl = L.water.slopeAt(this.x, this.y);
        this.kick *= 0.93;
        const lean = turn * 9 + Math.sin(t * 1.3 + this.ph) * 0.05 + this.kick +
          L.util.clamp((-sl.x * Math.sin(this.yaw) + sl.y * Math.cos(this.yaw)) * 0.5, -0.25, 0.25);
        this.roll += (lean - this.roll) * 0.15;

        if (enemy && enemy.d < RANGE && --this.reload <= 0 && this.kind !== 'merchant') {
          const bearing = Math.atan2(enemy.s.y - this.y, enemy.s.x - this.x);
          const abeam = Math.sin(wrap(bearing - this.yaw));
          if (Math.abs(abeam) > 0.45) {
            const side = abeam > 0 ? 1 : -1;
            fire(this, enemy.s, side);
            setTimeout(() => { if (this.afloat && enemy.s.afloat) fire(this, enemy.s, side); }, 160);
            this.reload = rand(190, 300);
          } else this.reload = 20;
        } else if (this.reload > 0) this.reload--;

        // wake and, when badly hurt, smoke
        frame++;
        if (frame % 4 === 0) {
          const bx = this.x - Math.cos(this.yaw) * 40, by = this.y - Math.sin(this.yaw) * 40;
          L.scene.emit({ k: 'foam', x: bx + rand(-7, 7), y: by + rand(-7, 7), life: 46, size: rand(2.5, 5) });
          if (frame % 16 === 0) L.water.splash(bx, by, 12, -0.3);
        }
        if (this.hp === 1 && frame % 7 === 0) {
          L.scene.emit({ k: 'smoke', x: this.x, y: this.y, z: 16, vz: 0.8, vx: 0.25, life: 70, size: 5, c: [60, 60, 64] });
          if (frame % 14 === 0) L.scene.emit({ k: 'fire', x: this.x + rand(-8, 8), y: this.y + rand(-5, 5), z: 12, vz: 0.6, life: 18, size: 5, c: [255, 150, 40] });
        }

        const off = this.x < -160 || this.x > vw + 160 || this.y < -160 || this.y > vh + 160;
        if (off && this.leaving) { this.dead = true; this.afloat = false; ships = ships.filter((s) => s !== this); }
      },

      shadow(c) { L.scene.blobShadow(c, this.x, this.y, this.yaw, 46, 15, 0.28); },

      draw(S, t) {
        const bob = Math.sin(t * 1.6 + this.ph) * 0.9 - L.water.heightAt(this.x, this.y) * 2.5;
        const pose = { x: this.x, y: this.y, z: bob, yaw: this.yaw, roll: this.roll, pitch: Math.sin(t * 1.1 + this.ph) * 0.03 };
        S.mesh(model.stern, pose);
        S.mesh(model.bow, pose);
      }
    };
    ships.push(ship);
    L.scene.add(ship);
    return ship;
  }

  function nearest(me, kinds, any) {
    let best = null;
    for (const s of ships) {
      if (s === me || !s.afloat || !kinds.includes(s.kind)) continue;
      const d = Math.hypot(s.x - me.x, s.y - me.y);
      if ((any || d < 520) && (!best || d < best.d)) best = { s, d };
    }
    return best;
  }

  // Keep the sea busy: top the fleet up at random, favouring whichever side is losing.
  function reinforce() {
    if (!running) return;
    if (L.admin.autoChaos && !document.hidden && ships.length < MAX_SHIPS) {
      const count = (k) => ships.filter((s) => s.kind === k).length;
      const p = count('pirate'), n = count('navy');
      let kind = p < n ? 'pirate' : n < p ? 'navy' : L.util.pick(['pirate', 'navy']);
      if (p && n && Math.random() < 0.28) kind = 'merchant';
      spawn(kind);
    }
    spawnTimer = setTimeout(reinforce, L.util.rand(5000, 11000));
  }

  function battle() {
    if (!running) return;
    if (ships.length < MAX_SHIPS + 1) { spawn('pirate'); spawn('navy'); }
  }

  L.ships = { battle, afloat: () => ships.filter((s) => s.afloat && s.x > 0 && s.x < innerWidth && s.y > 0 && s.y < innerHeight) };

  L.gag({
    id: 'ships',
    min: 3,
    start() {
      running = true;
      spawnTimer = setTimeout(() => { if (L.admin.autoChaos) battle(); reinforce(); }, 1800);
    },
    stop() {
      running = false;
      clearTimeout(spawnTimer);
      for (const s of ships) { s.dead = true; s.afloat = false; }
      ships = [];
    }
  });
})();
