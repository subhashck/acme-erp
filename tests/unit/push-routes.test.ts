import { beforeEach, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { PgDialect } from 'drizzle-orm/pg-core';
const { database, insertValues, where, configured } = vi.hoisted(() => {
  const where = vi.fn().mockResolvedValue([]);
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const database: any = {
    delete: vi.fn(() => ({ where })),
    insert: vi.fn(() => ({ values: insertValues })),
    select: vi.fn(() => ({ from: () => ({ where }) })),
  };
  database.transaction = vi.fn((callback: any) => callback(database));
  return { database, insertValues, where, configured: vi.fn() };
});
vi.mock('../../server/db/client.ts', () => ({ db: database }));
vi.mock('../../server/auth.ts', () => ({ trustedOrigins: ['https://erp.test'] }));
vi.mock('../../server/services/push.ts', () => ({ pushConfig: configured }));
import { pushRoutes } from '../../server/routes/push.ts';

const app = new Hono<any>();
app.use('*', async (c, next) => { c.set('session', { id: 'current-session', user: { id: 'current-user' } }); await next(); });
app.route('/api', pushRoutes);
const body = { endpoint: 'https://fcm.googleapis.com/example',
  keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) }, userId: 'forged-user', sessionId: 'forged-session' };
beforeEach(() => { vi.clearAllMocks(); configured.mockReturnValue({ publicKey: 'public-only' }); });

it('rejects cross-origin device registration before database access', async () => {
  const response = await app.request('/api/notifications/push/subscription', { method: 'POST',
    headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  expect(response.status).toBe(403);
  expect(database.transaction).not.toHaveBeenCalled();
});

it('binds registrations to the authenticated user and session', async () => {
  const response = await app.request('/api/notifications/push/subscription', { method: 'POST',
    headers: { Origin: 'https://erp.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  expect(response.status).toBe(200);
  expect(insertValues).toHaveBeenCalledWith({ endpoint: body.endpoint, p256dh: body.keys.p256dh,
    auth: body.keys.auth, userId: 'current-user', sessionId: 'current-session' });
});

it('scopes device removal to its owner and login', async () => {
  const response = await app.request('/api/notifications/push/subscription', { method: 'DELETE',
    headers: { Origin: 'https://erp.test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  expect(response.status).toBe(200);
  const condition = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
  expect(condition.params).toEqual([body.endpoint, 'current-user', 'current-session']);
});

it('exposes only the public application key', async () => {
  configured.mockReturnValue({ publicKey: 'public', privateKey: 'private', subject: 'mailto:test@example.com' });
  const response = await app.request('/api/notifications/push/config');
  expect(await response.json()).toEqual({ enabled: true, publicKey: 'public' });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
