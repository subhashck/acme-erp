# ACME ERP PWA

The production ERP build includes a web app manifest, home screen icons and a service worker. Run `pnpm build` and serve `dist` through the existing Hono server or the production reverse proxy. PWA registration is disabled in Vite development to keep hot reload reliable.

## Installation

- Serve the app over HTTPS. `localhost` also works for testing; plain HTTP on a LAN IP does not support service workers.
- On Chrome/Edge and supported Android browsers, open the ERP and use **Install app** in the header once the browser offers installation, or use the browser's install menu.
- On iPhone/iPad, open the ERP in Safari, tap **Share → Add to Home Screen**, and confirm. The header install button shows these instructions.
- Installed apps launch at `/` with the existing sign-in and permission checks.

## Offline and updates

Only packaged HTML, JavaScript, CSS, fonts and icons are precached. API responses, files fetched from APIs and external services are not cached by the service worker. `/api`, `/magazine` and `/magazine-api` are excluded from its SPA navigation fallback. The standalone Magazine service is separate.

When the browser reports that it is offline, a connection screen blocks interaction and preserves the mounted page, including unsaved form state, until connectivity returns. A fresh offline launch can display this screen after a previous successful online visit. Hospital records, login and transactions still require the server; there is no offline transaction queue.

New deployments show **App update available**. Save work before choosing **Reload and update**. **Dismiss** lets you continue the current session. The app checks for updates when brought back to the foreground. Hono sends `Cache-Control: no-cache` for the service worker, manifest and root HTML; reverse proxies should retain revalidation for these files and route application URLs to the SPA. Keep the service worker at `/sw.js` with a JavaScript content type.

## Verification

1. Build, serve the production app over HTTPS or localhost and visit it online.
2. In browser DevTools, check Application → Manifest and Service Workers. Verify the icons and a worker controlling the page.
3. Install, launch, sign in and check a deep link.
4. Switch DevTools to offline and reload. Verify the connection screen and that API responses are absent from Cache Storage. Reconnect and confirm normal operation.
5. Make a second build while the app remains open; return to the app and verify the update prompt. Dismiss it with a form in progress, then save and update.
6. Confirm Magazine URLs and API requests continue to use the network.

Icon source: `public/icons/acme-source.png`, the [original website favicon](https://acmefertilitycentre.com/wp-content/uploads/2024/10/A.png) from ACME Fertility Centre. Regenerate square PNG variants with `node scripts/generate-pwa-icons.mjs` after changing it. The maskable variant keeps the symbol inside the safe zone on a white background.

Sidebar branding uses `public/icons/acme-sidebar.webp` and its collapsed symbol variant `acme-sidebar-symbol.webp`, converted from the supplied `ACME Logo (1).png`. Both preserve transparency. The sidebar version omits the last tagline line and displays at a maximum width of 192px. The complete supplied logo is also available as `public/icons/acme-logo.webp`. These WebP files are precached for offline launches.

PWA build/update integration follows the [Vite PWA React documentation](https://vite-pwa-org.netlify.app/frameworks/react) and [prompt-for-update guide](https://vite-pwa-org.netlify.app/guide/prompt-for-update).
