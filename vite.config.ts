import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
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
    tailwindcss()
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
      },
      "/magazine/ssr": {
        target: "http://localhost:8787",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
      },
      "/magazine/view": {
        target: "http://localhost:8787",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
      }
    }
  }
});
