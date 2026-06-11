import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { turfsApi } from '../../../api/endpoints/turfs';
import { gamesApi } from '../../../api/endpoints/games';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji, turfGradient, getGreeting, formatTime, formatDate } from '../../../utils/helpers';
import type { Turf } from '../../../types/turf';
import type { Game } from '../../../types/game';
import type { Sport } from '../../../types/sport';

function TurfCard({ turf, sport, onBook }: { turf: Turf; sport?: Sport; onBook: () => void }) {
  const sportName = sport?.name ?? '';
  return (
    <div className="min-w-[180px] lg:min-w-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className={`h-24 bg-gradient-to-br ${turfGradient(sportName)} flex items-center justify-center text-4xl`}>
        {getSportEmoji(sportName)}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-slate-800 text-sm truncate">{turf.name}</h3>
        <p className="text-slate-400 text-xs truncate">{turf.city}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-emerald-600 font-bold text-sm">₹{turf.price_per_hour}/hr</span>
          <button
            onClick={onBook}
            className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-lg font-medium"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, sport, turf }: { game: Game; sport?: Sport; turf?: Turf }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/games/${game.id}`)}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center text-lg flex-shrink-0`}>
          {getSportEmoji(sport?.name ?? '')}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-sm truncate">{game.title}</h3>
          <p className="text-slate-500 text-xs truncate">{turf?.name ?? 'Unknown turf'}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-slate-400">{formatDate(game.start_time)}</span>
            <span className="text-xs text-slate-400">{formatTime(game.start_time)}</span>
            {game.entry_fee > 0 && (
              <span className="text-xs text-emerald-600 font-medium">₹{game.entry_fee}</span>
            )}
          </div>
        </div>
        <span className="text-xs text-slate-400 flex-shrink-0">
          👥 {game.max_players}
        </span>
      </div>
    </div>
  );
}

export default function DashboardHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState<string | null>(null);

  const { data: turfs = [], isLoading: turfsLoading } = useQuery({
    queryKey: ['turfs'],
    queryFn: turfsApi.getTurfs,
  });

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['public-games'],
    queryFn: gamesApi.getPublicGames,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const sportMap = Object.fromEntries(sports.map((s) => [s.id, s]));
  const turfMap = Object.fromEntries(turfs.map((t) => [t.id, t]));

  const filteredTurfs = activeSport
    ? turfs.filter((t) => t.sport_id === activeSport)
    : turfs;

  const filteredGames = activeSport
    ? games.filter((g) => g.sport_id === activeSport)
    : games;

  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] ?? 'Player';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-5 pt-12 pb-6 text-white lg:pt-8 lg:pb-8 lg:px-8">
        <p className="text-emerald-200 text-sm">{greeting},</p>
        <h1 className="text-2xl font-extrabold">{firstName} 👋</h1>
        <p className="text-emerald-100 text-sm mt-1">Find a turf & play today</p>

        {/* Search bar */}
        <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2.5 flex items-center gap-2 lg:max-w-lg">
          <span className="text-white/70">🔍</span>
          <span className="text-white/60 text-sm">Search turfs, games...</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 lg:px-10 lg:py-6">
        {/* Sports filter */}
        {sports.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Sports</h2>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 lg:flex-wrap lg:overflow-x-visible">
              <button
                onClick={() => setActiveSport(null)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  !activeSport
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                All
              </button>
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => setActiveSport(activeSport === sport.id ? null : sport.id)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeSport === sport.id
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {getSportEmoji(sport.name)} {sport.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Turfs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-base">Nearby Turfs</h2>
            <button onClick={() => navigate('/turfs')} className="text-emerald-600 text-sm font-medium">
              See all →
            </button>
          </div>
          {turfsLoading ? (
            <div className="flex gap-3 lg:hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[180px] h-36 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredTurfs.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No turfs found</p>
          ) : (
            <>
              {/* Mobile: horizontal scroll */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 lg:hidden">
                {filteredTurfs.slice(0, 10).map((turf) => (
                  <TurfCard
                    key={turf.id}
                    turf={turf}
                    sport={sportMap[turf.sport_id]}
                    onBook={() => navigate(`/book/${turf.id}`)}
                  />
                ))}
              </div>
              {/* Desktop: grid */}
              <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
                {filteredTurfs.slice(0, 10).map((turf) => (
                  <TurfCard
                    key={turf.id}
                    turf={turf}
                    sport={sportMap[turf.sport_id]}
                    onBook={() => navigate(`/book/${turf.id}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Public Games Today */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 text-base">Public Games</h2>
            <button onClick={() => navigate('/games')} className="text-emerald-600 text-sm font-medium">
              See all →
            </button>
          </div>
          {gamesLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredGames.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">No public games right now</p>
          ) : (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              {filteredGames.slice(0, 5).map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  sport={sportMap[game.sport_id]}
                  turf={turfMap[game.turf_id]}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
