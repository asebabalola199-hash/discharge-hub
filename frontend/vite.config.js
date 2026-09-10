import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: Vite serves the app on :5173 and proxies /api to the Express API on
// :3001. Build: output goes into backend/public so the API can serve it as
// a single deployable service.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.API_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../backend/public",
    emptyOutDir: true,
  },
});
