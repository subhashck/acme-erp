import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
const state = vi.hoisted(() => ({
  identity: { id: 'erp-user', name: 'ERP User', email: 'user@example.test', role: 'user', banned: false } as any,
  selects: vi.fn(),
}));
vi.mock('../../server/db/client.ts', () => ({ db: {
  select: (...args: unknown[]) => {
    state.selects(...args);
    return { from: () => ({ where: () => ({
      limit: async () => state.identity ? [state.identity] : [],
      orderBy: () => ({ limit: async () => [state.identity] }),
    }) }) };
  },
} }));
import { magazineIntegrationRoutes } from '../../server/routes/magazine-integration.ts';
const secret = 'local-test-magazine-bridge-secret-32-characters';
const app = new Hono().use('*', async (c, next) => {
  if (c.req.header('x-fixture-session')) (c as any).set('session', { user: { id: 'erp-user', role: 'admin', banned: false } });
  await next();
}).route('/', magazineIntegrationRoutes);
const request = (path = 'session', headers: Record<string, string> = {}) => app.request(`/integrations/magazine/${path}`, {
  headers: { 'x-fixture-session': 'valid', 'x-magazine-service-key': secret, ...headers },
});
beforeEach(() => {
  vi.stubEnv('MAGAZINE_BRIDGE_SECRET', secret); vi.clearAllMocks();
  state.identity = { id: 'erp-user', name: 'ERP User', email: 'user@example.test', role: 'user', banned: false };
});
afterEach(() => vi.unstubAllEnvs());
describe('ERP Magazine identity endpoints', () => {
  it('reports missing bridge configuration as a service error', async () => {
    vi.stubEnv('MAGAZINE_BRIDGE_SECRET', '');
    expect((await request()).status).toBe(503);
    expect(state.selects).not.toHaveBeenCalled();
  });
  it('requires the service key even with an ERP session', async () => {
    expect((await request('session', { 'x-magazine-service-key': 'forged' })).status).toBe(403);
    expect(state.selects).not.toHaveBeenCalled();
  });
  it('requires an ERP session even with the service key', async () => {
    expect((await request('session', { 'x-fixture-session': '' })).status).toBe(401);
  });
  it('returns only minimal current identity and does not trust a cached admin role', async () => {
    const response = await request();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ id: 'erp-user', name: 'ERP User', email: 'user@example.test', role: 'user' });
    expect((await request('users')).status).toBe(403);
  });
  it('rejects banned or deleted users immediately', async () => {
    state.identity.banned = true;
    expect((await request()).status).toBe(401);
    state.identity = null;
    expect((await request()).status).toBe(401);
  });
  it('permits current admins to search the bounded identity directory', async () => {
    state.identity.role = 'admin';
    expect((await request('users?search=ERP')).status).toBe(200);
  });
});
