import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-300/10 backdrop-blur-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm text-slate-500">Welcome back,</p>
        <h2 className="text-2xl font-semibold text-slate-900">{user?.name ?? 'Player'}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/dashboard/create-game" className="rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition hover:bg-blue-600">
          Create Game
        </Link>
        <button onClick={logout} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
          Logout
        </button>
      </div>
    </header>
  );
}
