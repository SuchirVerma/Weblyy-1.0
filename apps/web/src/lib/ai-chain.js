import "server-only";
/**
 * A chain of AI providers that all speak the same chat-completions format.
 * Each one is switched on by its API key. A request goes to the first provider that is ready;
 * when one runs out of free quota, is slow, fails or returns something unusable, the next one is tried.
 * When every provider has been tried the caller gets null and uses the rules engine.
 *
 *   AI_PROVIDERS       optional order, e.g. "gemini,groq,openrouter"
 *   <NAME>_API_KEY     switches a provider on
 *   <NAME>_MODEL       optional model override
 *   <NAME>_BASE_URL    optional endpoint override
 */
const PROVIDERS = {
  groq: { url: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  cerebras: { url: "https://api.cerebras.ai/v1", model: "llama-3.3-70b" },
  mistral: { url: "https://api.mistral.ai/v1", model: "mistral-small-latest" },
  openrouter: { url: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct:free" },
};
const DEFAULT_ORDER = ["groq", "gemini", "cerebras", "mistral", "openrouter"];
const COOLDOWN_MS = 5 * 60_000; // after a rate limit with no Retry-After
const BROKEN_MS = 60_000; // after a server error or timeout
const g = globalThis;
/** provider name -> time it may be used again. Kept per server instance. */
const resting = (g.__weblyyAiResting ??= new Map());

const env = (name, key) => process.env[`${name.toUpperCase()}_${key}`];

/** Providers that have a key, in the order they are tried. */
export function aiProviders() {
  const wanted = (process.env.AI_PROVIDERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => PROVIDERS[s]);
  const order = [...new Set([...wanted, ...DEFAULT_ORDER])];
  return order
    .filter((name) => env(name, "API_KEY"))
    .map((name) => ({
      name,
      key: env(name, "API_KEY"),
      url: (env(name, "BASE_URL") || PROVIDERS[name].url).replace(/\/+$/, ""),
      model: env(name, "MODEL") || PROVIDERS[name].model,
    }));
}
export const aiChainEnabled = () => aiProviders().length > 0;

function rest(name, ms) {
  resting.set(name, Date.now() + ms);
}
/** Seconds from a Retry-After header, kept between 10 seconds and 1 hour. */
function retryAfterMs(res) {
  const s = Number(res.headers.get("retry-after"));
  return Number.isFinite(s) && s > 0 ? Math.min(Math.max(s, 10), 3600) * 1000 : COOLDOWN_MS;
}
/** Models sometimes wrap JSON in a code fence or add a sentence around it. */
function readJSON(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function ask(p, { system, messages, maxTokens }, timeoutMs) {
  const res = await fetch(`${p.url}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.model,
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 200);
    const limited = res.status === 429 || (/quota|rate.?limit|credit|billing/i.test(body) && [402, 403].includes(res.status));
    // Out of quota: wait as long as the provider says. A busy server: a minute. A wrong key or model: five minutes.
    // A request the provider simply didn't like (too long, bad format) says nothing about the next request.
    if (limited) rest(p.name, retryAfterMs(res));
    else if (res.status >= 500) rest(p.name, BROKEN_MS);
    else if ([401, 403, 404].includes(res.status)) rest(p.name, COOLDOWN_MS);
    throw new Error(`${limited ? "limit reached" : `HTTP ${res.status}`} ${body.replace(/\s+/g, " ")}`.trim());
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content;
}

/**
 * Asks for a JSON answer. `shape` is a plain-text description of the JSON wanted and `check` turns the parsed
 * JSON into the final value, or returns null when it isn't usable.
 * Returns { data, provider } or null when no provider could answer inside `budgetMs`.
 */
export async function chainJSON({ system, messages, shape, check, maxTokens = 1000, budgetMs = 12_000, perTryMs = 7_000 }) {
  const started = Date.now();
  const request = {
    system: `${system}\n\nReply with one JSON object only, no other text, in exactly this shape:\n${shape}`,
    messages,
    maxTokens,
  };
  for (const p of aiProviders()) {
    const left = budgetMs - (Date.now() - started);
    if (left < 1500) break;
    if ((resting.get(p.name) ?? 0) > Date.now()) continue;
    try {
      const parsed = readJSON(await ask(p, request, Math.min(left, perTryMs)));
      const data = parsed ? check(parsed) : null;
      if (data) return { data, provider: p.name };
      console.error(`[ai] ${p.name}: answer was not usable, trying the next provider`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/timed out|timeout|aborted/i.test(msg)) rest(p.name, BROKEN_MS);
      console.error(`[ai] ${p.name} failed (${msg.slice(0, 160)}), trying the next provider`);
    }
  }
  return null;
}
