import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { disablePush, enablePush, getPushStatus, supportsPush } from '../lib/push-notifications';

export function PushNotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const supported = supportsPush();
  useEffect(() => {
    getPushStatus().then(status => { setEnabled(status.enabled); setConfigured(status.configured); })
      .catch(() => setMessage('Unable to check notification settings. Reopen Settings to retry.'))
      .finally(() => setBusy(false));
  }, []);
  const toggle = async () => {
    setBusy(true); setMessage('');
    try {
      if (enabled) await disablePush(); else await enablePush();
      setEnabled(!enabled);
      setMessage(enabled ? 'Notifications disabled on this device.' : 'Notifications enabled on this device.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update notifications.'); }
    finally { setBusy(false); }
  };
  return <Card>
    <CardHeader>
      <CardTitle>Device notifications</CardTitle>
      <CardDescription>Receive leave and roster alerts even when ERP is closed. Lock-screen alerts contain no staff details.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-muted-foreground">{!supported ? 'Use HTTPS and a browser that supports push notifications, such as Chrome on Android.'
        : !configured ? 'Push notifications are not configured on this server yet.'
        : enabled ? 'Enabled for this account and login on this device.' : 'Notifications are disabled on this device. Enable them again after signing out.'}</p>
      <Button className="min-h-11" variant="outline" disabled={busy || !supported || !configured} onClick={toggle}>
        {busy ? 'Please wait…' : enabled ? 'Disable notifications' : 'Enable notifications'}
      </Button>
      {message && <p role="status" className="text-sm break-words">{message}</p>}
    </CardContent>
  </Card>;
}
