'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import {
  fetchReminders,
  triggerReminder,
  type ReminderItem,
} from '@/lib/api-client';

const POLL_INTERVAL_MS = 30_000;

/**
 * Periodically checks the current user's reminders and fires any that are
 * due. Firing reuses the existing notification system: the backend marks the
 * reminder as triggered and creates a notification in the bell (and, on
 * desktop, a browser notification), keeping the trigger logic on one side.
 */
export function useReminderScheduler() {
  const { getToken } = useAuth();
  const triggeringRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function checkDueReminders() {
      const token = await getToken();
      if (!token || cancelled) return;

      let reminders: ReminderItem[] = [];
      try {
        reminders = await fetchReminders(token, false);
      } catch {
        return;
      }

      const now = Date.now();
      for (const reminder of reminders) {
        if (reminder.isTriggered) continue;
        if (triggeringRef.current.has(reminder.id)) continue;
        if (new Date(reminder.scheduledFor).getTime() > now) continue;

        triggeringRef.current.add(reminder.id);
        triggerReminder(token, reminder.id)
          .catch(() => {})
          .finally(() => triggeringRef.current.delete(reminder.id));
      }
    }

    const scheduleNext = () => {
      timer = setTimeout(async () => {
        await checkDueReminders();
        if (!cancelled) scheduleNext();
      }, POLL_INTERVAL_MS);
    };

    void checkDueReminders();
    scheduleNext();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [getToken]);
}
