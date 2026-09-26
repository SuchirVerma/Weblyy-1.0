import "server-only";
import * as cheerio from "cheerio";
import { renderPage } from "./render";

export interface InstagramProfile {
  handle: string;
  url: string;
  name: string;
  bio: string;
  followers: string;
  posts: string;
  link: string;
}

export function instagramHandle(input: string): string | null {
  const s = input.trim();
  const at = s.match(/^@([A-Za-z0-9._]{1,30})$/);
  if (at) return at[1];
  const m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/i);
  if (m && !/^(p|reel|reels|explore|accounts|stories|direct)$/i.test(m[1])) return m[1];
  return null;
}

/** Reads a public Instagram profile the way a logged-out visitor sees it. */
export async function readInstagram(handle: string): Promise<InstagramProfile | null> {
  const url = `https://www.instagram.com/${handle}/`;
  const page = await renderPage(url, 20_000, 2);
  if (!page) return null;
  const $ = cheerio.load(page.html);
  const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
  const desc = $('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "";
  if (!ogTitle && !desc) return null; // login wall or missing profile

  const name = ogTitle.replace(/\s*\(@[^)]+\).*$/, "").trim() || handle;
  const followers = desc.match(/([\d.,]+[KMB]?)\s+Followers/i)?.[1] ?? "";
  const posts = desc.match(/([\d.,]+[KMB]?)\s+Posts/i)?.[1] ?? "";
  const bio = (desc.match(/on Instagram:\s*"([\s\S]*)"\s*$/)?.[1] ?? "").trim();

  let link = "";
  $("a[href]").each((_, a) => {
    if (link) return;
    const href = $(a).attr("href") ?? "";
    try {
      const u = new URL(href, "https://www.instagram.com");
      if (u.hostname === "l.instagram.com") {
        const target = u.searchParams.get("u");
        if (target) link = target;
      }
    } catch {
      /* ignore */
    }
  });
  if (!link) {
    // Logged-out pages sometimes show the bio link as plain text.
    $("script, style, noscript, template").remove();
    $("br, div, span, a, li, p, h1, h2, section, header").after(" ");
    const text = $("header").text() || $("main").text() || $("body").text();
    const re = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,24}(?:\/[^\s|]*)?)/gi;
    for (const m of text.matchAll(re)) {
      const candidate = m[1];
      if (/instagram\.com|threads\.|meta\.|facebook\.com|cdninstagram|fbcdn/i.test(candidate)) continue;
      if (/\.(classic|js|json|css|min|png|jpe?g|webp|gif|svg|mp4|prototype)$/i.test(candidate.split("/")[0])) continue;
      if (!/\.(com|in|co|net|org|io|app|biz|info|me|shop|store|site|online|xyz|ee|link|bio|ai|studio|salon|clinic|health|care|edu|ac|page|tech|club)(\/|$)/i.test(candidate)) continue;
      link = candidate.startsWith("http") ? candidate : `https://${candidate}`;
      break;
    }
  }
  try {
    if (link) {
      const u = new URL(link);
      for (const p of [...u.searchParams.keys()]) if (/^utm_|^fbclid$|^igsh/i.test(p)) u.searchParams.delete(p);
      link = u.toString();
    }
  } catch {
    link = "";
  }

  return { handle, url, name, bio, followers, posts, link };
}

export const LINK_HUBS = /linktr\.ee|bio\.link|beacons\.ai|taplink\.|linkin\.bio|campsite\.bio|msha\.ke|lnk\.bio|solo\.to|carrd\.co/i;
export const NOT_A_WEBSITE = /wa\.me|whatsapp\.com|api\.whatsapp|t\.me|forms\.gle|docs\.google|bit\.ly|tinyurl|goo\.gl|maps\.app|youtube\.com|youtu\.be|facebook\.com|fb\.me|instagram\.com|threads\.(net|com)|zomato|swiggy|justdial/i;
