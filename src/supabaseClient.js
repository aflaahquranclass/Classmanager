import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing Supabase env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY."
  );
}

// Every request to Supabase gives up after a while instead of waiting forever.
// On a phone a request can be left hanging with no answer (the app was put in
// the background mid-request, the Wi-Fi changed), and the browser never ends
// it. When that request was the sign-in refresh, every later request waits for
// it, so the whole app looked stuck on "Loading…" until it was closed and
// opened again. Now it fails, the screen shows its error / Retry, and the
// sign-in refresh is tried again a moment later (the user stays signed in: a
// failed request is never treated as a sign-out). File uploads (payment slips)
// get longer, for a slow connection.
const TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 120_000;

function fetchWithTimeout(input, init = {}) {
  const url = typeof input === "string" ? input : input?.url || String(input);
  const method = (init.method || input?.method || "GET").toUpperCase();
  const upload = url.includes("/storage/v1/") && method !== "GET";
  const ms = upload ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS;
  const controller = new AbortController();
  const outer = init.signal;
  const onOuterAbort = () => controller.abort(outer.reason);
  if (outer) {
    if (outer.aborted) controller.abort(outer.reason);
    else outer.addEventListener("abort", onOuterAbort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(new DOMException("The request took too long. Check your internet and try again.", "AbortError")), ms);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
  });
}

// Opened from a "Forgot password?" email: the link signs the person in, and
// the staff portal must then ask for a new password before anything else.
// Read here, before the client below reads the link and clears it from the
// address bar. An expired or used link comes back with an error instead.
const authHash = new URLSearchParams(typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, ""));
export const passwordRecoveryLink = authHash.get("type") === "recovery";
export const authLinkError = authHash.get("error_description") || authHash.get("error") || "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout },
});
