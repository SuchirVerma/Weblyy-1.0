"use client";
import { useEffect, useRef, useState } from "react";
import type { WebScene } from "./web-scene";
import styles from "./intro.module.css";

const NAME = "Weblyy";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The opening title sequence: one spark becomes a web, and the web becomes the name.
 * A tall section with a sticky stage; scroll position drives the scene (forward and backward).
 * Without WebGL, or with reduced motion, it shows a still title card instead.
 */
export function CinematicIntro({ nextId }: { nextId: string }) {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "live" | "still">("loading");

  useEffect(() => {
    const el = section.current;
    const cv = canvas.current;
    const st = stage.current;
    if (!el || !cv || !st) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = (() => {
      try {
        const c = document.createElement("canvas");
        return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {
        return false;
      }
    })();
    if (!gl) {
      queueMicrotask(() => setMode("still"));
      return;
    }

    let scene: WebScene | null = null;
    let disposed = false;
    let visible = true;
    let raf = 0;

    const progress = () => {
      const r = el.getBoundingClientRect();
      const span = el.offsetHeight - window.innerHeight;
      return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
    };

    // CSS-driven layers (bars, title, cues) follow scroll directly; the 3D scene eases toward it.
    const paint = () => {
      raf = 0;
      const p = progress();
      st.style.setProperty("--p", p.toFixed(4));
      st.style.setProperty("--title", smooth(0.78, 0.9, p).toFixed(3));
      st.style.setProperty("--bars", (1 - smooth(0.74, 0.92, p)).toFixed(3));
      st.style.setProperty("--start", (1 - smooth(0.0, 0.06, p)).toFixed(3));
      st.style.setProperty("--end", smooth(0.86, 0.94, p).toFixed(3));
      st.style.setProperty("--veil", smooth(0.95, 1, p).toFixed(3));
      st.toggleAttribute("data-start", p < 0.05);
      st.toggleAttribute("data-end", p > 0.9);
      scene?.setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    (async () => {
      await document.fonts?.ready;
      const mod = await import("./web-scene");
      if (disposed) return;
      const fontFamily = getComputedStyle(document.documentElement).getPropertyValue("--font-display").trim() || "sans-serif";
      scene = new mod.WebScene({
        canvas: cv,
        word: NAME,
        fontFamily,
        mobile: window.innerWidth < 700,
        // The scene sizes its sampling canvas as glyph width + 20px at a 220px font; match that exactly.
        onTextWidth: (px) => {
          const g = document.createElement("canvas").getContext("2d");
          if (!g) return;
          g.font = `700 220px ${fontFamily}`;
          const canvasW = Math.ceil(g.measureText(NAME).width) + 20;
          st.style.setProperty("--word-size", `${((px * 220) / canvasW).toFixed(1)}px`);
        },
      });
      paint();
      if (reduce) {
        scene.still(1);
        st.style.setProperty("--title", "1");
        st.style.setProperty("--bars", "0");
        st.style.setProperty("--start", "0");
        st.style.setProperty("--end", "1");
        st.setAttribute("data-end", "");
        setMode("still");
        return;
      }
      setMode("live");
      if (visible) scene.start();
    })().catch(() => setMode("still"));

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!scene || reduce) return;
      if (visible && !document.hidden) scene.start();
      else scene.stop();
    });
    io.observe(el);
    const onVis = () => {
      if (!scene || reduce) return;
      if (document.hidden) scene.stop();
      else if (visible) scene.start();
    };
    const onResize = () => {
      scene?.resize();
      paint();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    paint();
    return () => {
      disposed = true;
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      scene?.dispose();
    };
  }, []);

  const toProduct = () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(nextId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };
  const begin = () => {
    const el = section.current;
    if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + span * 0.45, behavior: "smooth" });
  };

  return (
    <section ref={section} className={styles.intro} data-mode={mode} aria-label={NAME}>
      <div ref={stage} className={styles.stage}>
        <div className={styles.poster} aria-hidden="true">
          <span className={styles.posterSpark} />
          <span className={styles.posterFlare} />
        </div>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <div className={styles.vignette} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />

        <h1 className={styles.title}>
          <span className="sr-only">{NAME}</span>
          <span aria-hidden="true" className={styles.word}>
            {NAME}
          </span>
        </h1>
        <p className={styles.tagline}>
          The future isn&rsquo;t AI-ready. <b>Your business can be.</b>
        </p>

        <div className={styles.bars} aria-hidden="true">
          <i />
          <i />
        </div>

        <button type="button" className={`${styles.cue} ${styles.cueStart}`} onClick={begin} aria-label="Scroll to begin">
          <span className={styles.mouse} aria-hidden="true">
            <i />
          </span>
          <span>Scroll to begin</span>
        </button>
        <button type="button" className={`${styles.cue} ${styles.cueEnd}`} onClick={toProduct}>
          <span>Explore Weblyy</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" className={styles.skip} onClick={toProduct}>
          Skip intro
        </button>

        <div className={styles.veil} aria-hidden="true" />
      </div>
    </section>
  );
}
