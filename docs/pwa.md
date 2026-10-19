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

## Push notifications

Android Chrome supports background push after the user opts in through **Settings → Profile & Security → Device notifications**. Installation alone does not enable notifications. Production builds register the worker; Vite development does not. HTTPS is required except on localhost.

Deployment:

1. Run `pnpm db:setup-push` to add only the push subscription and delivery tables. This command is also included in the existing `db:setup` workflow.
2. Generate a VAPID pair once with `pnpm exec web-push generate-vapid-keys --json`. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` (a contact `mailto:` URL or HTTPS URL) in the server environment. Keep the private key server-side and preserve the pair across deployments. Compose passes these variables to ERP. Local development keys have been generated in the ignored root `.env`; use separate production keys.
3. Build and deploy ERP, restart the API, then accept the installed app's update. Keep `/push-sw.js` served as JavaScript with revalidation alongside `/sw.js`.
4. Sign in on the device and enable notifications in Settings. Confirm the Android/browser notification permission is allowed. Opt-in is per device and login; re-enable after logout or session expiry.

Existing `sendNotification()` events, including leave and roster notifications, insert persistent delivery jobs in the same database transaction as the inbox entry. The API processes up to ten jobs every 15 seconds with crash-recoverable leases and at most five attempts. HTTP 429, server errors and network failures retry with backoff; 404/410 subscriptions are removed. Read or day-old inbox entries, expired sessions and banned users are skipped. Completed jobs are retained for seven days. Delivery is at least once: a crash after provider acceptance can resend; a stable notification tag replaces the previous alert for that inbox entry.

Push text is generic and excludes staff names and notification details. Tapping opens the relevant ERP page, which retains its normal authentication and permissions. A matching page is focused; another page is opened rather than replacing an unsaved form. Logout removes the device subscription and closes displayed alerts when possible; session deletion also cascades registrations and jobs. Already accepted provider messages may still arrive after logout, with generic content only.

Supported provider endpoints are restricted to FCM (Android Chrome), Mozilla and Apple. Adding another browser provider requires extending the endpoint allowlist. Delivery depends on network, browser and Android battery/notification settings; the saved ERP inbox remains authoritative. No Firebase account is required for standards-based Web Push.

Device acceptance check: enable/deny permission, trigger a leave or roster alert, verify foreground and closed-app/locked-screen delivery, tap through while signed in and after session expiry, disable, sign out, and try two devices. Automated tests cover delivery retries, expiry, link validation and worker behavior; real Android delivery still requires this device check.

Implementation references: [Web Push library](https://github.com/web-push-libs/web-push), [Vite PWA Workbox integration](https://vite-pwa-org.netlify.app/workbox/).

## PWA verification

1. Build, serve the production app over HTTPS or localhost and visit it online.
2. In browser DevTools, check Application → Manifest and Service Workers. Verify the icons and a worker controlling the page.
3. Install, launch, sign in and check a deep link.
4. Switch DevTools to offline and reload. Verify the connection screen and that API responses are absent from Cache Storage. Reconnect and confirm normal operation.
5. Make a second build while the app remains open; return to the app and verify the update prompt. Dismiss it with a form in progress, then save and update.
6. Confirm Magazine URLs and API requests continue to use the network.

Icon source: `public/icons/acme-source.png`, the [original website favicon](https://acmefertilitycentre.com/wp-content/uploads/2024/10/A.png) from ACME Fertility Centre. Regenerate square PNG variants with `node scripts/generate-pwa-icons.mjs` after changing it. The maskable variant keeps the symbol inside the safe zone on a white background.

Sidebar branding uses `public/icons/acme-sidebar.webp` and its collapsed symbol variant `acme-sidebar-symbol.webp`, converted from the supplied `ACME Logo (1).png`. Both preserve transparency. The sidebar version omits the last tagline line and displays at a maximum width of 192px. The complete supplied logo is also available as `public/icons/acme-logo.webp`. These WebP files are precached for offline launches.

PWA build/update integration follows the [Vite PWA React documentation](https://vite-pwa-org.netlify.app/frameworks/react) and [prompt-for-update guide](https://vite-pwa-org.netlify.app/guide/prompt-for-update).
