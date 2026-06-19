import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api/endpoints/notifications';

export interface AlertMessage {
  title: string;
  body: string;
}

export function useNotificationAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alert, setAlert] = useState<AlertMessage | null>(null);

  useQuery({
    queryKey: ['notifications-alert'],
    queryFn: async () => {
      const notifs = await notificationsApi.getNotifications();
      if (!initializedRef.current) {
        notifs.forEach((n) => seenIdsRef.current.add(n.id));
        initializedRef.current = true;
        return notifs;
      }
      const fresh = notifs.filter((n) => !seenIdsRef.current.has(n.id) && !n.is_read);
      if (fresh.length > 0) {
        const latest = fresh[0];
        setAlert({ title: latest.title, body: latest.body });
        fresh.forEach((n) => seenIdsRef.current.add(n.id));
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => setAlert(null), 5000);
      }
      return notifs;
    },
    enabled: !!user,
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  const dismiss = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setAlert(null);
  };

  return { alert, dismiss };
}
