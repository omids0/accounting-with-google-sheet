import { useEffect, useRef } from 'react';
import { isTokenValid } from '../services/auth';
import { syncAppOpen } from '../services/activityTracking';
import { ensureDefaultReminderRules } from '../services/reminders';
import { getSettings } from '../services/settings';
import { getItem, setItem } from '../services/storage';
import {
  getCurrentPushSubscription,
  getDeviceLabel,
  getNotificationPermission,
  getPushSupportStatus,
  subscribeToPush,
} from '../services/pushNotifications';
import { upsertPushSubscription } from '../services/reminders';

const PUSH_PROMPT_KEY = 'accounting_push_prompted';

async function tryAutoSubscribePush(spreadsheetId: string): Promise<void> {
  if (getPushSupportStatus() !== 'supported') return;

  const permission = getNotificationPermission();
  if (permission === 'denied') return;

  const existing = await getCurrentPushSubscription();
  if (existing?.endpoint) {
    await upsertPushSubscription(spreadsheetId, {
      endpoint: existing.endpoint,
      p256dh: existing.keys!.p256dh!,
      auth: existing.keys!.auth!,
      deviceLabel: getDeviceLabel(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (permission === 'default' && getItem<boolean>(PUSH_PROMPT_KEY)) {
    return;
  }

  if (permission === 'default') {
    setItem(PUSH_PROMPT_KEY, true);
  }

  try {
    const subscription = await subscribeToPush();
    await upsertPushSubscription(spreadsheetId, {
      endpoint: subscription.endpoint!,
      p256dh: subscription.keys!.p256dh!,
      auth: subscription.keys!.auth!,
      deviceLabel: getDeviceLabel(),
      updatedAt: new Date().toISOString(),
    });
  } catch {
    /* user denied or environment not ready */
  }
}

export function useEngagementReminders(): void {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const spreadsheetId = getSettings()?.spreadsheetId;
    if (!spreadsheetId || !isTokenValid()) return;

    void (async () => {
      try {
        await ensureDefaultReminderRules(spreadsheetId);
        await syncAppOpen(spreadsheetId);
        await tryAutoSubscribePush(spreadsheetId);
      } catch {
        /* non-blocking background setup */
      }
    })();
  }, []);
}
