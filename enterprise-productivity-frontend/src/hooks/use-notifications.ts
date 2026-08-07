import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { fetchNotifications, fetchUnreadCount, markNotificationRead, markAllNotificationsRead, type NotificationItem } from '@/lib/api-client';

const POLL_INTERVAL_MS = 10000;

export function useNotifications() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const [list, count] = await Promise.all([fetchNotifications(token), fetchUnreadCount(token)]);
      setItems(list);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function markRead(id: string) {
    const token = await getToken();
    if (!token) return;
    await markNotificationRead(token, id);
    refresh();
  }

  async function markAllRead() {
    const token = await getToken();
    if (!token) return;
    await markAllNotificationsRead(token);
    refresh();
  }

  return { items, unreadCount, isLoading, markRead, markAllRead, refresh };
}
