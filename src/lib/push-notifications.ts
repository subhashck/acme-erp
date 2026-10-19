export function supportsPush() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function pushRequest(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/notifications/push/${path}`, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error('Unable to update notifications. Please sign in and try again.');
  return response.json();
}

async function registration() {
  const worker = await navigator.serviceWorker.getRegistration('/');
  if (!worker?.active) throw new Error('Install or update the ERP app, then reopen it to enable notifications.');
  return worker;
}

export async function getPushStatus() {
  const config = await pushRequest('config') as { enabled: boolean; publicKey: string | null };
  if (!supportsPush() || !config.enabled) return { configured: config.enabled, enabled: false };
  const worker = await navigator.serviceWorker.getRegistration('/');
  const subscription = await worker?.pushManager.getSubscription();
  const status = subscription ? await pushRequest(`status?endpoint=${encodeURIComponent(subscription.endpoint)}`) : null;
  return { configured: config.enabled, enabled: !!status?.enabled };
}

export async function enablePush() {
  // Keep the permission request directly in the user's click gesture.
  if (!supportsPush()) throw new Error('Push notifications require HTTPS and a supported browser.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser or Android app settings.');
  const config = await pushRequest('config') as { enabled: boolean; publicKey: string | null };
  if (!config.enabled || !config.publicKey) throw new Error('Push notifications are not configured on this server yet.');
  const worker = await registration();
  const binary = atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/'));
  const key = Uint8Array.from(binary, char => char.charCodeAt(0));
  const subscription = await worker.pushManager.getSubscription() ??
    await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await pushRequest('subscription', 'POST', subscription.toJSON());
}

export async function disablePush() {
  if (!supportsPush()) return;
  const worker = await navigator.serviceWorker.getRegistration('/');
  const subscription = await worker?.pushManager.getSubscription();
  if (!subscription) return;
  // Remove the server registration before unsubscribing, so failed requests remain retryable.
  await pushRequest('subscription', 'DELETE', { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
  for (const notification of await worker!.getNotifications()) notification.close();
}
