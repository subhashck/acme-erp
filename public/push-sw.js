/* Imported by the generated Workbox worker; caching/update behavior stays in Workbox. */
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data?.json() ?? {}; } catch { /* Show a generic alert. */ }
    let url = '/';
    try {
      const target = new URL(payload.url || '/', self.location.origin);
      if (target.origin === self.location.origin && !/^\/(api|login|magazine)(\/|$)/.test(target.pathname)) {
        url = target.pathname + target.search + target.hash;
      }
    } catch { /* Use the dashboard. */ }
    await self.registration.showNotification('ACME ERP', {
      body: 'You have a new notification. Open ERP to view it.',
      icon: '/icons/pwa-192.png',
      tag: typeof payload.tag === 'string' ? payload.tag : 'erp-notification',
      data: { url },
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || '/', self.location.origin);
    if (target.origin !== self.location.origin) return;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Reuse the matching page; leave unsaved forms on other pages intact.
    const existing = windows.find(client => client.url === target.href);
    if (existing) await existing.focus();
    else await self.clients.openWindow(target.href);
  })());
});
