import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

function worker() {
  const listeners: Record<string, (event: any) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const openWindow = vi.fn();
  const focus = vi.fn();
  const self = { location: { origin: 'https://erp.test' },
    addEventListener: (event: string, handler: (event: any) => void) => { listeners[event] = handler; },
    registration: { showNotification },
    clients: { matchAll: vi.fn().mockResolvedValue([{ url: 'https://erp.test/hr/leaves', focus }]), openWindow } };
  runInNewContext(readFileSync('public/push-sw.js', 'utf8'), { self, URL });
  return { listeners, showNotification, openWindow, focus };
}

it('shows generic content and rejects external push links', async () => {
  const { listeners, showNotification } = worker();
  let pending: Promise<void> = Promise.resolve();
  listeners.push({ data: { json: () => ({ title: 'Private staff name', url: 'https://evil.test' }) },
    waitUntil: (value: Promise<void>) => { pending = value; } });
  await pending;
  expect(showNotification.mock.calls[0][0]).toBe('ACME ERP');
  expect(showNotification.mock.calls[0][1].data.url).toBe('/');
});

it('focuses the target page without navigating away from an unsaved form', async () => {
  const { listeners, openWindow, focus } = worker();
  let pending: Promise<void> = Promise.resolve();
  listeners.notificationclick({ notification: { close: vi.fn(), data: { url: '/hr/leaves' } },
    waitUntil: (value: Promise<void>) => { pending = value; } });
  await pending;
  expect(focus).toHaveBeenCalled();
  expect(openWindow).not.toHaveBeenCalled();
});
