import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { gamesApi } from '../../../api/endpoints/games';
import { sportsApi } from '../../../api/endpoints/sports';
import { turfsApi } from '../../../api/endpoints/turfs';
import { paymentsApi } from '../../../api/endpoints/payments';
import { useAuth } from '../../../context/AuthContext';
import { getSportEmoji, turfGradient, formatDate, formatTime } from '../../../utils/helpers';

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState('');

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => gamesApi.getGameById(id!),
    enabled: !!id,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const { data: turfs = [] } = useQuery({
    queryKey: ['turfs'],
    queryFn: turfsApi.getTurfs,
  });

  const sport = sports.find((s) => s.id === game?.sport_id);
  const turf = turfs.find((t) => t.id === game?.turf_id);

  const joinMutation = useMutation({
    mutationFn: async () => {
      await gamesApi.joinGame(id!);
      if (game && game.entry_fee > 0) {
        await paymentsApi.createPayment({
          game_id: id,
          amount: game.entry_fee,
          currency: 'INR',
          provider: 'mock',
        });
      }
    },
    onSuccess: () => {
      setToast('Joined successfully! 🎉');
      queryClient.invalidateQueries({ queryKey: ['game', id] });
      setTimeout(() => setToast(''), 3000);
    },
    onError: (err: any) => {
      setToast(err?.response?.data?.message ?? 'Failed to join game');
      setTimeout(() => setToast(''), 3000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-40 bg-slate-200 animate-pulse" />
        <div className="px-5 py-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-500">Game not found</p>
      </div>
    );
  }

  const isCreator = user?.id === game.creator_id;

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Hero */}
      <div className={`h-44 bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center relative`}>
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-9 h-9 bg-black/30 text-white rounded-full flex items-center justify-center"
        >
          ←
        </button>
        <span className="text-6xl">{getSportEmoji(sport?.name ?? '')}</span>
        <span className={`absolute top-12 right-4 text-xs font-bold px-3 py-1 rounded-full ${
          game.type === 'public' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
        }`}>
          {game.type === 'public' ? '🌍 Public' : '🔒 Private'}
        </span>
      </div>

      <div className="px-5 py-5 space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">{game.title}</h1>
          {game.description && (
            <p className="text-slate-500 text-sm mt-1">{game.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Sport</p>
            <p className="font-semibold text-slate-700 text-sm">{getSportEmoji(sport?.name ?? '')} {sport?.name ?? 'Unknown'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Location</p>
            <p className="font-semibold text-slate-700 text-sm truncate">📍 {turf?.name ?? 'Unknown'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Date</p>
            <p className="font-semibold text-slate-700 text-sm">{formatDate(game.start_time)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-500 mb-1">Time</p>
            <p className="font-semibold text-slate-700 text-sm">{formatTime(game.start_time)}</p>
          </div>
        </div>

        {game.entry_fee > 0 && (
          <div className="bg-emerald-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Entry Fee</p>
              <p className="text-2xl font-extrabold text-emerald-700">₹{game.entry_fee}</p>
            </div>
            <span className="text-2xl">💰</span>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Max Players</span>
            <span className="text-sm font-bold text-slate-800">{game.max_players}</span>
          </div>
          <div className="mt-3">
            {(() => {
              const statusConfig: Record<string, { dot: string; bg: string; text: string; label: string }> = {
                open:      { dot: 'bg-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Open' },
                full:      { dot: 'bg-orange-500',  bg: 'bg-orange-100',  text: 'text-orange-700',  label: 'Full' },
                draft:     { dot: 'bg-slate-400',   bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'Draft' },
                closed:    { dot: 'bg-red-500',     bg: 'bg-red-100',     text: 'text-red-700',     label: 'Closed' },
                cancelled: { dot: 'bg-red-500',     bg: 'bg-red-100',     text: 'text-red-700',     label: 'Cancelled' },
                completed: { dot: 'bg-slate-400',   bg: 'bg-slate-100',   text: 'text-slate-600',   label: 'Completed' },
              };
              const cfg = statusConfig[game.status] ?? { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600', label: game.status };
              return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  Status: {cfg.label}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Join button */}
      {!isCreator && game.status === 'open' && (
        <div className="fixed bottom-20 left-0 right-0 px-4 max-w-md mx-auto">
          <button
            onClick={() => joinMutation.mutate()}
            disabled={joinMutation.isPending}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg text-base transition-colors"
          >
            {joinMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Joining...
              </span>
            ) : (
              `Join Game${game.entry_fee > 0 ? ` · ₹${game.entry_fee}` : ''}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
