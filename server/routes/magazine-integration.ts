import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { and, eq, ilike, isNull, or } from 'drizzle-orm';
import type { AuthEnv } from '../auth.ts';
import { db } from '../db/client.ts';
import { user } from '../db/schema.ts';

/** Identity-only bridge. Magazine has no access to ERP database credentials. */
export function isMagazineServiceKeyValid(provided: string | undefined, secret = process.env.MAGAZINE_BRIDGE_SECRET): boolean {
  if (!secret || secret.length < 32 || !provided) return false;
  const expected = Buffer.from(secret);
  const actual = Buffer.from(provided);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const magazineIntegrationRoutes = new Hono<AuthEnv>()
  .use('/integrations/magazine/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (!process.env.MAGAZINE_BRIDGE_SECRET || process.env.MAGAZINE_BRIDGE_SECRET.length < 32) {
      return c.json({ error: 'Magazine identity bridge is not configured; restart ERP after setting MAGAZINE_BRIDGE_SECRET' }, 503);
    }
    if (!isMagazineServiceKeyValid(c.req.header('x-magazine-service-key'))) {
      return c.json({ error: 'Magazine service credentials required' }, 403);
    }
    const session = c.get('session');
    if (!session?.user || session.user.banned) return c.json({ error: 'Unauthorized' }, 401);
    // Read current identity rather than trusting a cached role in a session cookie.
    const [identity] = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned })
      .from(user).where(eq(user.id, session.user.id)).limit(1);
    if (!identity || identity.banned) return c.json({ error: 'Unauthorized' }, 401);
    c.set('session', { ...session, user: { ...session.user, ...identity } });
    await next();
  })
  .get('/integrations/magazine/session', (c) => {
    const { id, name, email, role } = c.get('session').user;
    return c.json({ id, name, email, role: role || 'user' });
  })
  .get('/integrations/magazine/users', async (c) => {
    if (c.get('session').user.role !== 'admin') return c.json({ error: 'Admin access required' }, 403);
    const search = (c.req.query('search') || '').trim().slice(0, 100);
    const identities = await db.select({ id: user.id, name: user.name, email: user.email, role: user.role })
      .from(user).where(and(or(eq(user.banned, false), isNull(user.banned)),
        search ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)) : undefined))
      .orderBy(user.name, user.id).limit(500);
    return c.json(identities.map(identity => ({ ...identity, role: identity.role || 'user' })));
  });
