import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
});
