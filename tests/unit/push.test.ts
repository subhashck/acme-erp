import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import webpush from 'web-push';
const { query, send } = vi.hoisted(() => ({ query: vi.fn(), send: vi.fn() }));
vi.mock('../../server/db/client.ts', () => ({ pool: { query } }));
vi.mock('web-push', async original => {
  const actual = await original<typeof import('web-push')>();
  return { default: { ...actual.default, sendNotification: send } };
});
import { deliverPushBatch, pushConfig } from '../../server/services/push.ts';
import { isPushEndpoint, retryPush, safeNotificationLink, pushSubscriptionSchema } from '../../server/services/push-policy.ts';

beforeEach(() => {
  vi.resetAllMocks();
  const keys = webpush.generateVAPIDKeys();
  vi.stubEnv('VAPID_PUBLIC_KEY', keys.publicKey);
  vi.stubEnv('VAPID_PRIVATE_KEY', keys.privateKey);
  vi.stubEnv('VAPID_SUBJECT', 'mailto:admin@example.com');
});
afterEach(() => vi.unstubAllEnvs());

describe('push policy', () => {
  it('rejects arbitrary hosts, HTTP, credentials and nonstandard ports', () => {
    for (const url of ['http://fcm.googleapis.com/a', 'https://127.0.0.1/a',
      'https://fcm.googleapis.com.attacker.test/a', 'https://user@fcm.googleapis.com/a',
      'https://fcm.googleapis.com:444/a']) expect(isPushEndpoint(url)).toBe(false);
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/token')).toBe(true);
  });
  it('rejects malformed browser keys', () => {
    expect(pushSubscriptionSchema.safeParse({ endpoint: 'https://fcm.googleapis.com/x', keys: { auth: 'a', p256dh: 'b' } }).success).toBe(false);
  });
  it('keeps notification links inside ERP', () => {
    for (const link of ['//evil.test', '/\\evil.test', '/api/auth/sign-out', 'https://evil.test', '/magazine/admin']) {
      expect(safeNotificationLink(link)).toBe('/');
    }
    expect(safeNotificationLink('/hr/leaves?tab=pending')).toBe('/hr/leaves?tab=pending');
  });
  it('bounds retries to transient failures', () => {
    expect(retryPush(429, 1)).toBe(true);
    expect(retryPush(503, 4)).toBe(true);
    expect(retryPush(undefined, 5)).toBe(false);
    expect(retryPush(403, 1)).toBe(false);
  });
  it('disables delivery for missing or mismatched VAPID keys', () => {
    expect(pushConfig()).not.toBeNull();
    vi.stubEnv('VAPID_PRIVATE_KEY', webpush.generateVAPIDKeys().privateKey);
    expect(pushConfig()).toBeNull();
  });
});

function queue(subscription = true, attempts = 1) {
  query.mockResolvedValue({ rows: [] });
  query.mockResolvedValueOnce({ rows: [{ id: 7, notification_id: 9, subscription_id: 2, attempts }] });
  query.mockResolvedValueOnce({ rows: subscription ? [{ endpoint: 'https://fcm.googleapis.com/test',
    p256dh: 'key', auth: 'auth', link: '/hr/leaves' }] : [] });
}

describe('persistent push worker', () => {
  it('sends generic content and finishes a claimed job', async () => {
    queue(); send.mockResolvedValue({ statusCode: 201 });
    await deliverPushBatch();
    expect(send).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(send.mock.calls[0][1]);
    expect(payload).toEqual({ title: 'ACME ERP', body: 'You have a new notification. Open ERP to view it.', tag: 'erp-9', url: '/hr/leaves' });
    expect(query.mock.calls.some(([sql]) => sql.includes('finished_at = NOW()'))).toBe(true);
  });
  it('skips jobs for expired sessions, read notifications or mismatched users', async () => {
    queue(false); await deliverPushBatch();
    expect(send).not.toHaveBeenCalled();
    expect(query.mock.calls[1][0]).toContain('s."expiresAt" > NOW()');
    expect(query.mock.calls[1][0]).toContain('n.user_id = p.user_id');
  });
  it('removes expired endpoints', async () => {
    queue(); send.mockRejectedValue({ statusCode: 410 });
    await deliverPushBatch();
    expect(query).toHaveBeenCalledWith('DELETE FROM push_subscriptions WHERE id = $1', [2]);
  });
  it('reschedules transient errors without marking them complete', async () => {
    queue(); send.mockRejectedValue({ statusCode: 503 });
    await deliverPushBatch();
    expect(query.mock.calls.some(([sql]) => sql.includes("($2 * INTERVAL '1 minute')"))).toBe(true);
    expect(query.mock.calls.some(([sql]) => sql.includes('finished_at = NOW()'))).toBe(false);
  });
  it('stops retrying at the attempt limit', async () => {
    queue(true, 5); send.mockRejectedValue({ statusCode: 503 });
    await deliverPushBatch();
    expect(query.mock.calls.some(([sql]) => sql.includes('finished_at = NOW()'))).toBe(true);
  });
});
