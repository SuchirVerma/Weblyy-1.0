"use client";
import { useEffect, useRef, useState } from "react";
import type { WebScene } from "./web-scene";
import styles from "./intro.module.css";

const NAME = "Weblyy";

/**
 * The landing screen: the name and tagline, with the 3D web playing behind them on a loop.
 * One dot blooms into a web, breathes, folds back into the dot and blooms again, from the moment the page opens.
 * Without WebGL, or with reduced motion, it shows one still frame of the web instead.
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

    // The title card is always the finished state: name and tagline on, no letterbox, no scroll cue.
    st.style.setProperty("--bars", "0");
    st.style.setProperty("--start", "0");
    st.style.setProperty("--veil", "0");
    st.style.setProperty("--end", "1");
    st.setAttribute("data-end", "");

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let entrance = 0;
    const showTitle = (instant: boolean) => {
      if (instant) {
        st.style.setProperty("--title", "1");
        return;
      }
      const t0 = performance.now() + 350;
      const step = (now: number) => {
        const k = Math.min(1, Math.max(0, (now - t0) / 1600));
        st.style.setProperty("--title", (k * k * (3 - 2 * k)).toFixed(3));
        if (k < 1) entrance = requestAnimationFrame(step);
      };
      entrance = requestAnimationFrame(step);
    };

    // The name appears straight away; it never waits for the 3D scene to load.
    showTitle(reduce);

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
      return () => cancelAnimationFrame(entrance);
    }

    let scene: WebScene | null = null;
    let disposed = false;
    let visible = true;

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
      });
      if (reduce) {
        scene.still(0.5);
        setMode("still");
        return;
      }
      scene.autoplay();
      setMode("live");
      if (visible && !document.hidden) scene.start();
    })().catch(() => setMode("still"));

    // Pause when the landing screen is scrolled away or the tab is hidden; resume where it was.
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
    const onResize = () => scene?.resize();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      cancelAnimationFrame(entrance);
      io.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      scene?.dispose();
    };
  }, []);

  const toProduct = () => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(nextId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
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

        <button type="button" className={`${styles.cue} ${styles.cueEnd}`} onClick={toProduct}>
          <span>Explore Weblyy</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </section>
  );
}
