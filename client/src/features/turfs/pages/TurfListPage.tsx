import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { turfsApi } from '../../../api/endpoints/turfs';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji, turfGradient } from '../../../utils/helpers';

export default function TurfListPage() {
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState<string | null>(null);

  const { data: turfs = [], isLoading } = useQuery({
    queryKey: ['turfs'],
    queryFn: turfsApi.getTurfs,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const sportMap = Object.fromEntries(sports.map((s) => [s.id, s]));

  const filtered = activeSport ? turfs.filter((t) => t.sport_id === activeSport) : turfs;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-5 text-white lg:pt-8">
        <h1 className="text-2xl font-extrabold">Browse Turfs</h1>
        <p className="text-emerald-100 text-sm">Find the perfect turf near you</p>
      </div>

      <div className="px-4 py-4 space-y-4 lg:px-10 lg:py-6">
        {/* Sport filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:flex-wrap lg:overflow-x-visible">
          <button
            onClick={() => setActiveSport(null)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !activeSport ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            All
          </button>
          {sports.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSport(activeSport === s.id ? null : s.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeSport === s.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {getSportEmoji(s.name)} {s.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="text-slate-500 font-medium">No turfs found</p>
            <p className="text-slate-400 text-sm">Try a different sport filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((turf) => {
              const sport = sportMap[turf.sport_id];
              return (
                <div
                  key={turf.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  <div className={`h-24 bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center text-4xl`}>
                    {getSportEmoji(sport?.name ?? '')}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-slate-800 text-sm truncate">{turf.name}</h3>
                    <p className="text-slate-400 text-xs truncate">{turf.city}</p>
                    {turf.starting_from_price != null && (
                      <p className="text-emerald-600 font-bold text-sm mt-1">From ₹{turf.starting_from_price}/slot</p>
                    )}
                    <button
                      onClick={() => navigate(`/turfs/${turf.id}`)}
                      className="mt-2 w-full bg-emerald-50 text-emerald-700 text-xs py-1.5 rounded-lg font-medium hover:bg-emerald-100 transition-colors"
                    >
                      View Details
                    </button>
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
