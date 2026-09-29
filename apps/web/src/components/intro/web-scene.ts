import * as THREE from "three";

/**
 * "One spark becomes a web": a single spark blooms into a luminous 3D web, the camera flies through it,
 * and the web's points gather into the word WEBLYY. Everything is driven by one progress value (0..1),
 * so scrolling down plays it forward and scrolling up plays it back.
 */

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  word: string;
  fontFamily: string;
  mobile: boolean;
  /** Called every frame with the text's on-screen width in CSS pixels, so the DOM title can match it. */
  onTextWidth?: (px: number) => void;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Camera distance along the journey: close on the spark, pull back, fly through, pull back for the title. */
const CAM: [number, number][] = [
  [0, 2.4],
  [0.16, 3.6],
  [0.4, 11.5],
  [0.56, 7.5],
  [0.66, 0.6],
  [0.8, 10],
  [1, 10.4],
];
function camZ(p: number) {
  for (let i = 1; i < CAM.length; i++) {
    if (p <= CAM[i][0]) {
      const [p0, z0] = CAM[i - 1];
      const [p1, z1] = CAM[i];
      return lerp(z0, z1, easeInOut((p - p0) / (p1 - p0)));
    }
  }
  return CAM[CAM.length - 1][1];
}

function glowTexture(size: number, flare = false) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = flare ? size / 8 : size;
  const g = c.getContext("2d")!;
  if (flare) {
    const grad = g.createLinearGradient(0, 0, size, 0);
    grad.addColorStop(0, "rgba(40,40,48,0)");
    grad.addColorStop(0.35, "rgba(60,60,70,0.06)");
    grad.addColorStop(0.5, "rgba(20,20,26,0.55)");
    grad.addColorStop(0.65, "rgba(60,60,70,0.06)");
    grad.addColorStop(1, "rgba(40,40,48,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size / 8);
    const v = g.createLinearGradient(0, 0, 0, size / 8);
    v.addColorStop(0, "rgba(17,17,17,1)");
    v.addColorStop(0.5, "rgba(17,17,17,0)");
    v.addColorStop(1, "rgba(17,17,17,1)");
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = v;
    g.fillRect(0, 0, size, size / 8);
  } else {
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(15,15,20,1)");
    grad.addColorStop(0.06, "rgba(15,15,20,0.95)");
    grad.addColorStop(0.12, "rgba(30,30,38,0.12)");
    grad.addColorStop(0.35, "rgba(80,80,95,0.03)");
    grad.addColorStop(1, "rgba(120,120,135,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Sample the word's pixels into n points, centred, width = 1 unit. */
function sampleWord(word: string, fontFamily: string, n: number): { pts: Float32Array; aspect: number } {
  const c = document.createElement("canvas");
  const fs = 220;
  const g = c.getContext("2d")!;
  g.font = `700 ${fs}px ${fontFamily}`;
  const w = Math.ceil(g.measureText(word).width) + 20;
  const h = Math.ceil(fs * 1.3);
  c.width = w;
  c.height = h;
  g.font = `700 ${fs}px ${fontFamily}`;
  g.textBaseline = "middle";
  g.fillStyle = "#fff";
  g.fillText(word, 10, h / 2);
  const data = g.getImageData(0, 0, w, h).data;
  const cand: number[] = [];
  const step = 3;
  for (let y = 0; y < h; y += step)
    for (let x = 0; x < w; x += step) if (data[(y * w + x) * 4 + 3] > 140) cand.push(x, y);
  const pts = new Float32Array(n * 3);
  const count = cand.length / 2;
  for (let i = 0; i < n; i++) {
    const k = count ? Math.floor(Math.random() * count) : 0;
    const x = cand[k * 2] ?? w / 2;
    const y = cand[k * 2 + 1] ?? h / 2;
    pts[i * 3] = (x - w / 2) / w + (Math.random() - 0.5) * 0.004;
    pts[i * 3 + 1] = -(y - h / 2) / w + (Math.random() - 0.5) * 0.004;
    pts[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
  }
  return { pts, aspect: h / w };
}

function knn(pos: Float32Array, n: number, k: number, maxD: number): number[] {
  const pairs: number[] = [];
  const seen = new Set<number>();
  for (let i = 0; i < n; i++) {
    const best: [number, number][] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = pos[i * 3] - pos[j * 3];
      const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
      const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d > maxD * maxD) continue;
      if (best.length < k) best.push([d, j]);
      else if (d < best[k - 1][0]) best[k - 1] = [d, j];
      else continue;
      best.sort((a, b) => a[0] - b[0]);
    }
    for (const [, j] of best) {
      const key = i < j ? i * 100000 + j : j * 100000 + i;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push(i, j);
    }
  }
  return pairs;
}

const POINT_VS = `
attribute float aAlpha;
attribute float aSize;
attribute vec3 aColor;
uniform float uPixel;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixel / max(0.35, -mv.z);
  vAlpha = aAlpha;
  vColor = aColor;
}`;
const POINT_FS = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a = a * a * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor, min(1.0, a * 1.2));
}`;
const LINE_VS = `
attribute float aAlpha;
attribute float aT;
attribute float aSeed;
varying float vAlpha;
varying float vT;
varying float vSeed;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vAlpha = aAlpha; vT = aT; vSeed = aSeed;
}`;
const LINE_FS = `
uniform float uTime;
uniform vec3 uColor;
uniform float uPulse;
varying float vAlpha;
varying float vT;
varying float vSeed;
void main() {
  // Steady glowing threads; only about one in six carries a travelling pulse (a message moving through the web).
  float carrier = step(0.84, vSeed);
  float head = fract(uTime * (0.25 + vSeed * 0.35) + vSeed * 13.0);
  float pulse = exp(-pow((vT - head) * 5.0, 2.0)) * uPulse * carrier;
  vec3 col = mix(uColor, vec3(0.0), min(1.0, pulse));
  float a = min(1.0, vAlpha * (1.0 + pulse * 2.2));
  gl_FragColor = vec4(col, a);
}`;

export class WebScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private n: number;
  private spark: Float32Array;
  private web: Float32Array;
  private text: Float32Array;
  private seed: Float32Array;
  private radius: Float32Array;
  private cur: Float32Array;
  private pts: THREE.Points;
  private webLines: THREE.LineSegments;
  private textLines: THREE.LineSegments;
  private spokes: THREE.LineSegments;
  private dust: THREE.Points;
  private sparkSprite: THREE.Sprite;
  private flare: THREE.Sprite;
  private webPairs: number[];
  private textPairs: number[];
  private spokeIdx: number[];
  private spokePairs: number[] = [];
  private innerRange: [number, number] = [0, 0];
  private lineMats: THREE.ShaderMaterial[] = [];
  private textScale = 1;
  private raf = 0;
  private running = false;
  private progress = 0;
  private target = 0;
  private t0 = performance.now();
  private mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  private opts: SceneOptions;
  private aspectText = 0.3;

  constructor(opts: SceneOptions) {
    this.opts = opts;
    const { canvas, mobile } = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
    this.camera.position.set(0, 0, 2.4);

    // A web you can recognise: an outer wireframe globe, an inner globe, and loose "satellite" points.
    const outer = mobile ? { lat: 12, lon: 22, r: 4.2 } : { lat: 15, lon: 30, r: 4.4 };
    const inner = mobile ? { lat: 7, lon: 12, r: 2.2 } : { lat: 9, lon: 18, r: 2.3 };
    const scatter = mobile ? 150 : 300;
    const nOuter = outer.lat * outer.lon;
    const nInner = inner.lat * inner.lon;
    const n = (this.n = nOuter + nInner + scatter);
    this.innerRange = [nOuter, nOuter + nInner];
    this.spark = new Float32Array(n * 3);
    this.web = new Float32Array(n * 3);
    this.seed = new Float32Array(n);
    this.radius = new Float32Array(n);
    this.cur = new Float32Array(n * 3);
    const maxR = outer.r * 1.2;
    const put = (i: number, x: number, y: number, z: number) => {
      this.web[i * 3] = x;
      this.web[i * 3 + 1] = y;
      this.web[i * 3 + 2] = z;
      this.radius[i] = Math.hypot(x, y, z) / maxR;
    };
    const globe = (start: number, g: { lat: number; lon: number; r: number }, twist: number) => {
      for (let a = 0; a < g.lat; a++) {
        const phi = ((a + 1) / (g.lat + 1)) * Math.PI;
        for (let o = 0; o < g.lon; o++) {
          const th = (o / g.lon) * Math.PI * 2 + twist * a;
          const r = g.r * (1 + (Math.random() - 0.5) * 0.03);
          put(start + a * g.lon + o, r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
        }
      }
    };
    globe(0, outer, 0);
    globe(nOuter, inner, 0.18);
    for (let k = 0; k < scatter; k++) {
      const i = nOuter + nInner + k;
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = inner.r + Math.random() * (outer.r * 1.35 - inner.r);
      const sq = Math.sqrt(1 - u * u);
      put(i, r * sq * Math.cos(th), r * u, r * sq * Math.sin(th));
    }
    for (let i = 0; i < n; i++) {
      this.spark[i * 3] = (Math.random() - 0.5) * 0.05;
      this.spark[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
      this.spark[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
      this.seed[i] = Math.random();
    }
    const sample = sampleWord(opts.word, opts.fontFamily, n);
    this.text = sample.pts;
    this.aspectText = sample.aspect;

    // Threads: along latitude rings and longitude meridians of both globes, plus a few cross-links.
    const pairs: number[] = [];
    const wire = (start: number, g: { lat: number; lon: number }) => {
      for (let a = 0; a < g.lat; a++)
        for (let o = 0; o < g.lon; o++) {
          const i = start + a * g.lon + o;
          pairs.push(i, start + a * g.lon + ((o + 1) % g.lon));
          if (a + 1 < g.lat) pairs.push(i, start + (a + 1) * g.lon + o);
        }
    };
    wire(0, outer);
    wire(nOuter, inner);
    for (let k = 0; k < (mobile ? 24 : 48); k++) {
      pairs.push(nOuter + Math.floor(Math.random() * nInner), Math.floor(Math.random() * nOuter));
    }
    this.webPairs = pairs;
    this.textPairs = knn(this.text, n, 2, 0.028);
    this.spokeIdx = [];
    for (let i = 0; i < nInner && this.spokeIdx.length < 36; i += Math.max(1, Math.floor(nInner / 36))) this.spokeIdx.push(nOuter + i);

    // Points
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(this.cur, 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    const sizes = new Float32Array(n);
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      sizes[i] = (this.seed[i] > 0.95 ? 0.3 : 0.12 + this.seed[i] * 0.07) * (mobile ? 1.15 : 1);
      // Monochrome: silver points, a few brighter white ones.
      const bright = this.seed[i] > 0.9;
      const v = bright ? 0.06 : 0.28;
      colors[i * 3] = v;
      colors[i * 3 + 1] = v;
      colors[i * 3 + 2] = v * 1.02;
    }
    pg.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    pg.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    this.pts = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({
        vertexShader: POINT_VS,
        fragmentShader: POINT_FS,
        uniforms: { uPixel: { value: 300 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    );
    this.pts.frustumCulled = false;
    this.scene.add(this.pts);

    this.webLines = this.makeLines(this.webPairs, new THREE.Color(0.34, 0.32, 0.29), 1);
    this.textLines = this.makeLines(this.textPairs, new THREE.Color(0.07, 0.07, 0.07), 0.6);
    this.spokeIdx.forEach((i) => this.spokePairs.push(-1, i));
    this.spokes = this.makeLines(this.spokePairs, new THREE.Color(0.2, 0.19, 0.17), 1.4);

    // Far dust for depth
    const dn = mobile ? 350 : 700;
    const dpos = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) {
      dpos[i * 3] = (Math.random() - 0.5) * 60;
      dpos[i * 3 + 1] = (Math.random() - 0.5) * 36;
      dpos[i * 3 + 2] = -8 - Math.random() * 40;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
    dg.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(dn).fill(0.14), 1));
    dg.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(dn).map(() => 0.25 + Math.random() * 0.35), 1));
    dg.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(dn * 3).fill(0.55), 3));
    this.dust = new THREE.Points(dg, this.pts.material as THREE.ShaderMaterial);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    // The spark and its anamorphic flare
    this.sparkSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(256), blending: THREE.NormalBlending, depthWrite: false, transparent: true }));
    this.flare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(1024, true), blending: THREE.NormalBlending, depthWrite: false, transparent: true }));
    this.scene.add(this.sparkSprite, this.flare);

    this.resize();
    window.addEventListener("pointermove", this.onMove, { passive: true });
  }

  private makeLines(pairs: number[], color: THREE.Color, pulse: number) {
    const segs = pairs.length / 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segs * 6), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(segs * 2), 1).setUsage(THREE.DynamicDrawUsage));
    const t = new Float32Array(segs * 2);
    const s = new Float32Array(segs * 2);
    for (let i = 0; i < segs; i++) {
      t[i * 2 + 1] = 1;
      const r = Math.random();
      s[i * 2] = r;
      s[i * 2 + 1] = r;
    }
    g.setAttribute("aT", new THREE.BufferAttribute(t, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: LINE_VS,
      fragmentShader: LINE_FS,
      uniforms: { uTime: { value: 0 }, uColor: { value: color }, uPulse: { value: pulse } },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    this.lineMats.push(mat);
    const l = new THREE.LineSegments(g, mat);
    l.frustumCulled = false;
    this.scene.add(l);
    return l;
  }

  private onMove = (e: PointerEvent) => {
    this.mouse.tx = e.clientX / window.innerWidth - 0.5;
    this.mouse.ty = e.clientY / window.innerHeight - 0.5;
  };

  resize() {
    const c = this.opts.canvas;
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    (this.pts.material as THREE.ShaderMaterial).uniforms.uPixel.value = h * this.renderer.getPixelRatio() * 0.5;
    // The word fills ~78% of the visible width (less on phones), and never grows taller than a third of the screen.
    const zEnd = CAM[CAM.length - 1][1];
    const visH = 2 * zEnd * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visW = visH * this.camera.aspect;
    this.textScale = Math.min(visW * (this.opts.mobile ? 0.86 : 0.7), (visH * 0.3) / this.aspectText);
    this.opts.onTextWidth?.((this.textScale / visW) * w);
    this.draw();
  }

  setProgress(p: number) {
    this.target = Math.min(1, Math.max(0, p));
    if (!this.running) this.draw();
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Draw one frame at the given progress with no easing (for reduced motion). */
  still(p: number) {
    this.progress = this.target = p;
    this.draw(true);
  }

  private draw(frozen = false) {
    const time = frozen ? 8 : (performance.now() - this.t0) / 1000;
    // Ease toward the scroll position so fast flicks still glide.
    if (!frozen) this.progress += (this.target - this.progress) * 0.085;
    const p = this.progress;
    const ignite = frozen ? 1 : smooth(0.1, 1.4, time);

    const bloom = smooth(0.07, 0.42, p);
    const textT = smooth(0.66, 0.86, p);
    // Once the crisp title is on screen, the particles bow out so the name stays clean.
    const handoff = 1 - smooth(0.84, 0.93, p);
    const spin = p * 2.2 + time * 0.04;
    const cs = Math.cos(spin);
    const sn = Math.sin(spin);
    const csi = Math.cos(-spin * 1.4);
    const sni = Math.sin(-spin * 1.4);
    const tilt = 0.18 * Math.sin(p * Math.PI);

    const n = this.n;
    const cur = this.cur;
    const alpha = this.pts.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const al = alpha.array as Float32Array;
    const ts = this.textScale;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const sd = this.seed[i];
      const b = smooth(this.radius[i] * 0.8, this.radius[i] * 0.8 + 0.3, bloom * 1.15);
      // web position: breathing, rotated, tilted
      const br = 1 + Math.sin(time * 0.7 + this.radius[i] * 9) * 0.012;
      let wx = this.web[i3] * br + Math.sin(time * 0.6 + sd * 20) * 0.02;
      let wy = this.web[i3 + 1] * br + Math.cos(time * 0.5 + sd * 17) * 0.02;
      let wz = this.web[i3 + 2] * br;
      const inInner = i >= this.innerRange[0] && i < this.innerRange[1];
      const c2 = inInner ? csi : cs;
      const s2 = inInner ? sni : sn;
      const rx = wx * c2 + wz * s2;
      const rz = -wx * s2 + wz * c2;
      wx = rx;
      wz = rz;
      const ty = wy * Math.cos(tilt) - wz * Math.sin(tilt);
      wz = wy * Math.sin(tilt) + wz * Math.cos(tilt);
      wy = ty;
      let x = lerp(this.spark[i3], wx, b);
      let y = lerp(this.spark[i3 + 1], wy, b);
      let z = lerp(this.spark[i3 + 2], wz, b);
      const t = smooth(sd * 0.3, sd * 0.3 + 0.7, textT);
      if (t > 0) {
        const tx = this.text[i3] * ts + Math.sin(time * 1.4 + sd * 40) * 0.006;
        const tyy = this.text[i3 + 1] * ts + Math.cos(time * 1.2 + sd * 30) * 0.006;
        const tz = this.text[i3 + 2] * ts;
        const swirl = t * (1 - t) * 4 * (0.8 + sd);
        x = lerp(x, tx, t) + Math.cos(sd * 6.283 + time) * swirl * 0.9;
        y = lerp(y, tyy, t) + Math.sin(sd * 6.283 + time) * swirl * 0.9;
        z = lerp(z, tz, t) + swirl * 1.2;
      }
      cur[i3] = x;
      cur[i3 + 1] = y;
      cur[i3 + 2] = z;
      const twinkle = 0.72 + 0.28 * Math.sin(time * 2.1 + sd * 50);
      al[i] = Math.max(b * 0.95, t) * twinkle * (1 - 0.35 * textT * (1 - t)) * handoff;
    }
    (this.pts.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    alpha.needsUpdate = true;

    this.fillLines(this.webLines, this.webPairs, (i, j) => {
      const a = Math.min(
        smooth(this.radius[i] * 0.8 + 0.1, this.radius[i] * 0.8 + 0.4, bloom * 1.15),
        smooth(this.radius[j] * 0.8 + 0.1, this.radius[j] * 0.8 + 0.4, bloom * 1.15),
      );
      return a * 0.55 * (1 - smooth(0, 0.35, textT));
    });
    this.fillLines(this.textLines, this.textPairs, () => smooth(0.6, 1, textT) * 0.5 * handoff);
    const spokeA = smooth(0.05, 0.2, p) * (1 - smooth(0.4, 0.58, p));
    this.fillLines(this.spokes, this.spokePairs, () => spokeA * 0.9);

    for (const m of this.lineMats) m.uniforms.uTime.value = time;

    // Spark: bright at the start, becomes the heart of the web, fades as the name forms.
    const sparkI = ignite * (1 - smooth(0.62, 0.74, p)) * (0.85 + 0.15 * Math.sin(time * 3));
    const sparkS = lerp(0.5, 0.35, bloom) * (1 + 0.06 * Math.sin(time * 2.2));
    this.sparkSprite.scale.set(sparkS, sparkS, 1);
    (this.sparkSprite.material as THREE.SpriteMaterial).opacity = sparkI;
    this.flare.scale.set(lerp(7, 4, bloom) * ignite, lerp(0.25, 0.15, bloom) * ignite, 1);
    (this.flare.material as THREE.SpriteMaterial).opacity = sparkI * lerp(0.35, 0.12, bloom);

    // Camera
    this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.05;
    const z = camZ(p);
    const drift = 1 - textT * 0.8;
    this.camera.position.set(this.mouse.x * 0.9 * drift + Math.sin(time * 0.2) * 0.08 * drift, -this.mouse.y * 0.6 * drift, z);
    this.camera.lookAt(0, 0, 0);
    this.dust.position.x = -this.mouse.x * 2;
    this.dust.position.y = this.mouse.y * 1.4 + p * 3;

    this.renderer.render(this.scene, this.camera);
  }

  private fillLines(obj: THREE.LineSegments, pairs: number[], alphaOf: (i: number, j: number) => number) {
    const pos = obj.geometry.getAttribute("position") as THREE.BufferAttribute;
    const al = obj.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const aa = al.array as Float32Array;
    const cur = this.cur;
    let any = false;
    for (let s = 0; s < pairs.length / 2; s++) {
      const i = pairs[s * 2];
      const j = pairs[s * 2 + 1];
      const a = alphaOf(Math.max(i, 0), j);
      aa[s * 2] = a;
      aa[s * 2 + 1] = a;
      if (a > 0.002) any = true;
      if (i < 0) {
        pa[s * 6] = pa[s * 6 + 1] = pa[s * 6 + 2] = 0;
      } else {
        pa[s * 6] = cur[i * 3];
        pa[s * 6 + 1] = cur[i * 3 + 1];
        pa[s * 6 + 2] = cur[i * 3 + 2];
      }
      pa[s * 6 + 3] = cur[j * 3];
      pa[s * 6 + 4] = cur[j * 3 + 1];
      pa[s * 6 + 5] = cur[j * 3 + 2];
    }
    obj.visible = any;
    pos.needsUpdate = true;
    al.needsUpdate = true;
  }

  dispose() {
    this.stop();
    window.removeEventListener("pointermove", this.onMove);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose?.();
    });
    this.renderer.dispose();
  }
}
