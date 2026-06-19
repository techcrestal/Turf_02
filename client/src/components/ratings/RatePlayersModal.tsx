import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ratingsApi } from '../../api/endpoints/ratings';
import { useAuth } from '../../context/AuthContext';
import StarPicker from './StarPicker';
import { GameParticipant } from '../../types/rating';

interface Props {
  bookingId: string;
  onClose: () => void;
}

export default function RatePlayersModal({ bookingId, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlayer, setSelectedPlayer] = useState<GameParticipant | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [savedFor, setSavedFor] = useState<Set<string>>(new Set());

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['booking-participants', bookingId],
    queryFn: () => ratingsApi.getBookingParticipants(bookingId),
  });

  const others = participants.filter((p) => p.id !== user?.id);

  const { data: myExisting } = useQuery({
    queryKey: ['my-player-rating', selectedPlayer?.id],
    queryFn: () => ratingsApi.getMyPlayerRatings(selectedPlayer!.id),
    enabled: !!selectedPlayer,
  });

  const mutation = useMutation({
    mutationFn: () => ratingsApi.submitPlayerRatings(selectedPlayer!.id, ratings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-ratings', selectedPlayer!.id] });
      setSavedFor((prev) => new Set([...prev, selectedPlayer!.id]));
      setTimeout(() => setSelectedPlayer(null), 800);
    },
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg">Rate Players</h2>
            <p className="text-sm text-slate-500">{others.length} player{others.length !== 1 ? 's' : ''} in this game</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        {others.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-4">No other players to rate yet.</p>
        )}

        {/* Player list */}
        {!selectedPlayer && (
          <div className="space-y-2">
            {others.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPlayer(p); setRatings(myExisting ?? {} as Record<string, number>); }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                    <p className="text-xs text-slate-400">
                      {p.is_host ? '👑 Host' : '👤 Player'} · {p.skills.length} skill{p.skills.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {savedFor.has(p.id) ? (
                  <span className="text-emerald-500 text-sm font-medium">✓ Rated</span>
                ) : (
                  <span className="text-emerald-600 text-sm">Rate →</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Rating form for selected player */}
        {selectedPlayer && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
            >
              ← Back to players
            </button>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                {selectedPlayer.name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{selectedPlayer.name}</p>
                <p className="text-xs text-slate-400">{selectedPlayer.is_host ? '👑 Host' : '👤 Player'}</p>
              </div>
            </div>

            {selectedPlayer.skills.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-2">
                This player hasn't added skills to their profile yet.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedPlayer.skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{skill.display_name}</span>
                    <StarPicker
                      value={ratings[skill.id] ?? 0}
                      onChange={(v) => setRatings((p) => ({ ...p, [skill.id]: v }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedPlayer.skills.length > 0 && (
              <button
                onClick={() => mutation.mutate()}
                disabled={Object.keys(ratings).length === 0 || mutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {mutation.isPending ? 'Saving...' : 'Submit Ratings'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
