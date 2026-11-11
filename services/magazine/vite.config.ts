import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const erpOrigin = new URL(env.PUBLIC_ORIGIN || 'http://localhost:5173').origin;
  return {
  base: '/magazine/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [{
    name: 'erp-login-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (new URL(req.url || '/', erpOrigin).pathname !== '/login') return next();
        res.writeHead(302, { Location: new URL('/login?redirect=%2Fmagazine%2Fadmin', erpOrigin).href });
        res.end();
      });
    },
  }, tanstackRouter({ target: 'react', routesDirectory: './src/routes', generatedRouteTree: './src/routeTree.gen.ts' }), react(), tailwindcss()],
  server: { port: 5175, proxy: {
    '/magazine-api': 'http://localhost:8790',
    '/magazine/view': 'http://localhost:8790',
    '^/magazine$': 'http://localhost:8790',
    '/api': 'http://localhost:8787',
  } },
};
});
