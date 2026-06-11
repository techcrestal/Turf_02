import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../../api/endpoints/notifications';
import { timeAgo } from '../../../utils/helpers';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => notificationsApi.markAsRead(n.id)));
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-5 text-white lg:pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold">Notifications</h1>
            <p className="text-emerald-100 text-sm">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-50 lg:max-w-2xl lg:mx-auto">
        {isLoading ? (
          <div className="px-4 py-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-slate-500 font-medium">No notifications yet</p>
            <p className="text-slate-400 text-sm">We'll let you know when something happens</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}
              className={`px-5 py-4 cursor-pointer transition-colors ${
                !notif.is_read ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {!notif.is_read && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                  {notif.is_read && (
                    <div className="w-2 h-2 bg-transparent rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${!notif.is_read ? 'text-slate-800' : 'text-slate-600'}`}>
                    {notif.title}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{notif.body}</p>
                  <p className="text-slate-400 text-xs mt-1">{timeAgo(notif.created_at)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
