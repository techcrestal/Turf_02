import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ownerTurfsApi } from '../../../api/endpoints/ownerTurfs';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji } from '../../../utils/helpers';

export default function OwnerTurfListPage() {
  const navigate = useNavigate();

  const { data: turfs = [], isLoading } = useQuery({
    queryKey: ['my-turfs'],
    queryFn: ownerTurfsApi.getMyTurfs,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const sportMap = Object.fromEntries(sports.map((s) => [s.id, s]));

  return (
    <div className="min-h-screen bg-white pb-28">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-600 px-5 pt-6 pb-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">My Turfs</h1>
          <p className="text-emerald-100 text-xs">{turfs.length} turf{turfs.length !== 1 ? 's' : ''} listed</p>
        </div>
        <button
          onClick={() => navigate('/owner/turfs/new')}
          className="bg-white text-emerald-700 font-bold text-sm px-4 py-2 rounded-xl shadow-sm hover:bg-emerald-50 transition-colors"
        >
          + Add Turf
        </button>
      </div>

      <div className="px-5 py-5 lg:px-10">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : turfs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="text-slate-600 font-semibold text-lg">No turfs yet</p>
            <p className="text-slate-400 text-sm mb-6">List your first turf to start earning</p>
            <button
              onClick={() => navigate('/owner/turfs/new')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              + List Your First Turf
            </button>
          </div>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
            {turfs.map((turf) => {
              const sport = sportMap[turf.sport_id];
              return (
                <div
                  key={turf.id}
                  onClick={() => navigate(`/owner/turfs/${turf.id}`)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {getSportEmoji(sport?.name ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 truncate">{turf.name}</h3>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${turf.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <p className="text-xs text-slate-500">{sport?.name ?? 'Unknown'} · {turf.city ?? '—'}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {turf.starting_from_price != null && (
                          <span className="text-xs text-emerald-600 font-semibold">From ₹{turf.starting_from_price}/slot</span>
                        )}
                        <span className="text-xs text-slate-400">👥 {turf.capacity} players</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${turf.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {turf.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <span className="text-slate-300 text-lg flex-shrink-0">›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
