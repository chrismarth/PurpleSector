import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { resolve } from "path";

const monorepoRoot = resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  root: __dirname,

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@purplesector/plugin-api": resolve(monorepoRoot, "packages/plugin-api/src"),
      "@purplesector/plugin-agent": resolve(monorepoRoot, "packages/plugin-agent/src"),
      "@purplesector/web-telemetry": resolve(monorepoRoot, "packages/web-telemetry/src"),
      "@purplesector/web-charts": resolve(monorepoRoot, "packages/web-charts/src"),
      "@purplesector/plugin-core-lap-telemetry": resolve(
        monorepoRoot,
        "packages/plugin-core-lap-telemetry/src",
      ),
      "@purplesector/plugin-vehicles": resolve(
        monorepoRoot,
        "packages/plugin-vehicles/src",
      ),
    },
  },

  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: resolve(monorepoRoot, "tailwind.config.ts") }),
        autoprefixer(),
      ],
    },
  },

  build: {
    manifest: true,
    outDir: resolve(__dirname, "dist"),
    rollupOptions: {
      input: {
        // Main app entry
        main: resolve(__dirname, "src/inertia.tsx"),
        // Plugin entries — each builds to dist/plugins/<id>/index.js
        // The path here must match the `entry` field in each plugin's Django manifest.
        "plugins/agent/index": resolve(monorepoRoot, "packages/plugin-agent/src/index.ts"),
        "plugins/vehicles/index": resolve(monorepoRoot, "packages/plugin-vehicles/src/index.ts"),
        "plugins/core-lap-telemetry/index": resolve(
          monorepoRoot,
          "packages/plugin-core-lap-telemetry/src/index.ts",
        ),
      },
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/login": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
