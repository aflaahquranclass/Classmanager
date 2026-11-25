import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { SECURITY_HEADERS, withSecurityHeaders, withPagePolicy, pageCsp } from "../worker/securityHeaders.js";

// The "/*" block of public/_headers, as { name: value }.
function staticHeaders() {
  const text = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
  const block = text.split(/\n(?=\S)/).find((b) => b.startsWith("/*\n"));
  return Object.fromEntries(block.split("\n").slice(1).filter((l) => /^\s+\S/.test(l))
    .map((l) => l.trim().split(/:\s*(.*)/s).slice(0, 2)));
}

test("static files and the Worker's own pages send the same security headers", () => {
  assert.deepEqual(staticHeaders(), SECURITY_HEADERS);
});

test("withSecurityHeaders adds every header, and no-store on API replies", () => {
  const page = withSecurityHeaders(new Response("<p>hi</p>", { headers: { "Content-Type": "text/html" } }));
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(page.headers.get(name), value);
  assert.equal(page.headers.get("Content-Type"), "text/html");
  assert.equal(page.headers.get("Cache-Control"), null);
  const api = withSecurityHeaders(Response.json({ ok: true }), { api: true });
  assert.equal(api.headers.get("Cache-Control"), "no-store");
  // Works on redirects too, whose headers can't be changed in place.
  const moved = withSecurityHeaders(Response.redirect("https://teachers.aflaahqc.com/", 301));
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get("Location"), "https://teachers.aflaahqc.com/");
  assert.equal(moved.headers.get("X-Frame-Options"), "SAMEORIGIN");
  // A page's own full policy (withPagePolicy) isn't replaced by the frame-only one.
  const full = "default-src 'self'; frame-ancestors 'self'";
  const page2 = withSecurityHeaders(new Response("", { headers: { "Content-Security-Policy": full } }));
  assert.equal(page2.headers.get("Content-Security-Policy"), full);
});

test("withPagePolicy leaves anything but pages as it is", () => {
  const res = Response.json({ ok: true });
  assert.equal(withPagePolicy(res), res);
});

// Files in public/ must skip the Worker, or the rules for them in _headers
// (no-cache for sw.js, the manifests' type) would stop applying.
test("every file in public/ is served straight from the static files", () => {
  const config = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, "");
  const patterns = JSON.parse(config).assets.run_worker_first;
  assert.ok(patterns.includes("/*"), "pages run the Worker first");
  assert.ok(patterns.includes("!/assets/*"), "the build's scripts skip it");
  const publicDir = new URL("../public/", import.meta.url);
  for (const name of readdirSync(publicDir).filter((n) => n !== "_headers" && !n.startsWith("."))) {
    const pattern = statSync(new URL(name, publicDir)).isDirectory() ? `!/${name}/*` : `!/${name}`;
    assert.ok(patterns.includes(pattern), `${pattern} in run_worker_first`);
  }
});

test("the page policy allows only the app's own scripts and the listed servers", () => {
  const csp = pageCsp({ scriptHashes: ["'sha256-abc'"], supabaseUrl: "https://example.supabase.co/" });
  const dir = Object.fromEntries(csp.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));
  assert.deepEqual(dir["script-src"], ["'self'", "'sha256-abc'", "https://static.cloudflareinsights.com"]);
  assert.ok(!csp.includes("'unsafe-eval'") && !csp.includes("'unsafe-inline' 'sha"));
  assert.ok(!("frame-ancestors" in dir), "a <meta> policy can't stop framing");
  assert.deepEqual(dir["object-src"], ["'none'"]);
  assert.ok(dir["connect-src"].includes("https://example.supabase.co"));
  assert.ok(dir["connect-src"].includes("wss://example.supabase.co"));
  assert.ok("upgrade-insecure-requests" in dir);
  // As the Worker's header: this page's nonce (Cloudflare's bot check gets it too), and no framing.
  const header = pageCsp({ nonce: "n0nce", supabaseUrl: "https://example.supabase.co", header: true });
  const hdir = Object.fromEntries(header.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));
  assert.deepEqual(hdir["script-src"], ["'self'", "'nonce-n0nce'", "https://static.cloudflareinsights.com"]);
  assert.deepEqual(hdir["frame-ancestors"], ["'self'"]);
});

// After `npm run build`: every inline script of the built page is allowed by
// its hash, so the loading screen and portal setup still run.
test("built index.html: the policy is first in <head> and covers its inline scripts", { skip: !existsSync(new URL("../dist/index.html", import.meta.url)) }, () => {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const meta = html.match(/<head>\s*<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(meta, "the policy is the first tag in <head>");
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, code]) => code);
  assert.ok(inline.length >= 2);
  for (const code of inline) {
    const hash = `'sha256-${createHash("sha256").update(code, "utf8").digest("base64")}'`;
    assert.ok(meta[1].includes(hash), "inline script allowed");
  }
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*\bon\w+=/.test(html), "no inline event handlers");
});
