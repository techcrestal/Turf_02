import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const tabs = [
    { icon: '🏟️', label: 'Dashboard', path: '/owner' },
    { icon: '📋', label: 'My Turfs', path: '/owner/turfs' },
    { icon: '👤', label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/owner') return location.pathname === '/owner';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:bg-gradient-to-b lg:from-emerald-700 lg:to-emerald-600 lg:text-white lg:z-40">
        <div className="px-5 pt-8 pb-6 border-b border-emerald-600">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏟️</span>
            <span className="font-extrabold text-base tracking-tight">SquadEazy Owner</span>
          </div>
          <p className="text-emerald-200 text-xs">{user?.name ?? user?.username ?? 'Owner'}</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                isActive(tab.path)
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="px-4 pb-6 space-y-2">
          <button
            onClick={() => navigate('/home')}
            className="w-full text-xs bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl font-medium transition-colors text-white"
          >
            ← Player View
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full text-xs bg-red-500/20 hover:bg-red-500/40 px-3 py-2 rounded-xl font-medium transition-colors text-white"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Top Header (mobile only) */}
      <div className="lg:hidden bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-5 pt-10 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏟️</span>
          <span className="font-extrabold text-base tracking-tight">SquadEazy Owner</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-100 text-sm">{user?.name ?? user?.username ?? 'Owner'}</span>
          <button
            onClick={() => navigate('/home')}
            className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full font-medium transition-colors"
          >
            Player View
          </button>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="text-xs bg-red-500/20 hover:bg-red-500/40 px-3 py-1.5 rounded-full font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <main className="max-w-md mx-auto pb-24 min-h-screen bg-white shadow-sm lg:max-w-none lg:ml-64 lg:pb-8">
        <Outlet />
      </main>

      {/* Bottom Nav (mobile only) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="max-w-md mx-auto bg-white border-t border-slate-100 flex">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
                isActive(tab.path)
                  ? 'text-emerald-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
            <div className="text-3xl mb-3">👋</div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Logging out?</h3>
            <p className="text-slate-500 text-sm mb-5">You'll need to sign in again to manage your turfs.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
