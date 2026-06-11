import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ownerTurfsApi } from '../../../api/endpoints/ownerTurfs';
import { sportsApi } from '../../../api/endpoints/sports';
import { useAuth } from '../../../context/AuthContext';
import { getSportEmoji } from '../../../utils/helpers';

export default function OwnerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: turfs = [], isLoading } = useQuery({
    queryKey: ['my-turfs'],
    queryFn: ownerTurfsApi.getMyTurfs,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const sportMap = Object.fromEntries(sports.map((s) => [s.id, s]));
  const activeTurfs = turfs.filter((t) => t.is_active);

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-600 px-5 pt-6 pb-8 text-white">
        <p className="text-emerald-200 text-sm">Welcome back,</p>
        <h1 className="text-2xl font-extrabold mt-0.5">{user?.name ?? user?.username ?? 'Owner'}</h1>
        <p className="text-emerald-100 text-sm mt-1">Owner Dashboard</p>
      </div>

      {/* Stats */}
      <div className="px-5 -mt-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 text-center border border-slate-100">
            <p className="text-2xl font-extrabold text-slate-800">{isLoading ? '—' : turfs.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Turfs</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 text-center border border-slate-100">
            <p className="text-2xl font-extrabold text-emerald-600">{isLoading ? '—' : activeTurfs.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Active</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6 text-center border border-slate-100">
            <p className="text-2xl font-extrabold text-slate-800">—</p>
            <p className="text-xs text-slate-500 mt-0.5">Bookings</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-4">
        {/* My Turfs section */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800">My Turfs</h2>
          <button
            onClick={() => navigate('/owner/turfs')}
            className="text-sm text-emerald-600 font-semibold"
          >
            See all →
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : turfs.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="text-slate-600 font-semibold">No turfs yet</p>
            <p className="text-slate-400 text-sm mb-4">List your first turf and start earning</p>
            <button
              onClick={() => navigate('/owner/turfs/new')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              + List your first turf
            </button>
          </div>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
            {turfs.slice(0, 5).map((turf) => {
              const sport = sportMap[turf.sport_id];
              return (
                <div
                  key={turf.id}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/owner/turfs/${turf.id}`)}
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {getSportEmoji(sport?.name ?? '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate">{turf.name}</p>
                    <p className="text-xs text-slate-500 truncate">{turf.city ?? '—'} · ₹{turf.price_per_hour}/hr</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${turf.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/owner/turfs/${turf.id}`); }}
                      className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add button */}
      {turfs.length > 0 && (
        <div className="fixed bottom-24 right-4 max-w-md">
          <button
            onClick={() => navigate('/owner/turfs/new')}
            className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
