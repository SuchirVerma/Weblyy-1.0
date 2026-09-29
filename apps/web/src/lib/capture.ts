import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page } from "playwright-core";
import { setBytes, useRedis } from "./kv";
import { isPublicHost } from "./net";
import { withBrowser } from "./render";
import type { Capture, PageMetrics } from "./types";

/**
 * Opens a page in a real browser the way a customer would (images, fonts and styles on),
 * once on a laptop and once on a phone. Measures what a visitor experiences and takes screenshots.
 * The same measurements run on the original site and on the redesign, so before and after are comparable.
 */

export const SHOT_DIR = path.join(process.env.DATA_DIR || path.join(process.cwd(), ".data"), "shots");
const SHOT_TTL = 60 * 24 * 3600;
const TRACKERS = /google-analytics|googletagmanager|doubleclick|facebook\.net|connect\.facebook|hotjar|clarity\.ms|adservice|googlesyndication/i;
const MAX_SHOT_H = { desktop: 5200, mobile: 7000 };

const DEVICES = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
  },
} as const;
type Device = keyof typeof DEVICES;

interface Brand {
  colors: string[];
  headingFont: string;
  bodyFont: string;
  images: { src: string; alt: string; w: number; h: number }[];
  logo: string;
}

/** Runs inside the page. Kept free of outside references so it can be serialised. */
function inPage(): { metrics: Omit<PageMetrics, "loadMs" | "bytes" | "requests">; brand: Brand } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const CTA = /book|appointment|call|whatsapp|chat|enquir|inquir|contact|quote|order|reserve|schedule|register|enrol|sign up|get started|visit/i;
  const visible = (el: Element) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05;
  };
  const all = Array.from(document.body.querySelectorAll("*"));

  let smallText = 0;
  for (const el of all) {
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? "")
      .join("")
      .trim();
    if (own.length < 3 || !visible(el)) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 12) smallText++;
  }

  const targets = Array.from(document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button]")).filter(visible);
  const smallTargets = targets.filter((el) => {
    if (el.closest("p, li p, td")) return false; // links inside a sentence are exempt
    const r = el.getBoundingClientRect();
    return r.width < 32 || r.height < 32;
  }).length;

  const ctaAboveFold = [
    ...new Set(
      targets
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const t = (el.textContent ?? "").trim() || el.getAttribute("aria-label") || "";
          const href = el.getAttribute("href") ?? "";
          return r.top + window.scrollY < vh && r.bottom > 0 && (CTA.test(t) || /^tel:|wa\.me|whatsapp/i.test(href));
        })
        .map((el) => ((el.textContent ?? "").trim() || el.getAttribute("aria-label") || el.getAttribute("href") || "").replace(/\s+/g, " ").slice(0, 40)),
    ),
  ].slice(0, 6);

  const imgs = Array.from(document.images);
  const labelled = (el: Element) => {
    const id = el.getAttribute("id");
    return Boolean(
      el.closest("label") ||
        (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
        el.getAttribute("aria-label") ||
        el.getAttribute("aria-labelledby") ||
        el.getAttribute("title"),
    );
  };
  const inputs = Array.from(document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")).filter(visible);

  const fonts = new Set<string>();
  for (const el of Array.from(document.querySelectorAll("h1, h2, h3, p, a, button, li")).filter(visible).slice(0, 400)) {
    fonts.add(getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim());
  }

  const stickyContact = all.some((el) => {
    const pos = getComputedStyle(el).position;
    if (pos !== "fixed" && pos !== "sticky") return false;
    if (!visible(el)) return false;
    return Boolean(el.querySelector('a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp"], iframe, button')) || /book|call|whatsapp|chat/i.test(el.textContent ?? "");
  });

  // Brand colours: saturated fills and text on buttons, links, headings and the header, weighted by area.
  const weights = new Map<string, number>();
  const toHex = (c: string) => {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
    if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return null;
    const [r, g, b] = [m[1], m[2], m[3]].map(Number);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat < 0.28 || max < 40 || (min > 225 && max > 240)) return null;
    return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
  };
  const add = (hex: string | null, w: number) => hex && weights.set(hex, (weights.get(hex) ?? 0) + w);
  for (const el of Array.from(document.querySelectorAll("a, button, header, nav, h1, h2, h3, [class*=btn], [class*=button]")).filter(visible).slice(0, 500)) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    add(toHex(cs.backgroundColor), Math.min(r.width * r.height, 60_000) / 1000 + 3);
    add(toHex(cs.color), /^H[1-3]$/.test(el.tagName) ? 4 : 1);
  }
  const colors = [...weights.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);

  const images: Brand["images"] = [];
  for (const img of imgs) {
    const r = img.getBoundingClientRect();
    const src = img.currentSrc || img.src;
    if (!src || !/^https?:/.test(src) || img.naturalWidth < 400 || r.width < 200 || img.closest("header, nav, footer")) continue;
    if (/logo|icon|sprite|avatar|whatsapp|payment/i.test(src)) continue;
    if (!images.some((i) => i.src === src)) images.push({ src, alt: (img.alt || "").slice(0, 120), w: img.naturalWidth, h: img.naturalHeight });
  }
  // Hero photos are often CSS backgrounds.
  for (const el of all.slice(0, 1500)) {
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg.match(/url\(["']?(https?:[^"')]+)["']?\)/);
    if (!m || /logo|icon|sprite|pattern|\.svg/i.test(m[1])) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 600 && r.height >= 260 && !images.some((i) => i.src === m[1])) images.push({ src: m[1], alt: "", w: Math.round(r.width), h: Math.round(r.height) });
  }

  const logoImg = Array.from(document.querySelectorAll("header img, [class*=logo] img, img[class*=logo], img[alt*=logo i], img[src*=logo i]")).find(
    (el) => visible(el) && el.getBoundingClientRect().top + window.scrollY < 220,
  ) as HTMLImageElement | undefined;

  const first = (sel: string) => {
    const el = Array.from(document.querySelectorAll(sel)).find(visible);
    return el ? getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim() : "";
  };

  return {
    metrics: {
      heightPx: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth > vw + 4,
      smallText,
      smallTargets,
      ctaAboveFold,
      images: imgs.length,
      imagesNoAlt: imgs.filter((i) => !i.hasAttribute("alt")).length,
      brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:")).length,
      unlabeledInputs: inputs.filter((i) => !labelled(i)).length,
      vagueLinks: Array.from(document.querySelectorAll("a")).filter((a) => /^(click here|here|read more|more|learn more|know more|click)$/i.test((a.textContent ?? "").trim())).length,
      fonts: [...fonts].filter(Boolean).slice(0, 8),
      stickyContact,
    },
    brand: {
      colors: colors.slice(0, 4),
      headingFont: first("h1, h2"),
      bodyFont: first("p, li"),
      images: images.slice(0, 10),
      logo: logoImg ? logoImg.currentSrc || logoImg.src : "",
    },
  };
}

