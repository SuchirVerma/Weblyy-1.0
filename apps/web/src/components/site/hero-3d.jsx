"use client";
import { useEffect, useRef } from "react";
import { moreScenes } from "./hero-3d-more";
/**
 * The 3D backdrop of the redesigned website's hero. One of 42 scenes (chosen per business by lib/scene-pick),
 * lit in the site's theme colours, with depth fade and a gentle camera drift that follows the pointer.
 * Pauses when off screen or in a hidden tab. Reduced motion and automated browsers get one still frame.
 */
const rand = (a, b) => a + Math.random() * (b - a);

/* ------------------------------------------------------------ building blocks */
function softPoints(ctx, count, { size = 6, near = 4, far = 30 } = {}) {
  const { THREE } = ctx;
  const pos = new Float32Array(count * 3);
  const scale = new Float32Array(count).fill(1);
  const fade = new Float32Array(count).fill(1);
  const mix = new Float32Array(count);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
  geo.setAttribute("aFade", new THREE.BufferAttribute(fade, 1));
  geo.setAttribute("aMix", new THREE.BufferAttribute(mix, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: ctx.color },
      uGlow: { value: ctx.glow },
      uSize: { value: size * ctx.pr },
      uNear: { value: near },
      uFar: { value: far },
    },
    vertexShader: `
      attribute float aScale; attribute float aFade; attribute float aMix;
      uniform float uSize;
      varying float vF; varying float vM; varying float vD;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vD = -mv.z; vF = aFade; vM = aMix;
        gl_PointSize = uSize * aScale * (12.0 / max(-mv.z, 0.1));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform vec3 uGlow; uniform float uNear; uniform float uFar;
      varying float vF; varying float vM; varying float vD;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        float f = clamp(1.0 - (vD - uNear) / (uFar - uNear), 0.0, 1.0);
        gl_FragColor = vec4(mix(uColor, uGlow, clamp(vM, 0.0, 1.0)), a * vF * f);
      }`,
  });
  const obj = new THREE.Points(geo, mat);
  obj.frustumCulled = false;
  const dirty = () => {
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aScale.needsUpdate = true;
    geo.attributes.aFade.needsUpdate = true;
    geo.attributes.aMix.needsUpdate = true;
  };
  return { obj, pos, scale, fade, mix, dirty, geo, mat };
}
function fadeLines(ctx, maxSegments, { color, near = 4, far = 30, geometry } = {}) {
  const { THREE } = ctx;
  const geo = geometry ?? new THREE.BufferGeometry();
  const pos = geometry ? geometry.attributes.position.array : new Float32Array(maxSegments * 6);
  const alpha = new Float32Array(pos.length / 3).fill(1);
  if (!geometry) geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: color ?? ctx.color }, uNear: { value: near }, uFar: { value: far } },
    vertexShader: `
      attribute float aAlpha; varying float vA; varying float vD;
      void main() { vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uNear; uniform float uFar; varying float vA; varying float vD;
      void main() { float f = clamp(1.0 - (vD - uNear) / (uFar - uNear), 0.0, 1.0); gl_FragColor = vec4(uColor, vA * f); }`,
  });
  const obj = new THREE.LineSegments(geo, mat);
  obj.frustumCulled = false;
  const dirty = () => {
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  };
  return { obj, pos, alpha, dirty, geo, mat };
}

