import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@server": path.resolve(__dirname, "./server")
    }
  },
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts"
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icons/*.png", "icons/*.webp"],
      manifest: {
        id: "/",
        name: "ACME Hospital ERP",
        short_name: "ACME ERP",
        description: "ACME Hospital operations, accounts, HR and college management.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f7f9fc",
        theme_color: "#087e96",
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        importScripts: ["/push-sw.js"],
        // Precache only the build output; authenticated API responses stay on the network.
        globPatterns: ["**/*.{js,css,html,woff,woff2}"],
        // The SPA entry bundle currently exceeds Workbox's default 2 MiB limit.
        // Keep the complete app shell available for offline launch.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/magazine(?:-api)?(?:\/|$)/],
        cleanupOutdatedCaches: true,
        runtimeCaching: []
      },
      build: {
        rolldownOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes("node_modules")) return;
              if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf-export";
              if (id.includes("xlsx-js-style")) return "spreadsheet-export";
              if (id.includes("recharts")) return "charts";
            }
          }
        }
      }
    })
  ],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/magazine-api": { target: "http://localhost:8790", changeOrigin: true },
      "/magazine": { target: "http://localhost:5175", changeOrigin: true },
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
      },

    }
  }
});