async function allowRequests(ctx: BrowserContext, allowOrigin?: string) {
  await ctx.route("**/*", async (route) => {
    const u = route.request().url();
    if (TRACKERS.test(u)) return route.abort();
    try {
      const url = new URL(u);
      if (url.protocol === "data:" || url.protocol === "blob:") return route.continue();
      if (url.protocol !== "http:" && url.protocol !== "https:") return route.abort();
      if (allowOrigin && url.origin === allowOrigin) return route.continue();
      return (await isPublicHost(url.hostname)) ? route.continue() : route.abort();
    } catch {
      return route.abort();
    }
  });
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 3500 }).catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  // Load lazy images now, scroll through once for scripts that wait for scrolling, then return to the top.
  await page
    .evaluate(async () => {
      document.querySelectorAll("img[loading=lazy]").forEach((i) => ((i as HTMLImageElement).loading = "eager"));
      const step = Math.max(400, window.innerHeight * 0.8);
      for (let y = 0; y < Math.min(document.documentElement.scrollHeight, 9000); y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    })
    .catch(() => {});
  // Scroll-reveal effects (AOS, WOW, Elementor and friends) hide content until it scrolls into view,
  // and some hide it again on the way back up. Show it all, as a visitor scrolling through would see it.
  await page
    .addStyleTag({
      content:
        "[data-aos],[data-sal],[data-animate],.wow,.reveal,.elementor-invisible,.animate__animated,.fade-up,.fade-in,.scroll-reveal,.sr-only-until-visible{opacity:1!important;visibility:visible!important;transform:none!important}" +
        "*,*::before,*::after{animation-delay:0s!important;animation-duration:0s!important;transition-duration:0s!important}",
    })
    .catch(() => {});
  // Wait (briefly) for images still downloading, so screenshots don't show empty frames.
  await page
    .evaluate(() =>
      Promise.race([
        Promise.all(Array.from(document.images).map((i) => (i.complete
            ? null
            : new Promise((r) => {
                i.addEventListener("load", r, { once: true });
                i.addEventListener("error", r, { once: true });
              })),
        )),
        new Promise((r) => setTimeout(r, 5000)),
      ]),
    )
    .catch(() => {});
  await page.waitForTimeout(400);
}

