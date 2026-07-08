import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // foliate-js relies on native dynamic imports and import.meta.url assets;
  // pre-bundling would break its vendored pdf.js worker resolution.
  optimizeDeps: {
    exclude: ["foliate-js"],
  },
  build: {
    target: "safari16",
  },

  // Vite options tailored for Tauri development, only applied in `tauri dev`/`tauri build`:
  // don't obscure rust errors, fixed port, ignore src-tauri.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
