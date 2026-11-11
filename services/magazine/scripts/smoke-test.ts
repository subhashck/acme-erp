import { loadEnvFile } from 'node:process';
import assert from 'node:assert/strict';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import sharp from 'sharp';

// An explicit integration check for an EMPTY local Magazine database only.
// Uses a loopback ERP identity fixture; no ERP users or sessions are changed.
loadEnvFile('.env');
process.env.NODE_ENV = 'test';
const { pool } = await import('../server/db/client.ts');
const initial = await pool.query('SELECT (SELECT count(*) FROM magazine.magazine_issues) + (SELECT count(*) FROM magazine.magazine_media) + (SELECT count(*) FROM magazine.identities) + (SELECT count(*) FROM magazine.issue_sequences) AS count');
assert.equal(Number(initial.rows[0].count), 0, 'Smoke test requires an empty Magazine database');
let identity = { id: 'smoke-admin', name: 'Smoke Admin', email: 'smoke-admin@example.test', role: 'admin' };
const editor = { id: 'smoke-editor', name: 'Smoke Editor', email: 'smoke-editor@example.test', role: 'hr' };
const bridge = new Hono().get('/api/integrations/magazine/:action', c => {
  if (c.req.header('x-magazine-service-key') !== process.env.MAGAZINE_BRIDGE_SECRET || c.req.header('cookie') !== 'smoke-session=valid') return c.json({}, 401);
  return c.json(c.req.param('action') === 'users' ? [editor] : identity);
});
const server = serve({ fetch: bridge.fetch, port: 0, hostname: '127.0.0.1' });
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
assert(address && typeof address !== 'string');
process.env.ERP_INTERNAL_URL = `http://127.0.0.1:${address.port}`;
const { app } = await import('../server/index.ts');
const { minioClient, MINIO_BUCKET } = await import('../server/utils/minio.ts');
const oldSettings = (await pool.query('SELECT settings FROM magazine.branding WHERE id = 1')).rows[0].settings;
const keys: string[] = [];
const request = async (path: string, method = 'GET', body?: unknown, expected = 200) => {
  const headers: Record<string, string> = { cookie: 'smoke-session=valid', origin: process.env.PUBLIC_ORIGIN! };
  if (body && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const response = await app.request(path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  if (response.status !== expected) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${await response.text()}`);
  return response;
};
try {
  await request('/ready');
  await request('/magazine-api/magazine/users');
  const editorRecord = await (await request('/magazine-api/magazine/editors', 'POST', { userId: editor.id }, 201)).json();
  const issue = await (await request('/magazine-api/magazine/issues', 'POST', {
    title: 'Extraction smoke test', slug: 'extraction-smoke-test', issueMonth: 10, issueYear: 2099,
  }, 201)).json();
  assert.match(issue.issueNo, /^MAG\/\d{2}-\d{2}\/00001$/);
  await request('/magazine/view/extraction-smoke-test', 'GET', undefined, 404);
  const buffer = await sharp({ create: { width: 400, height: 300, channels: 3, background: '#0d9488' } }).png().toBuffer();
  const upload = () => { const form = new FormData(); form.append('file', new File([new Uint8Array(buffer)], 'smoke.png', { type: 'image/png' })); form.append('issueId', String(issue.id)); return form; };
  const media = await (await request('/magazine-api/magazine/upload-image', 'POST', upload())).json();
  keys.push(media.objectKey, media.thumbnailKey);
  const duplicate = await (await request('/magazine-api/magazine/upload-image', 'POST', upload())).json();
  assert.equal(duplicate.id, media.id); assert.equal(duplicate.isDuplicate, true);
  await request(media.url);
  await request(`/magazine-api/magazine/issues/${issue.id}/sections`, 'POST', {
    title: 'Article', contentHtml: `<p>Standalone publication</p><img src="${media.url}">`,
  }, 201);
  await request(`/magazine-api/magazine/media/${media.id}`, 'DELETE', undefined, 409);
  await request(`/magazine-api/magazine/issues/${issue.id}/publish`, 'POST');
  const reader = await request('/magazine/view/extraction-smoke-test');
  assert.match(await reader.text(), /Standalone publication/);
  await request('/magazine/view/extraction-smoke-test/gallery');
  const catalog = await (await request('/magazine-api/public/magazine')).json();
  assert.equal(catalog.length, 1);
  identity = editor;
  await request('/magazine-api/magazine/settings');
  await request('/magazine-api/magazine/users', 'GET', undefined, 403);
  identity = { id: 'smoke-admin', name: 'Smoke Admin', email: 'smoke-admin@example.test', role: 'admin' };
  await request(`/magazine-api/magazine/editors/${editorRecord.id}`, 'PATCH', { active: false });
  identity = editor;
  await request('/magazine-api/magazine/settings', 'GET', undefined, 403);
  // Public readers use no ERP identity call, even when the identity server stops.
  await new Promise<void>(resolve => server.close(() => resolve()));
  await request('/magazine/view/extraction-smoke-test');
  console.log('Live smoke passed: numbering, upload/dedup, sections, publish, reader/gallery, editor revocation and ERP-offline reading.');
} finally {
  for (const key of keys.filter(Boolean)) await minioClient.removeObject(MINIO_BUCKET, key);
  await pool.query('TRUNCATE magazine.magazine_issues, magazine.magazine_sections, magazine.magazine_media, magazine.magazine_issue_media, magazine.magazine_editors, magazine.identities, magazine.issue_sequences RESTART IDENTITY');
  await pool.query('UPDATE magazine.branding SET settings = $1::jsonb WHERE id = 1', [JSON.stringify(oldSettings)]);
  server.close();
  await pool.end();
}