/* ------------------------------------------------------------ the 10 scenes */
// Each returns { update(t), cam: { pos, look, drift, par } }. `cx` keeps the focal object right of the headline on wide screens.
const SCENES = {
  flow(ctx) {
    const COLS = ctx.mobile ? 90 : 150;
    const ROWS = ctx.mobile ? 45 : 70;
    const W = 34;
    const D = 22;
    const p = softPoints(ctx, COLS * ROWS, { size: ctx.mobile ? 5.5 : 7, near: 6, far: 26 });
    const base = new Float32Array(COLS * ROWS * 2);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        base[i * 2] = (c / (COLS - 1) - 0.5) * W;
        base[i * 2 + 1] = (r / (ROWS - 1) - 0.5) * D - 4;
      }
    const m = softPoints(ctx, 110, { size: 6 });
    for (let i = 0; i < 110; i++) {
      m.pos[i * 3] = rand(-W / 2, W / 2);
      m.pos[i * 3 + 1] = rand(0.5, 5.5);
      m.pos[i * 3 + 2] = rand(-D / 2, D / 2) - 4;
      m.mix[i] = 1;
      m.fade[i] = 0.7;
    }
    ctx.scene.add(p.obj, m.obj);
    return {
      cam: { pos: [0, 2.4, 9], look: [0, -0.2, -4], drift: 1.2, par: 2.4 },
      update(t) {
        for (let i = 0; i < COLS * ROWS; i++) {
          const x = base[i * 2];
          const z = base[i * 2 + 1];
          const y = Math.sin(x * 0.28 + t * 0.55) * 0.9 + Math.cos(z * 0.35 + t * 0.4) * 0.7 + Math.sin((x + z) * 0.16 - t * 0.3) * 0.55 - 1.2;
          p.pos[i * 3] = x;
          p.pos[i * 3 + 1] = y;
          p.pos[i * 3 + 2] = z;
          p.mix[i] = y * 0.55 + 0.9;
        }
        for (let i = 0; i < 110; i++) {
          m.pos[i * 3 + 1] += 0.004 + (i % 5) * 0.001;
          if (m.pos[i * 3 + 1] > 6) m.pos[i * 3 + 1] = 0.3;
        }
        p.dirty();
        m.dirty();
      },
    };
  },
  helix(ctx) {
    const N = ctx.mobile ? 130 : 190;
    const H = 13;
    const g = new ctx.THREE.Group();
    g.position.set(ctx.cx, 0, -1);
    g.rotation.z = -0.55;
    const p = softPoints(ctx, N * 2, { size: 9, near: 4, far: 20 });
    const rungEvery = 3;
    const R = Math.floor(N / rungEvery);
    const l = fadeLines(ctx, R, { near: 4, far: 20 });
    const dust = softPoints(ctx, 260, { size: 4, near: 3, far: 22 });
    for (let i = 0; i < 260; i++) {
      dust.pos[i * 3] = rand(-3.5, 3.5);
      dust.pos[i * 3 + 1] = rand(-H / 2, H / 2);
      dust.pos[i * 3 + 2] = rand(-3.5, 3.5);
      dust.fade[i] = rand(0.2, 0.6);
      dust.mix[i] = 1;
    }
    dust.dirty();
    g.add(p.obj, l.obj, dust.obj);
    ctx.scene.add(g);
    return {
      cam: { pos: [0, 0, 10], look: [ctx.cx * 0.6, 0, 0], drift: 0.6, par: 1.4 },
      update(t) {
        for (let i = 0; i < N; i++) {
          const y = (i / (N - 1) - 0.5) * H;
          const a = i * 0.32 + t * 0.7;
          for (let s = 0; s < 2; s++) {
            const k = i * 2 + s;
            const ang = a + s * Math.PI;
            p.pos[k * 3] = Math.cos(ang) * 1.7;
            p.pos[k * 3 + 1] = y;
            p.pos[k * 3 + 2] = Math.sin(ang) * 1.7;
            p.mix[k] = s === 0 ? 0.15 + 0.3 * Math.sin(ang) : 0.8;
            p.scale[k] = 0.9 + 0.4 * (Math.sin(ang) + 1) * 0.5;
          }
        }
        for (let r = 0; r < R; r++) {
          const i = r * rungEvery;
          const a = i * 2;
          const b = a + 1;
          l.pos.set([p.pos[a * 3], p.pos[a * 3 + 1], p.pos[a * 3 + 2], p.pos[b * 3], p.pos[b * 3 + 1], p.pos[b * 3 + 2]], r * 6);
          l.alpha[r * 2] = l.alpha[r * 2 + 1] = 0.45;
        }
        g.rotation.y = t * 0.12;
        for (let i = 0; i < 260; i++) {
          dust.pos[i * 3 + 1] += 0.006;
          if (dust.pos[i * 3 + 1] > H / 2) dust.pos[i * 3 + 1] = -H / 2;
        }
        p.dirty();
        l.dirty();
        dust.dirty();
      },
    };
  },
  bokeh(ctx) {
    const N = ctx.mobile ? 55 : 85;
    const S = ctx.mobile ? 160 : 260;
    const orbs = softPoints(ctx, N, { size: 10, near: 2, far: 22 });
    const sparks = softPoints(ctx, S, { size: 3.5, near: 2, far: 22 });
    const seed = new Float32Array(N + S);
    const speed = new Float32Array(N + S);
    for (let i = 0; i < N; i++) {
      orbs.pos.set([rand(-9, 9) + ctx.cx * 0.4, rand(-6, 6), rand(-7, 3)], i * 3);
      orbs.scale[i] = rand(2.5, 9);
      orbs.fade[i] = rand(0.12, 0.45);
      orbs.mix[i] = Math.random();
      seed[i] = rand(0, 100);
      speed[i] = rand(0.15, 0.5);
    }
    for (let i = 0; i < S; i++) {
      sparks.pos.set([rand(-10, 10), rand(-6, 6), rand(-6, 4)], i * 3);
      sparks.scale[i] = rand(0.6, 1.6);
      sparks.mix[i] = 1;
      seed[N + i] = rand(0, 100);
      speed[N + i] = rand(0.2, 0.8);
    }
    ctx.scene.add(orbs.obj, sparks.obj);
    let last = 0;
    return {
      cam: { pos: [0, 0, 10], look: [0, 0, 0], drift: 0.8, par: 1.6 },
      update(t) {
        const dt = Math.min(0.05, t - last || 0.016);
        last = t;
        for (let i = 0; i < N; i++) {
          orbs.pos[i * 3 + 1] += speed[i] * dt;
          orbs.pos[i * 3] += Math.sin(t * 0.3 + seed[i]) * 0.003;
          if (orbs.pos[i * 3 + 1] > 6.5) orbs.pos[i * 3 + 1] = -6.5;
          orbs.fade[i] = (0.18 + 0.22 * (Math.sin(t * 0.6 + seed[i]) + 1) * 0.5) * (i % 3 === 0 ? 1.4 : 1);
        }
        for (let i = 0; i < S; i++) {
          const k = N + i;
          sparks.pos[i * 3 + 1] += speed[k] * dt * 0.6;
          if (sparks.pos[i * 3 + 1] > 6.5) sparks.pos[i * 3 + 1] = -6.5;
          sparks.fade[i] = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + seed[k]));
        }
        orbs.dirty();
        sparks.dirty();
      },
    };
  },
  silk(ctx) {
    const S = ctx.mobile ? 18 : 34;
    const P = ctx.mobile ? 90 : 140;
    const l = fadeLines(ctx, S * (P - 1), { near: 3, far: 22 });
    const glow = fadeLines(ctx, S * (P - 1), { color: ctx.glow, near: 3, far: 22 });
    const dots = softPoints(ctx, 140, { size: 4, near: 2, far: 22 });
    for (let i = 0; i < 140; i++) {
      dots.pos.set([rand(-10, 10), rand(-5, 5), rand(-5, 3)], i * 3);
      dots.mix[i] = 1;
      dots.fade[i] = rand(0.2, 0.7);
    }
    dots.dirty();
    ctx.scene.add(l.obj, glow.obj, dots.obj);
    const Y = new Float32Array(P * 3);
    return {
      cam: { pos: [0, 0, 10], look: [0, 0, 0], drift: 0.6, par: 1.2 },
      update(t) {
        let seg = 0;
        for (let s = 0; s < S; s++) {
          const o = s / (S - 1);
          const a = Math.min(1, (0.12 + 0.6 * Math.sin(Math.PI * o)) * 1.2);
          for (let j = 0; j < P; j++) {
            const x = (j / (P - 1) - 0.5) * 24;
            Y[j * 3] = x;
            Y[j * 3 + 1] = Math.sin(x * 0.33 + t * 0.5 + o * 1.8) * 1.4 + Math.sin(x * 0.12 - t * 0.28 + o * 3.1) * 1.1 + (o - 0.5) * 2.2 - 0.4;
            Y[j * 3 + 2] = Math.cos(x * 0.24 + t * 0.4 + o * 2.2) * 1.3 - 2;
          }
          for (let j = 0; j < P - 1; j++, seg++) {
            const target = s % 5 === 0 ? glow : l;
            const other = target === glow ? l : glow;
            target.pos.set([Y[j * 3], Y[j * 3 + 1], Y[j * 3 + 2], Y[j * 3 + 3], Y[j * 3 + 4], Y[j * 3 + 5]], seg * 6);
            target.alpha[seg * 2] = target.alpha[seg * 2 + 1] = a * (target === glow ? 0.9 : 1);
            other.alpha[seg * 2] = other.alpha[seg * 2 + 1] = 0;
          }
        }
        l.dirty();
        glow.dirty();
      },
    };
  },
  crystal(ctx) {
    const { THREE } = ctx;
    const g = new THREE.Group();
    g.position.set(ctx.cx, 0, 0);
    const outerGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3, 1));
    const innerGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.6, 0));
    const outer = fadeLines(ctx, 0, { geometry: outerGeo, near: 4, far: 18 });
    const inner = fadeLines(ctx, 0, { geometry: innerGeo, color: ctx.glow, near: 4, far: 18 });
    outer.alpha.fill(0.75);
    inner.alpha.fill(0.8);
    outer.dirty();
    inner.dirty();
    const ico = new THREE.IcosahedronGeometry(3, 1).attributes.position.array;
    const V = ico.length / 3;
    const verts = softPoints(ctx, V, { size: 8, near: 4, far: 18 });
    verts.pos.set(ico);
    verts.mix.fill(1);
    verts.dirty();
    const D = ctx.mobile ? 200 : 360;
    const dust = softPoints(ctx, D, { size: 3.5, near: 3, far: 22 });
    const ang = new Float32Array(D);
    const rad = new Float32Array(D);
    const hy = new Float32Array(D);
    for (let i = 0; i < D; i++) {
      ang[i] = rand(0, Math.PI * 2);
      rad[i] = rand(3.4, 7.5);
      hy[i] = rand(-3.5, 3.5);
      dust.mix[i] = Math.random();
    }
    const innerG = new THREE.Group();
    innerG.add(inner.obj);
    g.add(outer.obj, innerG, verts.obj, dust.obj);
    ctx.scene.add(g);
    return {
      cam: { pos: [0, 0.4, 10], look: [ctx.cx * 0.6, 0, 0], drift: 0.6, par: 1.4 },
      update(t) {
        outer.obj.rotation.set(t * 0.1, t * 0.18, 0);
        verts.obj.rotation.copy(outer.obj.rotation);
        innerG.rotation.set(-t * 0.22, -t * 0.3, t * 0.1);
        for (let i = 0; i < D; i++) {
          const a = ang[i] + t * (0.05 + (i % 7) * 0.008);
          dust.pos[i * 3] = Math.cos(a) * rad[i];
          dust.pos[i * 3 + 1] = hy[i] + Math.sin(t * 0.5 + i) * 0.1;
          dust.pos[i * 3 + 2] = Math.sin(a) * rad[i];
          dust.fade[i] = 0.3 + 0.7 * Math.max(0, Math.sin(t * 1.8 + i * 1.7));
        }
        for (let i = 0; i < V; i++) verts.fade[i] = 0.5 + 0.5 * Math.max(0, Math.sin(t * 2 + i));
        verts.dirty();
        dust.dirty();
      },
    };
  },
  embers(ctx) {
    const N = ctx.mobile ? 260 : 460;
    const p = softPoints(ctx, N, { size: 10, near: 2, far: 22 });
    const seed = new Float32Array(N);
    const speed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      p.pos.set([rand(-10, 10) + ctx.cx * 0.3, rand(-6.5, 6.5), rand(-6, 3)], i * 3);
      p.scale[i] = rand(0.7, 2.6);
      p.mix[i] = rand(0.2, 1);
      seed[i] = rand(0, 100);
      speed[i] = rand(0.35, 1.2);
    }
    const bed = softPoints(ctx, 40, { size: 12, near: 2, far: 24 });
    for (let i = 0; i < 40; i++) {
      bed.pos.set([rand(-11, 11), rand(-6.8, -5.2), rand(-6, 2)], i * 3);
      bed.scale[i] = rand(4, 9);
      bed.fade[i] = 0.35;
    }
    bed.dirty();
    ctx.scene.add(bed.obj, p.obj);
    let last = 0;
    return {
      cam: { pos: [0, 0, 10], look: [0, 0, 0], drift: 0.5, par: 1.2 },
      update(t) {
        const dt = Math.min(0.05, t - last || 0.016);
        last = t;
        for (let i = 0; i < N; i++) {
          const k = i * 3;
          p.pos[k + 1] += speed[i] * dt;
          p.pos[k] += Math.sin(t * 1.1 + seed[i]) * 0.006;
          if (p.pos[k + 1] > 6.5) {
            p.pos[k + 1] = -6.5;
            p.pos[k] = rand(-10, 10) + ctx.cx * 0.3;
          }
          const life = (p.pos[k + 1] + 6.5) / 13;
          p.fade[i] = Math.sin(Math.PI * life) * (0.55 + 0.45 * Math.sin(t * 9 + seed[i]));
          p.mix[i] = 1 - life * 0.8;
        }
        for (let i = 0; i < 40; i++) bed.fade[i] = 0.28 + 0.12 * Math.sin(t * 1.3 + i);
        p.dirty();
        bed.dirty();
      },
    };
  },
  rings(ctx) {
    const K = 9;
    const SEG = 128;
    const g = new ctx.THREE.Group();
    g.position.set(ctx.cx * 0.5, -2.2, -2);
    g.rotation.x = 1.25;
    const l = fadeLines(ctx, K * SEG, { color: ctx.glow, near: 4, far: 26 });
    const core = softPoints(ctx, 1, { size: 90, near: 2, far: 22 });
    core.mix[0] = 1;
    const orbit = softPoints(ctx, 180, { size: 7, near: 3, far: 22 });
    const oa = new Float32Array(180);
    const orad = new Float32Array(180);
    for (let i = 0; i < 180; i++) {
      oa[i] = rand(0, Math.PI * 2);
      orad[i] = rand(1.5, 9);
      orbit.mix[i] = Math.random();
    }
    g.add(l.obj, core.obj, orbit.obj);
    ctx.scene.add(g);
    return {
      cam: { pos: [0, 0.6, 10], look: [ctx.cx * 0.6, -0.4, 0], drift: 0.6, par: 1.4 },
      update(t) {
        let s = 0;
        for (let k = 0; k < K; k++) {
          const f = (k / K + t * 0.11) % 1;
          const r = 0.3 + f * 11;
          const a = Math.pow(1 - f, 1.3);
          for (let j = 0; j < SEG; j++, s++) {
            const a0 = (j / SEG) * Math.PI * 2;
            const a1 = ((j + 1) / SEG) * Math.PI * 2;
            l.pos.set([Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0], s * 6);
            l.alpha[s * 2] = l.alpha[s * 2 + 1] = a;
          }
        }
        core.scale[0] = 1 + 0.25 * Math.sin(t * 3.2);
        core.fade[0] = 0.7 + 0.3 * Math.sin(t * 3.2);
        for (let i = 0; i < 180; i++) {
          const a = oa[i] + t * (0.25 / orad[i] + 0.05);
          orbit.pos.set([Math.cos(a) * orad[i], Math.sin(a) * orad[i], Math.sin(t + i) * 0.15], i * 3);
          orbit.fade[i] = 0.3 + 0.5 * Math.max(0, Math.sin(t * 2 + i));
        }
        l.dirty();
        core.dirty();
        orbit.dirty();
      },
    };
  },
  constellation(ctx) {
    const N = ctx.mobile ? 55 : 95;
    const MAXD = 3.2;
    const nodes = softPoints(ctx, N, { size: 12, near: 3, far: 22 });
    const lines = fadeLines(ctx, (N * (N - 1)) / 2, { near: 3, far: 22 });
    const vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      nodes.pos.set([rand(-9, 9) + ctx.cx * 0.5, rand(-4.8, 4.8), rand(-4, 2)], i * 3);
      vel.set([rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.15, 0.15)], i * 3);
      nodes.scale[i] = rand(0.8, 2.2);
      nodes.mix[i] = Math.random() * 0.8;
    }
    ctx.scene.add(lines.obj, nodes.obj);
    let last = 0;
    const B = [9 + Math.abs(ctx.cx) * 0.5, 4.8, 3];
    return {
      cam: { pos: [0, 0, 10], look: [0, 0, 0], drift: 0.6, par: 1.4 },
      update(t) {
        const dt = Math.min(0.05, t - last || 0.016);
        last = t;
        for (let i = 0; i < N; i++)
          for (let a = 0; a < 3; a++) {
            const k = i * 3 + a;
            nodes.pos[k] += vel[k] * dt;
            const c = a === 0 ? ctx.cx * 0.5 : a === 2 ? -1 : 0;
            if (Math.abs(nodes.pos[k] - c) > B[a]) vel[k] = -vel[k];
          }
        let s = 0;
        for (let i = 0; i < N; i++)
          for (let j = i + 1; j < N; j++) {
            const dx = nodes.pos[i * 3] - nodes.pos[j * 3];
            const dy = nodes.pos[i * 3 + 1] - nodes.pos[j * 3 + 1];
            const dz = nodes.pos[i * 3 + 2] - nodes.pos[j * 3 + 2];
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d > MAXD) continue;
            lines.pos.set([nodes.pos[i * 3], nodes.pos[i * 3 + 1], nodes.pos[i * 3 + 2], nodes.pos[j * 3], nodes.pos[j * 3 + 1], nodes.pos[j * 3 + 2]], s * 6);
            lines.alpha[s * 2] = lines.alpha[s * 2 + 1] = (1 - d / MAXD) * 0.9;
            s++;
          }
        lines.geo.setDrawRange(0, s * 2);
        for (let i = 0; i < N; i++) nodes.fade[i] = 0.55 + 0.45 * Math.sin(t * 1.5 + i * 2.1);
        nodes.dirty();
        lines.dirty();
      },
    };
  },
  grid(ctx) {
    const XS = 34;
    const ZS = 26;
    const L = 52;
    const l = fadeLines(ctx, XS + ZS, { near: 3, far: 40 });
    for (let i = 0; i < XS; i++) {
      const x = (i / (XS - 1) - 0.5) * 50;
      l.pos.set([x, -2, 8, x * 1.0, -2, 8 - L], i * 6);
      l.alpha[i * 2] = l.alpha[i * 2 + 1] = 0.9;
    }
    const sun = softPoints(ctx, 1, { size: 420, near: 2, far: 80 });
    sun.pos.set([ctx.cx * 1.5, 2.2, -38]);
    sun.fade[0] = 0.85;
    sun.mix[0] = 0.35;
    sun.dirty();
    const stars = softPoints(ctx, 220, { size: 6, near: 2, far: 80 });
    for (let i = 0; i < 220; i++) {
      stars.pos.set([rand(-30, 30), rand(0, 16), rand(-44, -20)], i * 3);
      stars.mix[i] = 1;
    }
    ctx.scene.add(sun.obj, stars.obj, l.obj);
    return {
      cam: { pos: [0, 1.4, 9], look: [0, -1.4, -12], drift: 0.8, par: 1.6 },
      update(t) {
        for (let j = 0; j < ZS; j++) {
          const z = 8 - ((j * (L / ZS) + t * 3.2) % L);
          const s = XS + j;
          l.pos.set([-25, -2, z, 25, -2, z], s * 6);
          l.alpha[s * 2] = l.alpha[s * 2 + 1] = 0.95;
        }
        for (let i = 0; i < 220; i++) stars.fade[i] = 0.3 + 0.7 * Math.max(0, Math.sin(t * 1.5 + i * 1.3));
        l.dirty();
        stars.dirty();
      },
    };
  },
  globe(ctx) {
    const N = ctx.mobile ? 900 : 1700;
    const R = 3.4;
    const g = new ctx.THREE.Group();
    g.position.set(ctx.cx, 0, 0);
    g.rotation.x = 0.35;
    const p = softPoints(ctx, N, { size: 5.5, near: 4, far: 18 });
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      p.pos.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
      p.mix[i] = (y + 1) * 0.5;
    }
    const RINGS = 3;
    const SEG = 160;
    const orbit = fadeLines(ctx, RINGS * SEG, { color: ctx.glow, near: 4, far: 18 });
    const tilts = [0.3, -0.6, 1.1];
    let s = 0;
    for (let r = 0; r < RINGS; r++) {
      const rr = R * (1.25 + r * 0.18);
      for (let j = 0; j < SEG; j++, s++) {
        const a0 = (j / SEG) * Math.PI * 2;
        const a1 = ((j + 1) / SEG) * Math.PI * 2;
        const pt = (a) => {
          const x = Math.cos(a) * rr;
          const z = Math.sin(a) * rr;
          return [x, z * Math.sin(tilts[r]), z * Math.cos(tilts[r])];
        };
        orbit.pos.set([...pt(a0), ...pt(a1)], s * 6);
        orbit.alpha[s * 2] = orbit.alpha[s * 2 + 1] = 0.12;
      }
    }
    orbit.dirty();
    const sats = softPoints(ctx, RINGS, { size: 14, near: 4, far: 18 });
    sats.mix.fill(1);
    const globe = new ctx.THREE.Group();
    globe.add(p.obj);
    g.add(globe, orbit.obj, sats.obj);
    ctx.scene.add(g);
    return {
      cam: { pos: [0, 0, 10], look: [ctx.cx * 0.6, 0, 0], drift: 0.6, par: 1.4 },
      update(t) {
        globe.rotation.y = t * 0.15;
        for (let i = 0; i < N; i++) p.fade[i] = 0.45 + 0.55 * Math.max(0, Math.sin(t * 1.2 + i * 0.37));
        for (let r = 0; r < RINGS; r++) {
          const rr = R * (1.25 + r * 0.18);
          const a = t * (0.4 - r * 0.08) + r * 2;
          const x = Math.cos(a) * rr;
          const z = Math.sin(a) * rr;
          sats.pos.set([x, z * Math.sin(tilts[r]), z * Math.cos(tilts[r])], r * 3);
        }
        p.dirty();
        sats.dirty();
      },
    };
  },
};

