/**
 * 30 more 3D hero designs. Each is a particle field: one formula places every point for time t.
 * Built on the same soft glowing points as the first 10 scenes, lit in the site's colours
 * (mix 0 = the accent, 1 = the glow colour), with depth fade.
 */
const TAU = Math.PI * 2;

export function moreScenes(softPoints) {
  /**
   * @param count  points on desktop (phones get 60%)
   * @param opts   size/near/far of the points, camera, `shift` (move right of the headline), spin/tilt of the group
   * @param gen    (i, n, t, o, r) => sets o.x/y/z/mix/scale/fade; r(k) is a fixed random 0..1 for this point
   */
  function field(ctx, count, opts, gen) {
    const n = ctx.mobile ? Math.round(count * 0.6) : count;
    const p = softPoints(ctx, n, { size: opts.size ?? 6, near: opts.near ?? 3, far: opts.far ?? 24 });
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const g = new ctx.THREE.Group();
    g.add(p.obj);
    g.position.set((opts.shift ?? 0) * ctx.cx, opts.y ?? 0, opts.z ?? 0);
    g.rotation.x = opts.tilt ?? 0;
    g.rotation.z = opts.roll ?? 0;
    ctx.scene.add(g);
    const o = { x: 0, y: 0, z: 0, mix: 0, scale: 1, fade: 1 };
    let base = 0;
    const r = (k) => seeds[base + k];
    return {
      cam: opts.cam ?? { pos: [0, 0, 10], look: [0, 0, 0], drift: 0.6, par: 1.4 },
      update(t) {
        for (let i = 0; i < n; i++) {
          base = i * 4;
          o.x = o.y = o.z = 0;
          o.mix = 0;
          o.scale = 1;
          o.fade = 1;
          gen(i, n, t, o, r);
          p.pos[i * 3] = o.x;
          p.pos[i * 3 + 1] = o.y;
          p.pos[i * 3 + 2] = o.z;
          p.mix[i] = o.mix;
          p.scale[i] = o.scale;
          p.fade[i] = o.fade;
        }
        if (opts.spin) g.rotation.y = t * opts.spin;
        p.dirty();
      },
    };
  }
  const wrap = (v, lo, hi) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

  return {
    galaxy: (ctx) =>
      field(ctx, 5200, { size: 4.5, shift: 0.7, tilt: 1.05, spin: 0.05 }, (i, n, t, o, r) => {
        const arm = i % 4;
        const d = Math.pow(r(0), 0.7) * 7;
        const a = (arm / 4) * TAU + d * 0.55 + t * 0.12 + (r(1) - 0.5) * (0.9 - d * 0.06);
        o.x = Math.cos(a) * d;
        o.z = Math.sin(a) * d;
        o.y = (r(2) - 0.5) * (1.2 - d * 0.12);
        o.mix = 1 - d / 7;
        o.scale = 0.6 + r(3);
        o.fade = 0.5 + 0.5 * (1 - d / 7);
      }),
    warp: (ctx) =>
      field(ctx, 3200, { size: 7, near: 0.5, far: 50, cam: { pos: [0, 0, 6], look: [0, 0, -20], drift: 0.3, par: 1 } }, (i, n, t, o, r) => {
        const a = r(0) * TAU + t * 0.15;
        const rad = 2.2 + r(1) * 1.2;
        o.x = Math.cos(a) * rad;
        o.y = Math.sin(a) * rad;
        o.z = wrap(r(2) * 44 + t * 7, 0, 44) - 40;
        o.mix = r(3);
        o.scale = 0.8 + (o.z + 40) / 30;
      }),
    starfield: (ctx) =>
      field(ctx, 3200, { size: 7, near: 0.5, far: 60, cam: { pos: [0, 0, 5], look: [0, 0, -30], drift: 0.2, par: 0.8 } }, (i, n, t, o, r) => {
        o.x = (r(0) - 0.5) * 30;
        o.y = (r(1) - 0.5) * 18;
        o.z = wrap(r(2) * 50 + t * (3 + r(3) * 4), 0, 50) - 45;
        o.mix = r(3);
        o.scale = 0.6 + (o.z + 45) / 25;
      }),
    knot: (ctx) =>
      field(ctx, 3200, { size: 5, shift: 0.8, spin: 0.18, tilt: 0.4 }, (i, n, t, o, r) => {
        const u = (i / n) * TAU;
        const p = 2,
          q = 3;
        const rr = 2.2 + 0.9 * Math.cos(q * u);
        const off = (r(0) - 0.5) * 0.5;
        o.x = rr * Math.cos(p * u) + off;
        o.y = rr * Math.sin(p * u) + (r(1) - 0.5) * 0.5;
        o.z = 0.9 * Math.sin(q * u) * 2 + (r(2) - 0.5) * 0.5;
        o.mix = 0.5 + 0.5 * Math.sin(u * 3 + t);
      }),
    sphere: (ctx) =>
      field(ctx, 3000, { size: 5, shift: 0.8, spin: 0.12 }, (i, n, t, o, r) => {
        const y = 1 - (i / (n - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const a = i * 2.399963;
        const breathe = 3 + 0.35 * Math.sin(t * 1.1 + y * 4 + Math.cos(a * 3));
        o.x = Math.cos(a) * rad * breathe;
        o.y = y * breathe;
        o.z = Math.sin(a) * rad * breathe;
        o.mix = (y + 1) / 2;
      }),
    ripple: (ctx) =>
      field(ctx, 5200, { size: 7, near: 4, far: 30, cam: { pos: [0, 4, 9], look: [0, -1, -3], drift: 0.8, par: 1.8 } }, (i, n, t, o, r) => {
        const side = Math.round(Math.sqrt(n));
        const x = ((i % side) / side - 0.5) * 26;
        const z = (Math.floor(i / side) / side - 0.5) * 22 - 3;
        const d = Math.hypot(x - 3, z + 3);
        o.x = x;
        o.z = z;
        o.y = Math.sin(d * 1.1 - t * 2) * Math.exp(-d * 0.09) * 1.3 - 1.5;
        o.mix = o.y * 0.5 + 0.9;
      }),
    aurora: (ctx) =>
      field(ctx, 5200, { size: 7, near: 3, far: 30, cam: { pos: [0, -1, 10], look: [0, 1, 0], drift: 0.6, par: 1.2 } }, (i, n, t, o, r) => {
        const band = i % 3;
        const u = r(0);
        const x = (u - 0.5) * 26;
        o.x = x;
        o.z = Math.sin(x * 0.25 + t * 0.4 + band) * 2.5 - band * 2;
        const h = r(1);
        o.y = h * 5 - 1 + Math.sin(x * 0.4 + t * 0.7 + band) * 0.8;
        o.mix = h;
        o.fade = Math.min(1, (1.2 - h) * (0.8 + 0.4 * Math.sin(x * 0.6 + t + band * 2)));
      }),
    rain: (ctx) =>
      field(ctx, 3200, { size: 6, cam: { pos: [0, 0, 10], look: [0, 0, 0], drift: 0.4, par: 1 } }, (i, n, t, o, r) => {
        o.x = (r(0) - 0.5) * 24;
        o.z = (r(1) - 0.5) * 14;
        o.y = wrap(r(2) * 14 - t * (6 + r(3) * 5), -7, 7);
        o.scale = 0.6 + r(3);
        o.mix = r(1);
        o.fade = 0.6 + 0.4 * r(3);
      }),
    snow: (ctx) =>
      field(ctx, 2200, { size: 8 }, (i, n, t, o, r) => {
        o.x = (r(0) - 0.5) * 24 + Math.sin(t * 0.5 + r(1) * 10) * 0.6;
        o.z = (r(1) - 0.5) * 12;
        o.y = wrap(r(2) * 14 - t * (0.4 + r(3) * 0.5), -7, 7);
        o.scale = 0.5 + r(3) * 1.4;
        o.mix = 1;
        o.fade = 0.55 + 0.45 * r(0);
      }),
    fireflies: (ctx) =>
      field(ctx, 520, { size: 13 }, (i, n, t, o, r) => {
        o.x = (r(0) - 0.5) * 20 + Math.sin(t * (0.2 + r(1) * 0.3) + r(2) * 9) * 1.5 + ctx.cx * 0.3;
        o.y = (r(1) - 0.5) * 11 + Math.cos(t * (0.25 + r(3) * 0.3) + r(0) * 9) * 1.2;
        o.z = (r(2) - 0.5) * 10;
        o.fade = 0.25 + 0.75 * Math.max(0, Math.sin(t * (1 + r(3)) + r(0) * 20)) ** 2;
        o.mix = 1;
        o.scale = 0.8 + r(2);
      }),
    fountain: (ctx) =>
      field(ctx, 4200, { size: 6, shift: 0.8, cam: { pos: [0, 1, 9], look: [0, 1, 0], drift: 0.5, par: 1.2 } }, (i, n, t, o, r) => {
        const life = 2.4;
        const age = wrap(t + r(0) * life, 0, life);
        const a = r(1) * TAU;
        const sp = 1.6 + r(2) * 1.4;
        o.x = Math.cos(a) * sp * age;
        o.z = Math.sin(a) * sp * age;
        o.y = -3 + 5.5 * age - 2.3 * age * age;
        o.mix = age / life;
        o.fade = 1 - age / life;
      }),
    tornado: (ctx) =>
      field(ctx, 3400, { size: 4.5, shift: 0.8 }, (i, n, t, o, r) => {
        const h = r(0);
        const y = h * 10 - 5;
        const rad = 0.3 + h * h * 3.2;
        const a = r(1) * TAU + t * (2.5 - h * 1.5);
        o.x = Math.cos(a) * rad + Math.sin(t * 0.6 + h * 3) * 0.6 * h;
        o.z = Math.sin(a) * rad;
        o.y = y;
        o.mix = h;
      }),
    petals: (ctx) =>
      field(ctx, 3600, { size: 5, shift: 0.8, spin: 0.1, tilt: 0.3 }, (i, n, t, o, r) => {
        const th = (i / n) * TAU * 3;
        const k = 5 / 3;
        const rad = 3.6 * Math.cos(k * th) * (0.95 + 0.05 * Math.sin(t * 2 + th));
        o.x = rad * Math.cos(th + t * 0.1);
        o.y = rad * Math.sin(th + t * 0.1);
        o.z = Math.sin(th * 2 + t) * 0.5 + (r(0) - 0.5) * 0.3;
        o.mix = Math.abs(rad) / 3.6;
      }),
    infinity: (ctx) =>
      field(ctx, 2600, { size: 5, shift: 0.7, tilt: 0.25 }, (i, n, t, o, r) => {
        const s = (i / n) * TAU + t * 0.4;
        const d = 1 + Math.sin(s) ** 2;
        const sc = 4.2;
        o.x = (sc * Math.cos(s)) / d + (r(0) - 0.5) * 0.35;
        o.y = (sc * Math.sin(s) * Math.cos(s)) / d + (r(1) - 0.5) * 0.35;
        o.z = Math.sin(s * 2 + t) * 0.6;
        o.mix = (i / n + t * 0.1) % 1;
      }),
    atom: (ctx) =>
      field(ctx, 2400, { size: 5, shift: 0.8, spin: 0.15 }, (i, n, t, o, r) => {
        if (i < 200) {
          const a = r(0) * TAU,
            b = Math.acos(2 * r(1) - 1),
            rad = r(2) * 0.8;
          o.x = rad * Math.sin(b) * Math.cos(a);
          o.y = rad * Math.sin(b) * Math.sin(a);
          o.z = rad * Math.cos(b);
          o.mix = 1;
          o.scale = 1.6;
          return;
        }
        const orbit = i % 3;
        const a = (i / n) * TAU * 8 + t * (0.8 + orbit * 0.2);
        const x = Math.cos(a) * 3.8,
          y = Math.sin(a) * 1.4;
        const tilt = (orbit / 3) * Math.PI;
        o.x = x * Math.cos(tilt) - y * Math.sin(tilt);
        o.y = x * Math.sin(tilt) + y * Math.cos(tilt);
        o.z = y * 0.8;
        o.mix = orbit / 3;
        o.fade = 0.5 + 0.5 * Math.sin(a * 4);
      }),
    hexgrid: (ctx) =>
      field(ctx, 3600, { size: 6, near: 4, far: 26, cam: { pos: [0, 5, 8], look: [0, -1, -4], drift: 0.6, par: 1.6 } }, (i, n, t, o, r) => {
        const cols = Math.round(Math.sqrt(n * 1.3));
        const c = i % cols,
          row = Math.floor(i / cols);
        o.x = (c + (row % 2) * 0.5 - cols / 2) * 0.62;
        o.z = row * 0.54 - 14;
        const d = Math.hypot(o.x, o.z + 5);
        const wave = Math.sin(d * 0.8 - t * 1.6);
        o.y = -1.5 + Math.max(0, wave) * 0.8;
        o.mix = (wave + 1) / 2;
        o.scale = 0.7 + Math.max(0, wave) * 0.8;
      }),
    skyline: (ctx) =>
      field(ctx, 4800, { size: 7, near: 4, far: 34, cam: { pos: [0, 1.5, 11], look: [0, 0.5, -4], drift: 0.8, par: 1.6 } }, (i, n, t, o, r) => {
        const bars = 60;
        const b = i % bars;
        const h = 1 + ((Math.sin(b * 12.9898) * 43758.5453) % 1 + 1) % 1 * 5;
        o.x = (b / bars - 0.5) * 26;
        o.z = -4 - (b % 5) * 1.3;
        o.y = -3 + r(0) * h;
        o.mix = r(0);
        o.fade = 0.6 + 0.4 * Math.max(0, Math.sin(t * 0.8 + b * 1.7 + r(1) * 6));
      }),
    equalizer: (ctx) =>
      field(ctx, 3200, { size: 6, near: 3, far: 26 }, (i, n, t, o, r) => {
        const bars = 40;
        const b = i % bars;
        const level = 1.5 + 2.2 * (0.5 + 0.5 * Math.sin(t * 2.2 + b * 0.55)) * (0.6 + 0.4 * Math.sin(t * 1.3 + b * 0.21));
        const y = r(0) * level;
        o.x = (b / bars - 0.5) * 20;
        o.y = y - 2.5;
        o.z = (r(1) - 0.5) * 0.4 - 2;
        o.mix = y / 3.7;
      }),
    terrain: (ctx) =>
      field(ctx, 5000, { size: 5, near: 4, far: 30, cam: { pos: [0, 3.5, 9], look: [0, 0, -6], drift: 0.6, par: 1.6 } }, (i, n, t, o, r) => {
        const side = Math.round(Math.sqrt(n));
        const x = ((i % side) / side - 0.5) * 30;
        const zi = Math.floor(i / side) / side;
        const z = wrap(zi * 26 + t * 1.2, 0, 26) - 22;
        const zz = zi * 26 + t * 1.2;
        const h = Math.sin(x * 0.35) * Math.cos(zz * 0.3) * 1.4 + Math.sin(x * 0.9 + zz * 0.5) * 0.4 + Math.abs(x) * 0.12;
        o.x = x;
        o.z = z;
        o.y = h - 2.2;
        o.mix = (h + 1.5) / 4;
      }),
    dunes: (ctx) =>
      field(ctx, 4600, { size: 5, near: 4, far: 28, cam: { pos: [0, 2.2, 9], look: [0, -0.5, -5], drift: 0.8, par: 1.6 } }, (i, n, t, o, r) => {
        const side = Math.round(Math.sqrt(n));
        const x = ((i % side) / side - 0.5) * 30;
        const z = (Math.floor(i / side) / side - 0.5) * 24 - 5;
        const h = Math.sin(x * 0.3 + t * 0.2) * 0.8 + Math.sin(x * 0.12 - z * 0.2 + t * 0.15) * 1.2;
        o.x = x;
        o.z = z;
        o.y = h - 2;
        o.mix = (h + 2) / 4;
      }),
    lattice: (ctx) =>
      field(ctx, 1728, { size: 6, shift: 0.8, spin: 0.2, tilt: 0.5 }, (i, n, t, o, r) => {
        const s = 12;
        const x = i % s,
          y = Math.floor(i / s) % s,
          z = Math.floor(i / (s * s));
        const w = 0.2 * Math.sin(t * 1.5 + x * 0.6 + y * 0.4 + z * 0.5);
        o.x = (x / (s - 1) - 0.5) * 5 + w;
        o.y = (y / (s - 1) - 0.5) * 5 + w;
        o.z = (z / (s - 1) - 0.5) * 5;
        o.mix = z / (s - 1);
        o.scale = 0.7 + (w + 0.2) * 2;
      }),
    bubbles: (ctx) =>
      field(ctx, 320, { size: 14 }, (i, n, t, o, r) => {
        o.x = (r(0) - 0.5) * 20 + Math.sin(t * 1.3 + r(1) * 9) * 0.35;
        o.z = (r(1) - 0.5) * 10;
        o.y = wrap(r(2) * 14 + t * (0.6 + r(3) * 0.8), -7, 7);
        o.scale = 0.6 + r(3) * 2.4;
        o.mix = r(0);
        o.fade = 0.6;
      }),
    confetti: (ctx) =>
      field(ctx, 1400, { size: 9 }, (i, n, t, o, r) => {
        o.x = (r(0) - 0.5) * 22 + Math.sin(t * (1 + r(3)) + r(1) * 9) * 0.8;
        o.z = (r(1) - 0.5) * 10;
        o.y = wrap(r(2) * 14 - t * (1 + r(3)), -7, 7);
        o.mix = i % 2;
        o.scale = 0.6 + Math.abs(Math.sin(t * 3 + r(2) * 9)) * 1.2;
      }),
    sunburst: (ctx) =>
      field(ctx, 4200, { size: 6, shift: 0.8 }, (i, n, t, o, r) => {
        const rays = 36;
        const ray = i % rays;
        const a = (ray / rays) * TAU + t * 0.08;
        const d = wrap(r(0) * 7 + t * (1 + (ray % 3) * 0.3), 0.6, 7);
        o.x = Math.cos(a) * d;
        o.y = Math.sin(a) * d;
        o.z = (r(1) - 0.5) * 0.3;
        o.mix = d / 7;
        o.fade = 1 - d / 7;
      }),
    mandala: (ctx) =>
      field(ctx, 3600, { size: 4.5, shift: 0.8, tilt: 0.2 }, (i, n, t, o, r) => {
        const rings = 9;
        const ring = i % rings;
        const a = (i / n) * TAU * rings;
        const petals = 6 + ring * 2;
        const rad = 0.6 + ring * 0.45 + Math.sin(a * petals + t * (ring % 2 ? 1 : -1)) * 0.12;
        const turn = t * (ring % 2 ? 0.15 : -0.12);
        o.x = Math.cos(a + turn) * rad;
        o.y = Math.sin(a + turn) * rad;
        o.z = Math.sin(a * 3 + t) * 0.15;
        o.mix = ring / rings;
      }),
    stairs: (ctx) =>
      field(ctx, 4000, { size: 7, shift: 0.8, spin: 0.25 }, (i, n, t, o, r) => {
        const u = i / n;
        const step = Math.floor(u * 40);
        const a = step * 0.45;
        const w = (r(0) - 0.5) * 1.6;
        const rad = 2.2 + w;
        o.x = Math.cos(a) * rad;
        o.z = Math.sin(a) * rad;
        o.y = wrap(step * 0.28 - t * 0.6, -5.6, 5.6);
        o.mix = (o.y + 5.6) / 11.2;
      }),
    spire: (ctx) =>
      field(ctx, 3000, { size: 5, shift: 0.8, spin: 0.3 }, (i, n, t, o, r) => {
        const u = i / n;
        const y = u * 9 - 4.5;
        const rad = (1 - u) * 3 + 0.05;
        const a = u * TAU * 9 + (i % 2) * Math.PI;
        o.x = Math.cos(a) * rad;
        o.z = Math.sin(a) * rad;
        o.y = y;
        o.mix = i % 2;
        o.fade = 0.5 + 0.5 * Math.sin(t * 3 - u * 30);
      }),
    leaves: (ctx) =>
      field(ctx, 700, { size: 12 }, (i, n, t, o, r) => {
        const fall = t * (0.5 + r(3) * 0.6);
        o.y = wrap(r(2) * 14 - fall, -7, 7);
        o.x = (r(0) - 0.5) * 22 + Math.sin(fall * 1.6 + r(1) * 9) * 1.4;
        o.z = (r(1) - 0.5) * 10 + Math.cos(fall + r(0) * 9) * 0.8;
        o.mix = r(0);
        o.scale = 0.7 + r(3) * 1.2;
        o.fade = 0.85;
      }),
    heartbeat: (ctx) =>
      field(ctx, 2400, { size: 5, near: 3, far: 24 }, (i, n, t, o, r) => {
        const u = i / n;
        const x = (u - 0.5) * 24;
        const ph = wrap(u * 3 - t * 0.5, 0, 1);
        let y = 0;
        if (ph > 0.42 && ph < 0.46) y = (ph - 0.42) * 30;
        else if (ph >= 0.46 && ph < 0.5) y = 1.2 - (ph - 0.46) * 90;
        else if (ph >= 0.5 && ph < 0.54) y = -2.4 + (ph - 0.5) * 60;
        else if (ph > 0.62 && ph < 0.7) y = Math.sin(((ph - 0.62) / 0.08) * Math.PI) * 0.5;
        o.x = x;
        o.y = y * 1.2 + (r(0) - 0.5) * 0.12;
        o.z = (r(1) - 0.5) * 0.3;
        const head = wrap(t * 0.17, 0, 1);
        o.fade = 0.25 + 0.75 * Math.exp(-Math.abs(u - head) * 6);
        o.mix = o.fade;
      }),
    orbits: (ctx) =>
      field(ctx, 2600, { size: 4.5, shift: 0.8, tilt: 0.45 }, (i, n, t, o, r) => {
        if (i < 180) {
          const a = r(0) * TAU,
            b = Math.acos(2 * r(1) - 1),
            rad = r(2) * 0.9;
          o.x = rad * Math.sin(b) * Math.cos(a);
          o.y = rad * Math.cos(b);
          o.z = rad * Math.sin(b) * Math.sin(a);
          o.mix = 1;
          o.scale = 1.8;
          return;
        }
        const planets = 5;
        const pl = i % planets;
        const rad = 1.6 + pl * 0.9;
        const speed = 0.9 / (1 + pl * 0.6);
        const trail = r(0);
        const a = t * speed - trail * 1.8 + pl * 1.3;
        o.x = Math.cos(a) * rad;
        o.z = Math.sin(a) * rad;
        o.y = (r(1) - 0.5) * 0.08;
        o.fade = Math.pow(1 - trail, 3);
        o.scale = 0.6 + (1 - trail) * 1.6;
        o.mix = pl / planets;
      }),
    ribbon: (ctx) =>
      field(ctx, 3400, { size: 4.5, shift: 0.5 }, (i, n, t, o, r) => {
        const u = i / n;
        const x = (u - 0.5) * 22;
        const w = (r(0) - 0.5) * 1.6;
        const tw = x * 0.35 + t * 0.8;
        o.x = x;
        o.y = Math.sin(x * 0.3 + t * 0.6) * 1.8 + Math.cos(tw) * w;
        o.z = Math.sin(tw) * w;
        o.mix = (w + 0.8) / 1.6;
      }),
    vortex: (ctx) =>
      field(ctx, 5000, { size: 6, shift: 0.8, tilt: 1.1 }, (i, n, t, o, r) => {
        const d = wrap(r(0) * 7 - t * 0.6 * (1 + r(1)), 0.2, 7);
        const a = r(1) * TAU + t * (2.2 / (d + 0.4));
        o.x = Math.cos(a) * d;
        o.z = Math.sin(a) * d;
        o.y = -Math.pow(1 - d / 7, 3) * 3 + (r(2) - 0.5) * 0.2;
        o.mix = 1 - d / 7;
      }),
  };
}

/** Names and one-line descriptions, shown when a business's design is explained. */
export const MORE_SCENE_META = [
  { key: "galaxy", name: "Galaxy", blurb: "A slowly turning spiral galaxy" },
  { key: "warp", name: "Warp", blurb: "Flying through a tunnel of light" },
  { key: "starfield", name: "Starfield", blurb: "Stars streaming past" },
  { key: "knot", name: "Knot", blurb: "A glowing knot of light" },
  { key: "sphere", name: "Sphere", blurb: "A breathing sphere of points" },
  { key: "ripple", name: "Ripple", blurb: "Ripples spreading across water" },
  { key: "aurora", name: "Aurora", blurb: "Curtains of northern lights" },
  { key: "rain", name: "Rain", blurb: "Soft falling rain" },
  { key: "snow", name: "Snow", blurb: "Gentle drifting snow" },
  { key: "fireflies", name: "Fireflies", blurb: "Fireflies glowing in the dark" },
  { key: "fountain", name: "Fountain", blurb: "A fountain of sparks" },
  { key: "tornado", name: "Tornado", blurb: "A swirling funnel" },
  { key: "petals", name: "Petals", blurb: "A turning flower of light" },
  { key: "infinity", name: "Infinity", blurb: "An endless flowing loop" },
  { key: "atom", name: "Atom", blurb: "Orbits around a glowing core" },
  { key: "hexgrid", name: "Hexgrid", blurb: "A pulsing honeycomb floor" },
  { key: "skyline", name: "Skyline", blurb: "A glowing city skyline" },
  { key: "equalizer", name: "Equalizer", blurb: "Bars moving to a beat" },
  { key: "terrain", name: "Terrain", blurb: "Flying over rolling hills" },
  { key: "dunes", name: "Dunes", blurb: "Slow drifting sand dunes" },
  { key: "lattice", name: "Lattice", blurb: "A rotating cube of points" },
  { key: "bubbles", name: "Bubbles", blurb: "Bubbles rising softly" },
  { key: "confetti", name: "Confetti", blurb: "Celebration confetti" },
  { key: "sunburst", name: "Sunburst", blurb: "Rays bursting outward" },
  { key: "mandala", name: "Mandala", blurb: "Layered turning rings" },
  { key: "stairs", name: "Stairs", blurb: "A spiral staircase of light" },
  { key: "spire", name: "Spire", blurb: "A twisting cone of light" },
  { key: "leaves", name: "Leaves", blurb: "Leaves drifting down" },
  { key: "heartbeat", name: "Heartbeat", blurb: "A calm heartbeat line" },
  { key: "orbits", name: "Orbits", blurb: "Planets circling a sun" },
  { key: "ribbon", name: "Ribbon", blurb: "A twisting ribbon of light" },
  { key: "vortex", name: "Vortex", blurb: "A whirlpool pulling inward" },
];
