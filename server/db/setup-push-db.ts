import { pathToFileURL } from 'node:url';
import { pool } from './client.ts';

export async function setupPushDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id);
    CREATE TABLE IF NOT EXISTS push_deliveries (
      id SERIAL PRIMARY KEY,
      notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      subscription_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP,
      UNIQUE(notification_id, subscription_id)
    );
    CREATE INDEX IF NOT EXISTS push_deliveries_due_idx ON push_deliveries(next_attempt_at)
      WHERE finished_at IS NULL;
  `);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  setupPushDb().then(() => pool.end()).catch(error => {
    console.error('Push database setup failed', error); process.exitCode = 1; void pool.end();
  });
}