async function measure(ctxFactory: () => Promise<BrowserContext>, url: string, device: Device, allowOrigin: string | undefined, file: string | null) {
  const ctx = await ctxFactory();
  try {
    await allowRequests(ctx, allowOrigin);
    const page = await ctx.newPage();
    let bytes = 0;
    let requests = 0;
    page.on("requestfinished", (req) => {
      requests++;
      req
        .sizes()
        .then((s) => (bytes += s.responseBodySize + s.responseHeadersSize))
        .catch(() => {});
    });
    const started = Date.now();
    await page.goto(url, { waitUntil: "load", timeout: 25_000 }).catch(async () => {
      // Some sites never fire "load" (a stuck tracker). Carry on with whatever rendered.
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    });
    const loadMs = Date.now() - started;
    await settle(page);
    const { metrics, brand } = await page.evaluate(inPage);
    let shot: string | undefined;
    if (file) {
      const h = Math.min(metrics.heightPx, MAX_SHOT_H[device]);
      const width = DEVICES[device].viewport.width;
      const buf = await page.screenshot({ type: "jpeg", quality: device === "mobile" ? 62 : 72, fullPage: true, clip: { x: 0, y: 0, width, height: h } }).catch(() => null);
      if (buf) {
        shot = `${file}-${device}.jpg`;
        if (useRedis) await setBytes(`shot:${shot}`, buf, SHOT_TTL);
        else {
          await mkdir(SHOT_DIR, { recursive: true });
          await writeFile(path.join(SHOT_DIR, shot), buf);
        }
      }
    }
    const html = device === "desktop" ? await page.content().catch(() => "") : "";
    return { metrics: { ...metrics, loadMs, bytes, requests } as PageMetrics, brand, shot, html };
  } finally {
    await ctx.close().catch(() => {});
  }
}

/**
 * Measures a page on a laptop and a phone at the same time.
 * `allowOrigin` lets our own server be opened (the redesign preview and the built-in demo), which is otherwise blocked.
 */
export async function capturePage(url: string, opts: { allowOrigin?: string; shots?: boolean } = {}): Promise<Capture | null> {
  return withBrowser(async (browser) => {
    const file = opts.shots === false ? null : randomBytes(8).toString("hex");
    const make = (d: Device) => () => browser.newContext({ ...DEVICES[d], ignoreHTTPSErrors: true });
    const [desktop, mobile] = await Promise.all([
      measure(make("desktop"), url, "desktop", opts.allowOrigin, file).catch(() => null),
      measure(make("mobile"), url, "mobile", opts.allowOrigin, file).catch(() => null),
    ]);
    if (!desktop && !mobile) return null;
    return {
      url,
      desktop: desktop?.metrics ?? null,
      mobile: mobile?.metrics ?? null,
      shots: { desktop: desktop?.shot, mobile: mobile?.shot },
      brand: desktop?.brand ?? mobile!.brand,
      html: desktop?.html ?? "",
    };
  });
}
