import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { bridgeSecret, required } from './config.ts';
import { db } from './db/client.ts';
import { user } from './db/schema.ts';

export const identitySchema = z.object({ id: z.string().min(1), name: z.string(), email: z.string(), role: z.string() });
export type Identity = z.infer<typeof identitySchema>;
export type AuthEnv = { Variables: { session: { user: Identity } } };

export async function readErpIdentity(c: Context, route = 'session'): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(new URL(`/api/integrations/magazine/${route}`, required('ERP_INTERNAL_URL')), {
      headers: { cookie: c.req.header('cookie') || '', 'x-magazine-service-key': bridgeSecret() },
      signal: AbortSignal.timeout(5000), redirect: 'error',
    });
  } catch {
    throw new HTTPException(503, { message: 'ERP sign-in is temporarily unavailable' });
  }
  if (response.status === 401) throw new HTTPException(401, { message: 'Sign in to ERP to manage Magazine' });
  if (response.status === 403) throw new HTTPException(403, { message: 'ERP identity access denied' });
  if (!response.ok) throw new HTTPException(503, { message: 'ERP identity service unavailable' });
  return response.json();
}

export async function rememberIdentity(identity: Identity) {
  await db.insert(user).values(identity).onConflictDoUpdate({ target: user.id, set: identity });
}
