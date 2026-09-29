/**
 * Dashboards opened during this visit, so the "Dashboard" menu link can take the owner straight back.
 * Kept per tab session on purpose: a fresh visit starts from the search, not from an old business.
 */
const KEY = "weblyy-dashboards";
function store() {
  // Clear what older versions kept across visits.
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return sessionStorage;
}
export function savedDashboards() {
  try {
    const list = JSON.parse(store().getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.sort((a, b) => b.at - a.at) : [];
  } catch {
    return [];
  }
}
export function rememberDashboard(d) {
  try {
    const rest = savedDashboards().filter((x) => x.id !== d.id);
    store().setItem(KEY, JSON.stringify([{ ...d, at: Date.now() }, ...rest].slice(0, 12)));
  } catch {
    /* storage blocked: the menu link falls back to the list page */
  }
}
export function forgetDashboard(id) {
  try {
    store().setItem(KEY, JSON.stringify(savedDashboards().filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}
export const dashboardHref = (d) => `/dashboard/${d.id}?key=${encodeURIComponent(d.key)}`;