// The 32 particle-field designs from hero-3d-more.js join the original 10.
Object.assign(SCENES, moreScenes(softPoints));

export function Hero3D({ color, glow, photo, scene = "flow" }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ok = (() => {
      try {
        const c = document.createElement("canvas");
        return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        return false;
      }
    })();
    if (!ok) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const THREE = await import("three");
      if (disposed) return;
      const still = matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver;
      const mobile = window.innerWidth < 760;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      const pr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      renderer.setPixelRatio(pr);
      renderer.setClearColor(0x000000, 0);
      const scene3 = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
      const ctx = { THREE, scene: scene3, camera, mobile, pr, cx: mobile ? 0 : 2.3, color: new THREE.Color(color), glow: new THREE.Color(glow) };
      const inst = (SCENES[scene] ?? SCENES.flow)(ctx);
      const cam = inst.cam;
      const target = new THREE.Vector3(...cam.look);
      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      const onMove = (e) => {
        mouse.tx = e.clientX / window.innerWidth - 0.5;
        mouse.ty = e.clientY / window.innerHeight - 0.5;
      };
      const resize = () => {
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const frame = (t) => {
        inst.update(t);
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        camera.position.set(cam.pos[0] + Math.sin(t * 0.08) * cam.drift + mouse.x * cam.par, cam.pos[1] - mouse.y * cam.par * 0.5, cam.pos[2]);
        camera.lookAt(target);
        renderer.render(scene3, camera);
      };
      const t0 = performance.now();
      let raf = 0;
      let running = false;
      const loop = () => {
        frame((performance.now() - t0) / 1000 + 4);
        raf = requestAnimationFrame(loop);
      };
      const start = () => {
        if (running || still) return;
        running = true;
        raf = requestAnimationFrame(loop);
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };
      frame(4);
      canvas.dataset.ready = "";
      canvas.dataset.scene = scene;
      const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop()));
      io.observe(canvas);
      const onVis = () => (document.hidden ? stop() : start());
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("resize", resize);
      document.addEventListener("visibilitychange", onVis);
      cleanup = () => {
        stop();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVis);
        scene3.traverse((o) => {
          o.geometry?.dispose?.();
          o.material?.dispose?.();
        });
        renderer.dispose();
      };
    })().catch((e) => console.error("[hero-3d]", e));
    return () => {
      disposed = true;
      cleanup();
    };
  }, [color, glow, scene]);
  return <canvas ref={ref} data-photo={photo ? "" : undefined} aria-hidden="true" />;
}
