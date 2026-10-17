import '../config.ts';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as magazine from './schema-magazine.ts';
import * as identities from './schema.ts';
import { required } from '../config.ts';

export const pool = new Pool({ connectionString: required('DATABASE_URL'), max: 5, connectionTimeoutMillis: 5000 });
export const db = drizzle(pool, { schema: { ...magazine, ...identities } });
