/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Fivefold",
        short_name: "Fivefold",
        description:
          "A forgiving, endless five-letter word game played in ten-word stages.",
        // The manifest can't follow prefers-color-scheme, so match dark mode's
        // --bg: a dark splash on a light launch beats a white flash on a dark one.
        theme_color: "#14161c",
        background_color: "#14161c",
        display: "standalone",
        // Relative so one manifest works at the Netlify root and under /fivefold/.
        start_url: ".",
        scope: ".",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      // The glob below already sweeps in the manifest icons.
      includeManifestIcons: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        // No client-side routes, so precache's directory-index match covers
        // navigation; the default fallback would let the Netlify root's SW
        // answer /fivefold/ navigations with the root build's index.html.
        navigateFallback: null,
        // Workbox's defaults plus ?stage=, so shared links still hit the
        // precached index.html offline.
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^stage$/],
      },
    }),
  ],
  server: {
    port: 3170,
  },
  test: {
    environment: "happy-dom",
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
      reporter: ["text", "html"],
    },
  },
});
