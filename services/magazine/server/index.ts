import './config.ts';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { bodyLimit } from 'hono/body-limit';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { identitySchema, readErpIdentity, rememberIdentity, type AuthEnv } from './auth.ts';
import { bridgeSecret, required, publicLinks } from './config.ts';
import { db, pool } from './db/client.ts';
import { magazineEditors } from './db/schema-magazine.ts';
import { publicRoutes } from './routes/public.ts';
import { readerRoutes } from './routes/reader.ts';
import { magazineRoutes } from './routes/magazine.ts';
import { requireAdmin } from './routes/shared.ts';
import { minioClient, MINIO_BUCKET } from './utils/minio.ts';

export const app = new Hono<AuthEnv>();
app.use(trimTrailingSlash());
app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return c.json({ error: error.issues.map(issue => issue.message).join(', ') }, 400);
  console.error('[Magazine]', error);
  return c.json({ error: 'Magazine request failed' }, 500);
});
app.use('*', async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
});
app.get('/health', c => c.json({ ok: true, service: 'magazine' }));
app.get('/ready', async c => {
  await pool.query('SELECT id FROM magazine.branding WHERE id = 1');
  if (!await minioClient.bucketExists(MINIO_BUCKET)) return c.json({ ok: false }, 503);
  return c.json({ ok: true });
});
app.route('/magazine-api', publicRoutes);
app.route('/', readerRoutes);
app.get('/login', c => c.redirect(publicLinks().loginUrl));
app.get('/magazine-api/auth-config', c => {
  c.header('Cache-Control', 'no-store');
  return c.json(publicLinks());
});
app.use('/magazine-api/*', bodyLimit({ maxSize: 16 * 1024 * 1024 }));
app.use('/magazine-api/*', async (c, next) => {
  if (c.req.path.startsWith('/magazine-api/public/')) return next();
  c.header('Cache-Control', 'no-store');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = c.req.header('origin');
    if (!origin || origin !== new URL(required('PUBLIC_ORIGIN')).origin) {
      return c.json({ error: 'Invalid request origin' }, 403);
    }
  }
  const identity = identitySchema.parse(await readErpIdentity(c));
  await rememberIdentity(identity);
  c.set('session', { user: identity });
  await next();
});
app.get('/magazine-api/session', async c => {
  const identity = c.get('session').user;
  const [editor] = await db.select().from(magazineEditors).where(and(eq(magazineEditors.userId, identity.id), eq(magazineEditors.active, true))).limit(1);
  return c.json({ user: identity, isAdmin: identity.role === 'admin', isEditor: identity.role === 'admin' || !!editor });
});
app.get('/magazine-api/magazine/users', requireAdmin, async c => {
  const search = c.req.query('search') || '';
  const identities = z.array(identitySchema).max(500).parse(await readErpIdentity(c, `users?search=${encodeURIComponent(search)}`));
  await Promise.all(identities.map(rememberIdentity));
  return c.json(identities);
});
app.route('/magazine-api', magazineRoutes);
app.get('/magazine', async c => {
  const response = await publicRoutes.request('/public/magazine');
  const issues = await response.json() as Array<{ slug: string; title: string }>;
  const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  return c.html(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>ACME Magazine</title></head><body style="font-family:system-ui;max-width:900px;margin:3rem auto;padding:1rem"><h1>ACME Magazine</h1><p><a href="/magazine/admin">Editorial workspace</a></p>${issues.length ? issues.map(issue => `<p><a href="/magazine/view/${encodeURIComponent(issue.slug)}">${escape(issue.title)}</a></p>`).join('') : '<p>No published issues yet.</p>'}</body></html>`);
});
app.get('/magazine/admin', serveStatic({ root: 'dist', path: 'index.html' }));
app.get('/magazine/admin/*', serveStatic({ root: 'dist', path: 'index.html' }));
app.use('/magazine/assets/*', serveStatic({ root: 'dist', rewriteRequestPath: path => path.replace('/magazine', '') }));
app.notFound(c => c.json({ error: 'Not found' }, 404));

if (process.env.NODE_ENV !== 'test') {
  bridgeSecret();
  required('ERP_INTERNAL_URL');
  required('PUBLIC_ORIGIN');
  serve({ fetch: app.fetch, port: Number(process.env.PORT || 8790), hostname: '0.0.0.0' });
}
