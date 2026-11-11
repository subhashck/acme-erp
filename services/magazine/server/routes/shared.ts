import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AuthEnv } from '../auth.ts';

export const requireAdmin: MiddlewareHandler<AuthEnv> = async (c, next) => {
  if (c.get('session')?.user.role !== 'admin') throw new HTTPException(403, { message: 'Admin access required' });
  await next();
};
export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const jsonBody = async <T extends z.ZodTypeAny>(c: any, schema: T): Promise<z.infer<T>> => schema.parse(await c.req.json());
