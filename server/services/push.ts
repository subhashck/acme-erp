import webpush from 'web-push';
import { createECDH } from 'node:crypto';
import { pool } from '../db/client.ts';
import { isPushEndpoint, retryPush, safeNotificationLink } from './push-policy.ts';

export function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  try {
    const key = createECDH('prime256v1');
    key.setPrivateKey(Buffer.from(privateKey, 'base64url'));
    if (key.getPublicKey().toString('base64url') !== publicKey) return null;
  }
  catch { return null; }
  if (!/^(mailto:|https:\/\/)/.test(subject)) return null;
  return { publicKey, privateKey, subject };
}

// Leases survive crashes, and SKIP LOCKED supports multiple API instances.
export async function deliverPushBatch() {
  const vapidDetails = pushConfig();
  if (!vapidDetails) return;
  const { rows } = await pool.query(`
    UPDATE push_deliveries SET attempts = attempts + 1, next_attempt_at = NOW() + INTERVAL '5 minutes'
    WHERE id IN (
      SELECT id FROM push_deliveries WHERE finished_at IS NULL AND next_attempt_at <= NOW()
      ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED
    ) RETURNING id, notification_id, subscription_id, attempts
  `);
  await Promise.all(rows.map(async job => {
    try {
      const { rows: subscriptions } = await pool.query(`
        SELECT p.*, n.link FROM push_subscriptions p
        JOIN session s ON s.id = p.session_id AND s."expiresAt" > NOW()
        JOIN "user" u ON u.id = p.user_id AND COALESCE(u.banned, false) = false
        JOIN notifications n ON n.id = $2 AND n.user_id = p.user_id
        WHERE p.id = $1 AND n.read = false AND n.created_at > NOW() - INTERVAL '1 day'
      `, [job.subscription_id, job.notification_id]);
      const subscription = subscriptions[0];
      if (subscription && isPushEndpoint(subscription.endpoint) && job.attempts <= 5) {
        await webpush.sendNotification({ endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({
          title: 'ACME ERP', body: 'You have a new notification. Open ERP to view it.',
          tag: `erp-${job.notification_id}`, url: safeNotificationLink(subscription.link),
        }), { vapidDetails, TTL: 3600, timeout: 10000 });
      }
      await pool.query('UPDATE push_deliveries SET finished_at = NOW() WHERE id = $1', [job.id]);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [job.subscription_id]);
      } else if (retryPush(status, job.attempts)) {
        await pool.query("UPDATE push_deliveries SET next_attempt_at = NOW() + ($2 * INTERVAL '1 minute') WHERE id = $1",
          [job.id, Math.min(60, 2 ** job.attempts)]);
      } else {
        await pool.query('UPDATE push_deliveries SET finished_at = NOW() WHERE id = $1', [job.id]);
      }
      // Do not log subscription endpoints, keys, or notification content.
      console.warn('[Push] Delivery failed', { jobId: job.id, status: status ?? 'network' });
    }
  }));
  await pool.query("DELETE FROM push_deliveries WHERE finished_at < NOW() - INTERVAL '7 days'");
  await pool.query('DELETE FROM push_subscriptions WHERE session_id IN (SELECT id FROM session WHERE "expiresAt" <= NOW())');
}

export function startPushWorker() {
  if (!pushConfig()) { console.info('[Push] Disabled: configure VAPID keys and subject to enable'); return; }
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await deliverPushBatch(); } catch { console.warn('[Push] Queue processing failed'); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(() => void tick(), 15000);
  timer.unref();
}
