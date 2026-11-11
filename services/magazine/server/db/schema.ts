import { text } from 'drizzle-orm/pg-core';
import { pgSchema } from 'drizzle-orm/pg-core';

// Local display/audit projections. These contain no ERP passwords or sessions.
export const user = pgSchema('magazine').table('identities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull().default('user'),
});
