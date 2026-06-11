import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../../../api/endpoints/games';
import { sportsApi } from '../../../api/endpoints/sports';
import { turfsApi } from '../../../api/endpoints/turfs';
import { useAuth } from '../../../context/AuthContext';
import { getSportEmoji, formatDate, formatTime } from '../../../utils/helpers';
import type { Game } from '../../../types/game';

export default function MyGamesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'hosting' | 'joined'>('hosting');
  const [toast, setToast] = useState('');

  const { data: myGames = [], isLoading } = useQuery({
    queryKey: ['my-games'],
    queryFn: gamesApi.getMyGames,
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

  const hosting = myGames.filter((g) => g.creator_id === user?.id);
  const joined = myGames.filter((g) => g.creator_id !== user?.id);

  const cancelMutation = useMutation({
    mutationFn: (gameId: string) => gamesApi.cancelGame(gameId),
    onSuccess: () => {
      setToast('Game cancelled');
      queryClient.invalidateQueries({ queryKey: ['my-games'] });
      setTimeout(() => setToast(''), 3000);
    },
    onError: () => {
      setToast('Failed to cancel');
      setTimeout(() => setToast(''), 3000);
    },
  });

  const games: Game[] = tab === 'hosting' ? hosting : joined;

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-5 text-white lg:pt-8">
        <h1 className="text-2xl font-extrabold">My Games</h1>
        <p className="text-emerald-100 text-sm">Manage your games</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        {(['hosting', 'joined'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-slate-400'
            }`}
          >
            {t} ({(t === 'hosting' ? hosting : joined).length})
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">⚽</div>
            <p className="text-slate-500 font-medium">
              {tab === 'hosting' ? 'No games hosted yet' : 'No games joined yet'}
            </p>
            <button
              onClick={() => navigate('/games')}
              className="mt-4 bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Explore Games
            </button>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">
          {games.map((game) => {
            const sport = sportMap[game.sport_id];
            const turf = turfMap[game.turf_id];
            return (
              <div
                key={game.id}
                className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getSportEmoji(sport?.name ?? '')}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{game.title}</h3>
                    <p className="text-slate-500 text-xs truncate">📍 {turf?.name ?? 'Unknown'}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatDate(game.start_time)} · {formatTime(game.start_time)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      game.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      game.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {game.status}
                    </span>
                    {tab === 'hosting' && game.status === 'active' && (
                      <button
                        onClick={() => cancelMutation.mutate(game.id)}
                        disabled={cancelMutation.isPending}
                        className="text-xs text-red-500 border border-red-200 px-2 py-0.5 rounded-lg"
                      >
                        Cancel
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
