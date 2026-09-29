"use client";
import { useEffect, useRef } from "react";
/**
 * The 3D backdrop of the redesigned website's hero: a wide field of points rolling like a slow wave,
 * lit in the site's accent colour, with depth fog and a gentle camera drift that follows the pointer.
 * Pauses when off screen or in a hidden tab. Reduced motion and automated browsers get one still frame.
 */
export function Hero3D({ color, glow, photo }) {
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
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x000000, 6, 26);
      const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
      camera.position.set(0, 2.4, 9);

      // The wave: a grid of points, plus a second, finer layer for depth.
      const COLS = mobile ? 90 : 150;
      const ROWS = mobile ? 45 : 70;
      const W = 34;
      const D = 22;
      const n = COLS * ROWS;
      const pos = new Float32Array(n * 3);
      const base = new Float32Array(n * 2);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c;
          const x = (c / (COLS - 1) - 0.5) * W;
          const z = (r / (ROWS - 1) - 0.5) * D - 4;
          base[i * 2] = x;
          base[i * 2 + 1] = z;
          pos[i * 3] = x;
          pos[i * 3 + 2] = z;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const col = new THREE.Color(color);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
        uniforms: {
          uColor: { value: col },
          uGlow: { value: new THREE.Color(glow) },
          uSize: { value: (mobile ? 5.5 : 7) * renderer.getPixelRatio() },
          ...THREE.UniformsLib.fog,
        },
        vertexShader: `
          uniform float uSize;
          varying float vH;
          varying float vDepth;
          #include <fog_pars_vertex>
          void main() {
            vH = position.y;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vDepth = -mvPosition.z;
            gl_PointSize = uSize * (12.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec3 uGlow;
          varying float vH;
          varying float vDepth;
          #include <fog_pars_fragment>
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            vec3 c = mix(uColor, uGlow, clamp(vH * 0.55 + 0.35, 0.0, 1.0));
            float fade = clamp(1.0 - (vDepth - 6.0) / 20.0, 0.0, 1.0);
            gl_FragColor = vec4(c, a * (0.55 + 0.45 * fade));
            #ifdef USE_FOG
              float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
              gl_FragColor.a *= 1.0 - fogFactor;
            #endif
          }`,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      // A few bright motes drifting above the wave.
      const M = mobile ? 60 : 120;
      const motes = new Float32Array(M * 3);
      const speed = new Float32Array(M);
      for (let i = 0; i < M; i++) {
        motes[i * 3] = (Math.random() - 0.5) * W;
        motes[i * 3 + 1] = Math.random() * 5 + 0.5;
        motes[i * 3 + 2] = (Math.random() - 0.5) * D - 4;
        speed[i] = 0.2 + Math.random() * 0.5;
      }
      const moteGeo = new THREE.BufferGeometry();
      moteGeo.setAttribute("position", new THREE.BufferAttribute(motes, 3));
      const moteMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(glow) }, uSize: { value: (mobile ? 5 : 6) * renderer.getPixelRatio() } },
        vertexShader: `
          uniform float uSize;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * (10.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * 0.7);
          }`,
      });
      scene.add(new THREE.Points(moteGeo, moteMat));

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

      const t0 = performance.now();
      const frame = (time) => {
        for (let i = 0; i < n; i++) {
          const x = base[i * 2];
          const z = base[i * 2 + 1];
          pos[i * 3 + 1] =
            Math.sin(x * 0.28 + time * 0.55) * 0.9 + Math.cos(z * 0.35 + time * 0.4) * 0.7 + Math.sin((x + z) * 0.16 - time * 0.3) * 0.55 - 1.2;
        }
        geo.attributes.position.needsUpdate = true;
        for (let i = 0; i < M; i++) {
          motes[i * 3 + 1] += speed[i] * 0.004;
          if (motes[i * 3 + 1] > 6) motes[i * 3 + 1] = 0.3;
        }
        moteGeo.attributes.position.needsUpdate = true;
        mouse.x += (mouse.tx - mouse.x) * 0.04;
        mouse.y += (mouse.ty - mouse.y) * 0.04;
        camera.position.x = Math.sin(time * 0.08) * 1.2 + mouse.x * 2.4;
        camera.position.y = 2.4 - mouse.y * 1.0;
        camera.lookAt(0, -0.2, -4);
        renderer.render(scene, camera);
      };

      let raf = 0;
      let running = false;
      const loop = () => {
        frame((performance.now() - t0) / 1000);
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
        geo.dispose();
        mat.dispose();
        moteGeo.dispose();
        moteMat.dispose();
        renderer.dispose();
      };
    })().catch(() => {});
    return () => {
      disposed = true;
      cleanup();
    };
  }, [color, glow]);
  return <canvas ref={ref} data-photo={photo ? "" : undefined} aria-hidden="true" />;
}
