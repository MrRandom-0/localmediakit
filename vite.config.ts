import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// ffmpeg.wasm needs SharedArrayBuffer, which browsers only expose on
// cross-origin-isolated pages. These two headers provide that isolation for
// `vite dev` and `vite preview`. Production hosts need the same headers —
// see nginx.conf (Docker) and public/_headers (Netlify-style hosts).
const crossOriginIsolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: crossOriginIsolationHeaders },
  preview: { headers: crossOriginIsolationHeaders },
});
