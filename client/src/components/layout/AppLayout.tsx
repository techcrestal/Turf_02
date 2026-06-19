import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { useNotificationAlert } from '../../hooks/useNotificationAlert';

export default function AppLayout() {
  const { alert, dismiss } = useNotificationAlert();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:z-40 lg:border-r lg:border-slate-100">
        <Sidebar />
      </div>

      {/* Realtime notification toast */}
      {alert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-start gap-3">
          <span className="text-lg flex-shrink-0 mt-0.5">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">{alert.title}</p>
            <p className="text-slate-300 text-xs mt-0.5 leading-snug">{alert.body}</p>
          </div>
          <button
            onClick={dismiss}
            className="text-slate-400 hover:text-white text-xl leading-none flex-shrink-0 -mt-0.5"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Page content */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        {/* Mobile: centred card; Desktop: full-width */}
        <main className="flex-1 w-full
                         max-w-md mx-auto pb-20 bg-white shadow-sm
                         lg:max-w-full lg:mx-0 lg:pb-0 lg:bg-slate-50 lg:shadow-none">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
