import "server-only";
import type { Browser } from "playwright-core";
import { isPublicHost } from "./net";

/**
 * Renders pages in a real (headless) Chrome so JavaScript-built sites and injected widgets
 * (floating WhatsApp buttons, chat bubbles, booking embeds) are visible to the crawler.
 * Uses the Chrome already installed on the machine; if there is none, rendering is skipped.
 */

const g = globalThis as unknown as { __fsBrowser?: Promise<Browser | null>; __fsBrowserIdle?: NodeJS.Timeout; __fsActive?: number };
const IDLE_MS = 90_000;

async function launch(): Promise<Browser | null> {
  if (process.env.DISABLE_BROWSER === "1") return null;
  try {
    const { chromium } = await import("playwright-core");
    if (process.env.VERCEL) {
      // Serverless: no Chrome installed, so use the Chromium build made for AWS Lambda-style functions.
      const serverless = (await import("@sparticuz/chromium")).default;
      // Its flags include --single-process, which the function sandbox needs; that's also why each job gets a fresh browser.
      const browser = await chromium.launch({ headless: true, executablePath: await serverless.executablePath(), args: serverless.args });
      return browser;
    }
    const opts = { headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] };
    return await chromium
      .launch({ ...opts, channel: "chrome" })
      .catch(() => (process.env.CHROME_PATH ? chromium.launch({ ...opts, executablePath: process.env.CHROME_PATH }) : Promise.reject()));
  } catch (e) {
    console.error("[browser] couldn't start Chrome:", e instanceof Error ? e.message : e);
    return null;
  }
}

function getBrowser() {
  g.__fsBrowser ??= launch().then((b) => {
    b?.on("disconnected", () => {
      g.__fsBrowser = undefined;
    });
    return b;
  });
  if (g.__fsBrowserIdle) clearTimeout(g.__fsBrowserIdle);
  g.__fsBrowserIdle = setTimeout(async () => {
    if ((g.__fsActive ?? 0) > 0) return getBrowser();
    const b = await g.__fsBrowser;
    g.__fsBrowser = undefined;
    await b?.close().catch(() => {});
  }, IDLE_MS);
  return g.__fsBrowser;
}

/** Start Chrome ahead of the first scan so it is ready when needed. */
export function warmBrowser() {
  void getBrowser();
}

export async function browserAvailable() {
  return (await getBrowser()) !== null;
}

const BLOCKED_TYPES = new Set(["image", "media", "font", "stylesheet"]);
const TRACKERS = /google-analytics|googletagmanager|doubleclick|facebook\.net|connect\.facebook|hotjar|clarity\.ms|analytics|pixel|adservice|googlesyndication|youtube\.com\/embed|player\.vimeo/i;

export async function renderPage(url: string, timeoutMs = 15_000, attempts = 1): Promise<{ url: string; html: string } | null> {
  for (let i = 0; i < attempts; i++) {
    const r = await renderOnce(url, timeoutMs + i * 8000);
    if (r) return r;
  }
  return null;
}

async function renderOnce(url: string, timeoutMs: number): Promise<{ url: string; html: string } | null> {
  // Vercel: a fresh Chromium per page (see withBrowser); elsewhere the shared one.
  const own = process.env.VERCEL ? await launch() : null;
  const browser = own ?? (process.env.VERCEL ? null : await getBrowser());
  if (!browser) return null;
  g.__fsActive = (g.__fsActive ?? 0) + 1;
  let ctx: Awaited<ReturnType<Browser["newContext"]>> | null = null;
  try {
    ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
    });
    const page = await ctx.newPage();
    await page.route("**/*", async (route) => {
      const req = route.request();
      if (BLOCKED_TYPES.has(req.resourceType()) || TRACKERS.test(req.url())) return route.abort();
      let host = "";
      try {
        const u = new URL(req.url());
        if (u.protocol === "data:" || u.protocol === "blob:") return route.continue();
        if (u.protocol !== "http:" && u.protocol !== "https:") return route.abort();
        host = u.hostname;
      } catch {
        return route.abort();
      }
      return (await isPublicHost(host)) ? route.continue() : route.abort();
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    // Give late widgets (chat bubbles, WhatsApp buttons) a moment to inject themselves.
    await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await page.waitForTimeout(350);
    const html = await page.content();
    return { url: page.url(), html };
  } catch {
    return null;
  } finally {
    g.__fsActive = Math.max(0, (g.__fsActive ?? 1) - 1);
    await ctx?.close().catch(() => {});
    await own?.close().catch(() => {});
  }
}

/** Runs `fn` with the shared Chrome, keeping it alive meanwhile. Null when no browser is available or `fn` fails. */
export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T | null> {
  // On Vercel a Chromium that has already opened and closed pages can refuse new ones,
  // so each job gets its own fresh browser there. Elsewhere the shared one is reused.
  if (process.env.VERCEL) {
    const own = await launch();
    if (!own) return null;
    try {
      return await fn(own);
    } catch (e) {
      console.error("[browser]", e instanceof Error ? e.message : e);
      return null;
    } finally {
      await own.close().catch(() => {});
    }
  }
  const browser = await getBrowser();
  if (!browser) return null;
  g.__fsActive = (g.__fsActive ?? 0) + 1;
  try {
    return await fn(browser);
  } catch (e) {
    console.error("[browser]", e instanceof Error ? e.message : e);
    return null;
  } finally {
    g.__fsActive = Math.max(0, (g.__fsActive ?? 1) - 1);
  }
}
