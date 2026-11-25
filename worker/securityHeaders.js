// Security headers for every response of the site.
//
// Static files get them from public/_headers (Cloudflare applies that file to
// static assets only); the responses this Worker makes itself (every page and
// /api/*) get them from withSecurityHeaders() below. Keep the two lists the
// same: tests/securityHeaders.test.js checks.
//
// The page's main Content-Security-Policy (which scripts, styles, fonts and
// servers the app may use) is pageCsp() below. The Worker sends it as a header
// with a new nonce for every page (withPagePolicy), because the script
// Cloudflare's bot check adds to each page changes on every request: Cloudflare
// gives that script the header's nonce, which it can't do for a <meta> policy.
// The build also writes the policy into index.html as a <meta> tag, with the
// hashes of its two inline scripts, for when the page is served some other way
// (npx vite preview); the Worker takes that copy out. For the static files,
// frame-ancestors (no framing by other sites) is sent on its own.

export const SECURITY_HEADERS = {
  // HTTPS only, for a year, on every aflaahqc.com address.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // Files are only ever used as the type they are served as.
  "X-Content-Type-Options": "nosniff",
  // Other sites can't show the portals inside a frame (clickjacking).
  "Content-Security-Policy": "frame-ancestors 'self'",
  "X-Frame-Options": "SAMEORIGIN",
  // Other sites see only "aflaahqc.com" as where a visitor came from, never the page.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The microphone is for Check my Reading on this site only; nothing else is used.
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), payment=(), usb=()",
  // A page on another site that opens the portal can't reach into it.
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

// A copy of `res` with the security headers; API replies are never cached.
export function withSecurityHeaders(res, { api = false } = {}) {
  const out = new Response(res.body, res);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    // A page keeps its full policy from withPagePolicy(), which has frame-ancestors too.
    if (name === "Content-Security-Policy" && out.headers.has(name)) continue;
    out.headers.set(name, value);
  }
  if (api) out.headers.set("Cache-Control", "no-store");
  return out;
}

// The page's Content-Security-Policy (see above). nonce: this response's
// nonce (header only); scriptHashes: the 'sha256-…' sources of index.html's
// inline scripts (the <meta> copy); supabaseUrl: the project's address;
// header: true when sent as a header, which may also forbid framing.
export function pageCsp({ scriptHashes = [], nonce = "", supabaseUrl = "", header = false }) {
  const supabase = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const supabaseWs = supabase.replace(/^http/, "ws");
  const quranApis = ["https://api.qurancdn.com", "https://api.quran.com", "https://verses.quran.com"];
  const directives = {
    "default-src": ["'self'"],
    // The app's own scripts, and Cloudflare's: its bot check (Bot Fight Mode,
    // allowed by the nonce, loads from /cdn-cgi/ on this site) and its Web
    // Analytics visit counter (which reports to /cdn-cgi/rum, also this site).
    "script-src": ["'self'", nonce && `'nonce-${nonce}'`, ...scriptHashes, "https://static.cloudflareinsights.com"],
    // React and the portals put their CSS in <style> tags and style="" attributes.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    // Google Fonts, and the Mushaf page fonts (Thilawa).
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://verses.quran.foundation"],
    // Payment slips (signed Supabase links), photos picked on the phone, canvas pictures.
    "img-src": ["'self'", "data:", "blob:", supabase],
    "media-src": ["'self'", "data:", "blob:"],
    // Supabase (data, sign-in, files, live updates); Quran text and recitation audio.
    "connect-src": ["'self'", supabase, supabaseWs, ...quranApis],
    // PDF payment slips are shown in a frame.
    "frame-src": ["'self'", "blob:", supabase],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };
  return [
    ...Object.entries(directives).map(([name, sources]) => `${name} ${sources.filter(Boolean).join(" ")}`),
    // Other sites can't show the page in a frame (only works in a header).
    ...(header ? ["frame-ancestors 'self'"] : []),
    "upgrade-insecure-requests",
  ].join("; ");
}

// A page (HTML) from the static files, with its policy as a header and a new
// nonce on each of its <script> tags. Other responses are returned as they are.
export function withPagePolicy(res, { supabaseUrl = "" } = {}) {
  if (!(res.headers.get("Content-Type") || "").includes("text/html")) return res;
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const page = new HTMLRewriter()
    .on('meta[http-equiv="Content-Security-Policy"]', { element: (el) => el.remove() })
    .on("script", { element: (el) => el.setAttribute("nonce", nonce) })
    .transform(res);
  const out = new Response(page.body, page);
  out.headers.set("Content-Security-Policy", pageCsp({ nonce, supabaseUrl, header: true }));
  // Every copy of the page has its own nonce, so the browser always fetches
  // it whole (no "not modified" for an old copy under a new header), and
  // shared caches don't hand one copy to many people.
  out.headers.delete("ETag");
  out.headers.delete("Last-Modified");
  out.headers.set("Cache-Control", "private, no-cache");
  return out;
}
