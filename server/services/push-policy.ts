import { z } from 'zod';

// Never allow a user-supplied subscription to turn the sender into an HTTP proxy.
export function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      !url.hash && ['fcm.googleapis.com', 'updates.push.services.mozilla.com',
        'web.push.apple.com'].includes(url.hostname);
  } catch { return false; }
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(2048).refine(isPushEndpoint, 'Unsupported push service'),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}=?$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}={0,2}$/),
  }),
});

export function safeNotificationLink(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return '/';
  const url = new URL(value, 'https://erp.invalid');
  return url.origin === 'https://erp.invalid' && !/^\/(api|login|magazine)(\/|$)/.test(url.pathname)
    ? url.pathname + url.search + url.hash : '/';
}

export function retryPush(status: number | undefined, attempts: number) {
  return attempts < 5 && (!status || status === 429 || status >= 500);
}
