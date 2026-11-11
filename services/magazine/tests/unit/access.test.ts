import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ activeEditor: false, results: [] as any[][], query: vi.fn(), readErp: vi.fn() }));
vi.mock('../../server/db/client.ts', () => ({
  pool: { query: state.query },
  db: {
    select: () => {
      const result = state.results.shift();
      return { from: () => ({ where: () => ({ limit: async () => result ?? (state.activeEditor ? [{ id: 1 }] : []), orderBy: async () => result ?? [] }) }) };
    },
    insert: () => ({ values: () => ({ onConflictDoUpdate: async () => undefined }) }),
  },
}));
vi.mock('../../server/utils/minio.ts', () => ({ minioClient: {}, MINIO_BUCKET: 'test', uploadToMinio: vi.fn(), deleteFromMinio: vi.fn(), getDocumentStream: vi.fn() }));
vi.mock('../../server/auth.ts', async importOriginal => ({ ...await importOriginal<typeof import('../../server/auth.ts')>(), readErpIdentity: state.readErp }));
import { app } from '../../server/index.ts';
import { HTTPException } from 'hono/http-exception';

describe('Editorial access', () => {
  beforeEach(() => {
    vi.clearAllMocks(); state.activeEditor = false; state.results = [];
    state.query.mockResolvedValue({ rows: [{ settings: { name: 'Independent Magazine' } }] });
    state.readErp.mockResolvedValue({ id: 'erp-user', name: 'Editor', email: 'editor@example.test', role: 'user' });
  });
  it('allows current ERP admins without editor membership', async () => {
    state.readErp.mockResolvedValue({ id: 'admin', name: 'Admin', email: 'admin@example.test', role: 'admin' });
    expect((await app.request('/magazine-api/magazine/settings')).status).toBe(200);
  });
  it('allows active Magazine editors', async () => {
    state.activeEditor = true;
    expect((await app.request('/magazine-api/magazine/settings')).status).toBe(200);
  });
  it.each(['user', 'hr', 'magazine_editor'])('rejects %s without active membership', async role => {
    state.readErp.mockResolvedValue({ id: 'user', name: 'User', email: 'user@example.test', role });
    expect((await app.request('/magazine-api/magazine/settings')).status).toBe(403);
  });
  it('rejects expired sessions and browser-forged identity headers', async () => {
    state.readErp.mockRejectedValue(new HTTPException(401));
    const response = await app.request('/magazine-api/magazine/settings', { headers: { 'x-user-id': 'admin', 'x-user-role': 'admin' } });
    expect(response.status).toBe(401);
  });
  it('rejects cross-origin writes before contacting ERP', async () => {
    const response = await app.request('/magazine-api/magazine/issues', { method: 'POST', headers: { origin: 'https://attacker.example' } });
    expect(response.status).toBe(403);
    expect(state.readErp).not.toHaveBeenCalled();
  });
  it('keeps editor administration restricted to admins', async () => {
    state.activeEditor = true;
    expect((await app.request('/magazine-api/magazine/users')).status).toBe(403);
  });
  it('keeps health independent of ERP', async () => {
    state.readErp.mockRejectedValue(new Error('ERP offline'));
    expect((await app.request('/health')).status).toBe(200);
    expect(state.readErp).not.toHaveBeenCalled();
  });
  it('provides the canonical ERP sign-in link without requiring a session', async () => {
    state.readErp.mockRejectedValue(new HTTPException(401));
    const response = await app.request('/magazine-api/auth-config');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      erpUrl: 'http://localhost:5173',
      loginUrl: 'http://localhost:5173/login?redirect=%2Fmagazine%2Fadmin',
    });
    expect(state.readErp).not.toHaveBeenCalled();
  });
  it('redirects a direct service login request to the actual ERP origin', async () => {
    const response = await app.request('/login?redirect=%2Fmagazine%2Fadmin');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost:5173/login?redirect=%2Fmagazine%2Fadmin');
    expect(state.readErp).not.toHaveBeenCalled();
  });
  it('serves a published reader while ERP is offline', async () => {
    state.readErp.mockRejectedValue(new Error('ERP offline'));
    state.results = [[{ id: 1, slug: 'fresh-issue', title: 'Fresh issue', issueNo: 'MAG/26-27/00001',
      issueMonth: 10, issueYear: 2026, status: 'published', createdAt: new Date() }], [], []];
    const response = await app.request('/magazine/view/fresh-issue');
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Fresh issue');
    expect(state.readErp).not.toHaveBeenCalled();
  });
  it('does not render draft issues to public readers', async () => {
    state.results = [[{ id: 1, slug: 'draft-issue', status: 'draft' }]];
    expect((await app.request('/magazine/view/draft-issue')).status).toBe(404);
    expect(state.readErp).not.toHaveBeenCalled();
  });
});
