import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../../../api/endpoints/games';
import { sportsApi } from '../../../api/endpoints/sports';
import { turfsApi } from '../../../api/endpoints/turfs';
import { getSportEmoji, turfGradient, formatDate, formatTime } from '../../../utils/helpers';

export default function PublicGamesPage() {
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState<string | null>(null);

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['public-games'],
    queryFn: gamesApi.getPublicGames,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const { data: turfs = [] } = useQuery({
    queryKey: ['turfs'],
    queryFn: turfsApi.getTurfs,
  });

  const sportMap = Object.fromEntries(sports.map((s) => [s.id, s]));
  const turfMap = Object.fromEntries(turfs.map((t) => [t.id, t]));

  const filtered = activeSport ? games.filter((g) => g.sport_id === activeSport) : games;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-5 text-white lg:pt-8">
        <h1 className="text-2xl font-extrabold">Public Games</h1>
        <p className="text-emerald-100 text-sm">Find & join games near you</p>
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
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">⚽</div>
            <p className="text-slate-500 font-medium">No public games yet</p>
            <p className="text-slate-400 text-sm">Book a turf to host one!</p>
          </div>
        ) : (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
            {filtered.map((game) => {
              const sport = sportMap[game.sport_id];
              const turf = turfMap[game.turf_id];
              return (
                <div
                  key={game.id}
                  onClick={() => navigate(`/games/${game.id}`)}
                  className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center text-2xl flex-shrink-0`}>
                      {getSportEmoji(sport?.name ?? '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 truncate">{game.title}</h3>
                      <p className="text-slate-500 text-xs truncate">📍 {turf?.name ?? 'Unknown location'}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-400">📅 {formatDate(game.start_time)}</span>
                        <span className="text-xs text-slate-400">⏰ {formatTime(game.start_time)}</span>
                        {game.entry_fee > 0 && (
                          <span className="text-xs text-emerald-600 font-semibold">₹{game.entry_fee}</span>
                        )}
                        <span className="text-xs text-slate-400">👥 {game.max_players} max</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        game.status === 'open' ? 'bg-emerald-100 text-emerald-700' :
                        game.status === 'full' ? 'bg-orange-100 text-orange-700' :
                        game.status === 'draft' ? 'bg-slate-100 text-slate-500' :
                        (game.status === 'closed' || game.status === 'cancelled') ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {game.status}
                      </span>
                      {game.status === 'open' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/games/${game.id}`); }}
                          className="text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full transition-colors"
                        >
                          Join →
                        </button>
                      )}
                    </div>
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
