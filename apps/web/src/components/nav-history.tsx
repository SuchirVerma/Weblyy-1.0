"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Remembers which Weblyy screens were visited in this tab, so the Back button knows
 * whether the previous screen is ours (go back) or not (open the homepage instead).
 */
const KEY = "weblyy-trail";
export const NAV_EVENT = "weblyy:nav";

function read(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(trail: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-50)));
  } catch {
    /* storage blocked: Back falls back to the homepage */
  }
}

function record() {
  const here = window.location.pathname + window.location.search + window.location.hash;
  const trail = read();
  if (trail[trail.length - 1] === here) return;
  if (trail[trail.length - 2] === here) trail.pop();
  else trail.push(here);
  write(trail);
}

/** True when the screen before this one in the tab was a Weblyy screen. */
export function canGoBack() {
  return read().length > 1;
}

export function NavHistory() {
  const path = usePathname();
  useEffect(() => {
    record();
  }, [path]);
  useEffect(() => {
    const on = () => record();
    window.addEventListener("popstate", on);
    window.addEventListener("hashchange", on);
    window.addEventListener(NAV_EVENT, on);
    return () => {
      window.removeEventListener("popstate", on);
      window.removeEventListener("hashchange", on);
      window.removeEventListener(NAV_EVENT, on);
    };
  }, []);
  return null;
}
