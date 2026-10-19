import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import type { AuthEnv } from '../auth.ts';
import { trustedOrigins } from '../auth.ts';
import { db } from '../db/client.ts';
import { pushSubscriptions } from '../db/schema.ts';
import { pushConfig } from '../services/push.ts';
import { pushSubscriptionSchema } from '../services/push-policy.ts';

export const pushRoutes = new Hono<AuthEnv>()
  .use('/notifications/push/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (c.req.method !== 'GET' && !trustedOrigins.includes(c.req.header('origin') ?? '')) {
      return c.json({ error: 'Untrusted request origin' }, 403);
    }
    await next();
  })
  .get('/notifications/push/config', c => {
    const config = pushConfig();
    return c.json({ enabled: !!config, publicKey: config?.publicKey ?? null });
  })
  .post('/notifications/push/subscription', async c => {
    if (!pushConfig()) return c.json({ error: 'Push notifications are not configured' }, 503);
    const data = pushSubscriptionSchema.parse(await c.req.json());
    const auth = c.get('session');
    const values = { endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth,
      userId: auth.user.id, sessionId: auth.id };
    // A browser endpoint has one owner. Rebinding drops the previous owner's queued jobs.
    await db.transaction(async tx => {
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint));
      await tx.insert(pushSubscriptions).values(values);
    });
    return c.json({ enabled: true });
  })
  .delete('/notifications/push/subscription', async c => {
    const { endpoint } = z.object({ endpoint: z.string().max(2048) }).parse(await c.req.json());
    const auth = c.get('session');
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint),
      eq(pushSubscriptions.userId, auth.user.id), eq(pushSubscriptions.sessionId, auth.id)));
    return c.json({ enabled: false });
  })
  .get('/notifications/push/status', async c => {
    const endpoint = c.req.query('endpoint') ?? '';
    const auth = c.get('session');
    const [subscription] = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, auth.user.id),
        eq(pushSubscriptions.sessionId, auth.id)));
    return c.json({ enabled: !!subscription });
  });
