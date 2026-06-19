import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/endpoints/notifications';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const navItems = [
  { to: '/home',          emoji: '🏠', label: 'Home' },
  { to: '/games',         emoji: '⚽', label: 'Public Games' },
  { to: '/turfs',         emoji: '🏟️', label: 'Browse Turfs' },
  { to: '/bookings',      emoji: '📅', label: 'My Bookings' },
  { to: '/my-games',      emoji: '🎮', label: 'My Games' },
  { to: '/notifications', emoji: '🔔', label: 'Notifications' },
  { to: '/profile',       emoji: '👤', label: 'Profile' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    queryClient.clear();
    await logout();
    navigate('/login', { replace: true });
  };

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const firstName = user?.name?.split(' ')[0] ?? 'Player';
  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏟️</span>
          <div>
            <h1 className="font-extrabold text-slate-800 text-xl leading-tight">SquadEazy</h1>
            <p className="text-xs text-slate-400">Book. Play. Win.</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/home'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            <span className="text-base w-5 text-center relative flex-shrink-0">
              {item.emoji}
              {item.to === '/notifications' && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.to === '/notifications' && unreadCount > 0 && (
              <span className="bg-red-100 text-red-600 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Owner Portal link */}
      <div className="px-4 pb-3 border-t border-slate-100 pt-3">
        <button
          onClick={() => navigate('/owner')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
        >
          <span className="text-base w-5 text-center">🏗️</span>
          <span>Owner Portal</span>
        </button>
      </div>

      {/* User card + logout */}
      <div className="px-4 pb-5 space-y-2">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">{firstName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.phone_number}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <span className="text-base w-5 text-center">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
