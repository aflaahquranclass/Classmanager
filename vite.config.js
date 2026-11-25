import { createHash } from "node:crypto";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { pageCsp } from "./worker/securityHeaders.js";

// Writes the page's Content-Security-Policy into the built index.html, as the
// first tag in <head>: only the app's own scripts and index.html's two inline
// scripts (allowed by their hashes, worked out here from the final page) may
// run, and the app may only talk to the servers listed in pageCsp(). On the
// live site the Worker swaps this copy for a header with a nonce
// (worker/securityHeaders.js). Not used by `npm run dev`, whose live reload
// needs more.
function contentSecurityPolicy(supabaseUrl) {
  return {
    name: "aqc-content-security-policy",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const scriptHashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
          .map(([, code]) => `'sha256-${createHash("sha256").update(code, "utf8").digest("base64")}'`);
        const csp = pageCsp({ scriptHashes, supabaseUrl });
        return html.replace(/<head>/, `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), contentSecurityPolicy(env.VITE_SUPABASE_URL)],
    build: {
      rollupOptions: {
        output: {
          // React and Supabase change far less often than the app's own code, so
          // they get files of their own: after an app update, phones keep the
          // copy they already have and only download the app code again.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
            if (id.includes("node_modules/@supabase/")) return "supabase";
            // One file for all icons, instead of a tiny download per icon.
            if (id.includes("node_modules/lucide-react/")) return "icons";
          },
        },
      },
    },
  };
});
