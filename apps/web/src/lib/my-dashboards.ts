/** Dashboards opened in this browser, so the "Dashboard" menu link can take the owner straight back. Client-side only. */

export interface SavedDashboard {
  id: string;
  key: string;
  name: string;
  type: string;
  at: number;
}

const KEY = "weblyy-dashboards";

export function savedDashboards(): SavedDashboard[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as SavedDashboard[];
    return Array.isArray(list) ? list.sort((a, b) => b.at - a.at) : [];
  } catch {
    return [];
  }
}

export function rememberDashboard(d: Omit<SavedDashboard, "at">) {
  try {
    const rest = savedDashboards().filter((x) => x.id !== d.id);
    localStorage.setItem(KEY, JSON.stringify([{ ...d, at: Date.now() }, ...rest].slice(0, 12)));
  } catch {
    /* storage blocked: the menu link falls back to the list page */
  }
}

export function forgetDashboard(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(savedDashboards().filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}

export const dashboardHref = (d: Pick<SavedDashboard, "id" | "key">) => `/dashboard/${d.id}?key=${encodeURIComponent(d.key)}`;
