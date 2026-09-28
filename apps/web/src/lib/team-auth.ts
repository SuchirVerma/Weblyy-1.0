import "server-only";

/** The team pages open on localhost, or anywhere with ?key=ADMIN_KEY once ADMIN_KEY is set. */
export function teamAllowed(host: string, key: unknown) {
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey) return typeof key === "string" && key === adminKey;
  return /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
}
