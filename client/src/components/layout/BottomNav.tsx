import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/endpoints/notifications';

const tabs = [
  { to: '/home', emoji: '🏠', label: 'Home' },
  { to: '/games', emoji: '⚽', label: 'Games' },
  { to: '/bookings', emoji: '📅', label: 'Bookings' },
  { to: '/notifications', emoji: '🔔', label: 'Alerts' },
  { to: '/profile', emoji: '👤', label: 'Profile' },
];

export default function BottomNav() {
  const location = useLocation();

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 lg:hidden">
      <div className="max-w-md mx-auto flex">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.to);
          const isNotif = tab.to === '/notifications';
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center py-2 relative"
            >
              <span className="text-xl relative">
                {tab.emoji}
                {isNotif && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] mt-0.5 font-medium ${
                  isActive ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
