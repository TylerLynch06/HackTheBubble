// Low-poly models for the high seas, built in code. Each model is a list of 3D
// points and flat coloured faces; scene.js lights and draws them.
// Local axes: +x forward (bow / nose), +y right (starboard), +z up. Units are px.
//
//   Liquid.models.ship(faction) -> { bow, stern }   two halves, so it can break
//   Liquid.models.duck()        -> mesh
//   Liquid.models.ball()        -> mesh (cannonball)
//   Liquid.models.shark()       -> { body, upper, lower, sections }
//   Liquid.models.hump()        -> mesh (a whale's back)
(() => {
  const L = window.Liquid;

  // Slightly vary each face's colour so flat surfaces still look faceted.
  const tone = (c, amt = 0.07) => { const k = 1 - amt + Math.random() * amt * 2; return [c[0] * k, c[1] * k, c[2] * k]; };

  class Builder {
    constructor() { this.v = []; this.f = []; }
    vert(x, y, z) { this.v.push([x, y, z]); return this.v.length - 1; }
    face(i, c, two) { this.f.push({ i, c: tone(c), two: !!two }); }

    // Faces added inside fn() form one convex solid: flip each so it faces outwards.
    solid(fn) {
      const v0 = this.v.length, f0 = this.f.length;
      fn();
      let cx = 0, cy = 0, cz = 0;
      const n = this.v.length - v0;
      for (let i = v0; i < this.v.length; i++) { cx += this.v[i][0]; cy += this.v[i][1]; cz += this.v[i][2]; }
      cx /= n; cy /= n; cz /= n;
      for (let k = f0; k < this.f.length; k++) {
        const f = this.f[k];
        if (f.two) continue;
        const a = this.v[f.i[0]], b = this.v[f.i[1]], c = this.v[f.i[2]];
        const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
        const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
        const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        let fx = 0, fy = 0, fz = 0;
        for (const idx of f.i) { fx += this.v[idx][0]; fy += this.v[idx][1]; fz += this.v[idx][2]; }
        const m = f.i.length;
        if (nx * (fx / m - cx) + ny * (fy / m - cy) + nz * (fz / m - cz) < 0) f.i.reverse();
      }
    }

    box(x0, x1, y0, y1, z0, z1, c, top) {
      this.solid(() => {
        const p = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
        const lo = p.map(([x, y]) => this.vert(x, y, z0)), hi = p.map(([x, y]) => this.vert(x, y, z1));
        for (let i = 0; i < 4; i++) this.face([lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]], c);
        this.face(hi.slice(), top || c);
        this.face(lo.slice().reverse(), c);
      });
    }

    // Stack copies of a flat outline at different heights and join them up.
    // rings: [{ z, k (width scale), c (colour of the band below this ring) }]
    loft(outline, rings, topColour) {
      this.solid(() => {
        const idx = rings.map((r) => outline.map(([x, y]) => this.vert(x, y * r.k, r.z)));
        const n = outline.length;
        for (let r = 1; r < rings.length; r++) {
          for (let i = 0; i < n; i++) {
            this.face([idx[r - 1][i], idx[r - 1][(i + 1) % n], idx[r][(i + 1) % n], idx[r][i]], rings[r].c);
          }
        }
        this.face(idx[rings.length - 1].slice(), topColour);
        this.face(idx[0].slice().reverse(), rings[1].c);
      });
    }

    // A faceted ellipsoid.
    blob(cx, cy, cz, rx, ry, rz, colourAt, lat = 3, lon = 6) {
      this.solid(() => {
        const rows = [];
        for (let a = 0; a <= lat; a++) {
          const phi = (a / lat) * Math.PI, row = [];
          const n = (a === 0 || a === lat) ? 1 : lon;
          for (let b = 0; b < n; b++) {
            const th = (b / lon) * Math.PI * 2;
            row.push(this.vert(cx + Math.sin(phi) * Math.cos(th) * rx, cy + Math.sin(phi) * Math.sin(th) * ry, cz + Math.cos(phi) * rz));
          }
          rows.push(row);
        }
        for (let a = 0; a < lat; a++) {
          const A = rows[a], B = rows[a + 1];
          for (let b = 0; b < lon; b++) {
            const b2 = (b + 1) % lon;
            const zMid = cz + Math.cos(((a + 0.5) / lat) * Math.PI) * rz;
            const c = typeof colourAt === 'function' ? colourAt(zMid) : colourAt;
            if (A.length === 1) this.face([A[0], B[b], B[b2]], c);
            else if (B.length === 1) this.face([A[b], B[0], A[b2]], c);
            else this.face([A[b], B[b], B[b2], A[b2]], c);
          }
        }
      });
    }

    mesh() { return { v: this.v, f: this.f }; }
  }

  // ---------- ships ----------
  const FLEETS = {
    pirate: { hull: [58, 38, 26], trim: [150, 30, 36], deck: [128, 92, 58], sail: [44, 44, 52], flag: [205, 30, 45] },
    navy: { hull: [112, 74, 40], trim: [226, 186, 92], deck: [176, 134, 86], sail: [246, 240, 224], flag: [38, 86, 200] },
    merchant: { hull: [150, 112, 72], trim: [72, 138, 96], deck: [196, 160, 112], sail: [224, 196, 148], flag: [60, 160, 96] }
  };
  const WOOD = [72, 46, 26], IRON = [34, 34, 40];

  function sail(b, x, zLo, zHi, half, colour) {
    // Two panels meeting in a shallow V: a low-poly billow.
    const belly = 5;
    const quad = (y0, y1, x0, x1) => b.face([b.vert(x + x0, y0, zLo), b.vert(x + x1, y1, zLo), b.vert(x + x1 * 0.8, y1 * 0.86, zHi), b.vert(x + x0 * 0.8, y0 * 0.86, zHi)], colour, true);
    quad(-half, 0, 0, belly);
    quad(0, half, belly, 0);
  }

  function shipHalf(f, front) {
    const b = new Builder();
    // Outline of this half of the hull, seen from above.
    const outline = front
      ? [[0, 14], [20, 12.5], [36, 7], [47, 0], [36, -7], [20, -12.5], [0, -14]]
      : [[-44, 9], [-40, 12], [-18, 14], [0, 14], [0, -14], [-18, -14], [-40, -12], [-44, -9]];
    b.loft(outline, [
      { z: -5, k: 0.5, c: f.hull }, { z: 2, k: 0.94, c: f.hull }, { z: 5, k: 1, c: f.trim }, { z: 8, k: 1, c: f.hull }
    ], f.deck);

    if (front) {
      b.box(24, 37, -6, 6, 8, 11, f.hull, f.deck);            // forecastle
      b.box(13, 15.4, -1.2, 1.2, 8, 52, WOOD);                // foremast
      b.box(46, 60, -0.9, 0.9, 8, 10, WOOD);                  // bowsprit
      sail(b, 15, 16, 34, 17, f.sail);
      sail(b, 15, 36, 49, 12, f.sail);
      for (const x of [6, 20]) for (const y of [-13, 13]) b.box(x, x + 5, y - 2, y + 2, 8, 10.5, IRON);
    } else {
      b.box(-43, -24, -11, 11, 8, 14, f.hull, f.deck);        // stern castle
      b.box(-43, -40, -9, 9, 14, 17, f.trim);                 // taffrail
      b.box(-17, -14.6, -1.2, 1.2, 8, 58, WOOD);              // mainmast
      sail(b, -15, 16, 38, 19, f.sail);
      sail(b, -15, 40, 54, 13, f.sail);
      b.face([b.vert(-16, 0, 58), b.vert(-16, 0, 65), b.vert(-29, 0, 61.5)], f.flag, true); // flag
      for (const x of [-12, -24]) for (const y of [-13, 13]) b.box(x, x + 5, y - 2, y + 2, 8, 10.5, IRON);
    }
    return b.mesh();
  }

  // ---------- duck ----------
  function duck() {
    const b = new Builder();
    const yellow = (z) => (z > 4 ? [255, 222, 70] : [240, 176, 20]);
    b.blob(-1, 0, 4, 11, 7.5, 5.5, yellow, 3, 6);                       // body
    b.blob(7.5, 0, 11, 5, 4.6, 4.6, [255, 226, 80], 3, 6);              // head
    b.solid(() => {                                                      // beak
      const tip = b.vert(16, 0, 9.6);
      const r = [b.vert(11, -2.4, 10.8), b.vert(11, 2.4, 10.8), b.vert(11, 2.4, 8.6), b.vert(11, -2.4, 8.6)];
      for (let i = 0; i < 4; i++) b.face([r[i], r[(i + 1) % 4], tip], [240, 120, 20]);
      b.face(r.slice(), [240, 120, 20]);
    });
    b.solid(() => {                                                      // tail
      const tip = b.vert(-14, 0, 9);
      const r = [b.vert(-9, -3, 6), b.vert(-9, 3, 6), b.vert(-9, 0, 3)];
      for (let i = 0; i < 3; i++) b.face([r[i], r[(i + 1) % 3], tip], [240, 176, 20]);
      b.face(r.slice(), [240, 176, 20]);
    });
    b.box(9.6, 11, -3.6, -2.6, 12, 13.2, [20, 20, 24]);                 // eyes
    b.box(9.6, 11, 2.6, 3.6, 12, 13.2, [20, 20, 24]);
    return b.mesh();
  }

  function ball() {
    const b = new Builder();
    b.blob(0, 0, 0, 3.4, 3.4, 3.4, [38, 38, 44], 2, 5);
    return b.mesh();
  }

  function hump() {
    const b = new Builder();
    b.blob(0, 0, 0, 92, 34, 26, (z) => (z > 6 ? [62, 84, 104] : [44, 62, 82]), 4, 8);
    return b.mesh();
  }

  // ---------- megalodon ----------
  // The body is a tube of 8-sided rings from the tail to the back of the mouth.
  // The snout is two separate half-cones (upper and lower jaw) so it can open.
  const SHARK_SECTIONS = [
    // x, half-width, half-height
    [-150, 3, 7], [-100, 11, 15], [-40, 25, 25], [30, 31, 29], [70, 27, 25], [96, 23, 21]
  ];
  const SKIN_TOP = [52, 72, 90], SKIN_MID = [92, 116, 134], SKIN_BELLY = [228, 234, 238];
  const GUM = [150, 28, 44], TOOTH = [250, 250, 244];

  function sharkBody() {
    const b = new Builder();
    const K = 8;
    const skin = (z, h) => (z > h * 0.3 ? SKIN_TOP : z < -h * 0.35 ? SKIN_BELLY : SKIN_MID);
    b.solid(() => {
      const rings = SHARK_SECTIONS.map(([x, w, h]) => {
        const r = [];
        for (let k = 0; k < K; k++) { const a = (k / K) * Math.PI * 2 + Math.PI / K; r.push(b.vert(x, Math.cos(a) * w, Math.sin(a) * h)); }
        return r;
      });
      for (let s = 1; s < rings.length; s++) {
        const h = (SHARK_SECTIONS[s][2] + SHARK_SECTIONS[s - 1][2]) / 2;
        for (let k = 0; k < K; k++) {
          const k2 = (k + 1) % K;
          const zMid = (b.v[rings[s][k]][2] + b.v[rings[s][k2]][2] + b.v[rings[s - 1][k]][2] + b.v[rings[s - 1][k2]][2]) / 4;
          b.face([rings[s - 1][k], rings[s - 1][k2], rings[s][k2], rings[s][k]], skin(zMid, h));
        }
      }
      b.face(rings[0].slice(), SKIN_MID);
      b.face(rings[rings.length - 1].slice(), GUM); // the back of the mouth
    });
    // dorsal fin: a thin swept-back wedge
    b.solid(() => {
      const rear = b.vert(-24, 0, 20), front = b.vert(38, 0, 24), right = b.vert(8, 4.5, 20), left = b.vert(8, -4.5, 20);
      const tip = b.vert(-22, 0, 76);
      const dark = [40, 58, 76];
      b.face([front, right, tip], dark); b.face([right, rear, tip], dark);
      b.face([rear, left, tip], dark); b.face([left, front, tip], dark);
      b.face([rear, right, front, left], dark);
    });
    // tail fin (vertical crescent) and pectoral fins (flat), all thin: two-sided
    const fin = [44, 62, 80];
    b.face([b.vert(-146, 0, 6), b.vert(-196, 0, 56), b.vert(-166, 0, 2)], fin, true);
    b.face([b.vert(-146, 0, -6), b.vert(-186, 0, -40), b.vert(-166, 0, 0)], fin, true);
    b.face([b.vert(50, 26, -8), b.vert(8, 84, -16), b.vert(14, 28, -8)], fin, true);
    b.face([b.vert(50, -26, -8), b.vert(8, -84, -16), b.vert(14, -28, -8)], fin, true);
    b.face([b.vert(-96, 10, -4), b.vert(-124, 34, -8), b.vert(-116, 9, -4)], fin, true);
    b.face([b.vert(-96, -10, -4), b.vert(-124, -34, -8), b.vert(-116, -9, -4)], fin, true);
    return b.mesh();
  }

  // One jaw: half a cone from the mouth (x = 96) to the nose, with a flat gum
  // side and a row of teeth along its rim. sign = +1 upper, -1 lower.
  function sharkJaw(sign) {
    const b = new Builder();
    const W = 23, H = 21, K = 5;
    b.solid(() => {
      const ringAt = (x, w, h) => {
        const r = [];
        for (let k = 0; k <= K; k++) { const a = (k / K) * Math.PI; r.push(b.vert(x, Math.cos(a) * w, sign * Math.sin(a) * h)); }
        return r;
      };
      const r0 = ringAt(96, W, H), r1 = ringAt(128, 15, 12);
      const tip = b.vert(sign > 0 ? 156 : 146, 0, 0);
      const skin = sign > 0 ? SKIN_TOP : SKIN_BELLY;
      for (let k = 0; k < K; k++) {
        b.face([r0[k], r0[k + 1], r1[k + 1], r1[k]], k === 0 || k === K - 1 ? SKIN_MID : skin);
        b.face([r1[k], r1[k + 1], tip], skin);
      }
      b.face([r0[0], r1[0], tip, r1[K], r0[K]], GUM); // roof / floor of the mouth
      b.face(r0.slice(), GUM);
    });
    // teeth: little triangles standing on the rim, pointing into the mouth
    const rim = (t, side) => {
      // along the rim from the hinge (t = 0) to the nose (t = 1)
      const x = 100 + t * (sign > 0 ? 52 : 43), y = side * (W - 1) * (1 - t * 0.92);
      return [x, y];
    };
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const [x0, y0] = rim(i / 7, side), [x1, y1] = rim((i + 1) / 7, side);
        b.face([b.vert(x0, y0, 0), b.vert(x1, y1, 0), b.vert((x0 + x1) / 2, (y0 + y1) / 2 * 0.92, -sign * 8)], TOOTH, true);
      }
    }
    if (sign > 0) { // eyes
      b.box(108, 113, 15.5, 17.5, 6, 10, [14, 16, 20]);
      b.box(108, 113, -17.5, -15.5, 6, 10, [14, 16, 20]);
    }
    return b.mesh();
  }

  let cache = {};
  const once = (key, make) => cache[key] || (cache[key] = make());

  L.models = {
    FLEETS,
    ship: (faction) => once('ship-' + faction, () => ({ bow: shipHalf(FLEETS[faction], true), stern: shipHalf(FLEETS[faction], false) })),
    duck: () => once('duck', duck),
    ball: () => once('ball', ball),
    hump: () => once('hump', hump),
    shark: () => once('shark', () => ({ body: sharkBody(), upper: sharkJaw(1), lower: sharkJaw(-1), sections: SHARK_SECTIONS }))
  };
})();
