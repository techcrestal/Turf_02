import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ratingsApi } from '../../api/endpoints/ratings';
import { bookingsApi } from '../../api/endpoints/bookings';
import { useAuth } from '../../context/AuthContext';
import StarPicker from './StarPicker';
import { GameParticipant } from '../../types/rating';
import { JoinRequest } from '../../api/endpoints/bookings';

// ── Single player row ─────────────────────────────────────────────────────────
interface RowProps {
  player: GameParticipant;
  isMe: boolean;
  isPending: boolean;
  isPast: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  approvePending?: boolean;
  rejectPending?: boolean;
}

function PlayerRow({ player, isMe, isPending, isPast, onApprove, onReject, approvePending, rejectPending }: RowProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});

  const { data: ratingData } = useQuery({
    queryKey: ['player-ratings', player.id],
    queryFn: () => ratingsApi.getPlayerRatings(player.id),
  });

  const { data: myRatings } = useQuery({
    queryKey: ['my-player-rating', player.id],
    queryFn: () => ratingsApi.getMyPlayerRatings(player.id),
    enabled: !isMe && !isPending && isPast,
  });

  useEffect(() => {
    if (myRatings) setSkillRatings(myRatings);
  }, [myRatings]);

  const submitMutation = useMutation({
    mutationFn: () => ratingsApi.submitPlayerRatings(player.id, skillRatings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-ratings', player.id] });
      queryClient.invalidateQueries({ queryKey: ['my-player-rating', player.id] });
      setExpanded(false);
    },
  });

  const avgRating =
    ratingData && ratingData.skills.length > 0
      ? ratingData.skills.reduce((s, r) => s + r.average, 0) / ratingData.skills.length
      : 0;

  const canRate = !isMe && !isPending && isPast;

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {player.name[0]?.toUpperCase()}
        </div>

        {/* Name + rating */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-800 text-sm">{player.name}</span>
            {isMe && <span className="text-[10px] text-slate-400">(You)</span>}
            {player.is_host && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                👑 Host
              </span>
            )}
          </div>
          {avgRating > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <StarPicker value={Math.round(avgRating)} readonly size="sm" />
              <span className="text-[11px] text-slate-400">{avgRating.toFixed(1)}</span>
            </div>
          )}
          {!isPending && player.skills.length > 0 && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              {player.skills.map((s) => s.display_name).join(' · ')}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPending ? (
            <>
              <button
                onClick={onApprove}
                disabled={approvePending}
                className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold px-2.5 py-1 rounded-lg"
              >
                {approvePending ? '...' : 'Approve'}
              </button>
              <button
                onClick={onReject}
                disabled={rejectPending}
                className="text-xs border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-60 font-medium px-2.5 py-1 rounded-lg"
              >
                {rejectPending ? '...' : 'Reject'}
              </button>
            </>
          ) : !isPending && !isMe ? (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Approved
            </span>
          ) : null}

          {canRate && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className={`text-xs border font-medium px-2.5 py-1 rounded-lg transition-colors ${
                expanded
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {expanded ? 'Done' : '⭐ Rate'}
            </button>
          )}
        </div>
      </div>

      {/* Inline skill rating form */}
      {expanded && (
        <div className="mt-3 ml-12">
          {player.skills.length === 0 ? (
            <p className="text-xs text-slate-400 py-1">
              This player hasn't added skills to their profile yet — ask them to update it!
            </p>
          ) : (
            <div className="space-y-2.5">
              {player.skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 flex-1">{skill.display_name}</span>
                  <StarPicker
                    value={skillRatings[skill.id] ?? 0}
                    onChange={(v) => setSkillRatings((p) => ({ ...p, [skill.id]: v }))}
                    size="sm"
                  />
                </div>
              ))}
              <button
                onClick={() => submitMutation.mutate()}
                disabled={Object.values(skillRatings).filter(Boolean).length === 0 || submitMutation.isPending}
                className="w-full text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors mt-1"
              >
                {submitMutation.isPending ? 'Saving...' : 'Save Rating'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface Props {
  bookingId: string;
  isHost: boolean;
  isPast: boolean;
  pendingRequests: JoinRequest[];
  onClose: () => void;
  onAction: () => void;
}

export default function PlayersModal({ bookingId, isHost, isPast, pendingRequests, onClose, onAction }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: participants = [], isLoading } = useQuery({
    queryKey: ['booking-participants', bookingId],
    queryFn: () => ratingsApi.getBookingParticipants(bookingId),
  });

  const approveMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      bookingsApi.approveJoinRequest(bookingId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-participants', bookingId] });
      onAction();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      bookingsApi.rejectJoinRequest(bookingId, userId),
    onSuccess: () => {
      onAction();
    },
  });

  const total = pendingRequests.length + participants.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-extrabold text-slate-800 text-lg">Players</h2>
            <p className="text-sm text-slate-400">{total} total</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Pending join requests */}
          {isHost && pendingRequests.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-1">
                ⏳ Pending ({pendingRequests.length})
              </p>
              {pendingRequests.map((req) => (
                <PlayerRow
                  key={req.user_id}
                  player={{ id: req.user_id, name: req.requester.name ?? 'Player', is_host: false, skills: [] }}
                  isMe={false}
                  isPending={true}
                  isPast={isPast}
                  onApprove={() => approveMutation.mutate({ userId: req.user_id })}
                  onReject={() => rejectMutation.mutate({ userId: req.user_id })}
                  approvePending={approveMutation.isPending}
                  rejectPending={rejectMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Approved / in-game */}
          <div className={pendingRequests.length > 0 ? 'mt-4' : 'mt-4'}>
            {pendingRequests.length > 0 && (
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                ✅ In Game
              </p>
            )}
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No approved players yet.</p>
            ) : (
              participants.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isMe={p.id === user?.id}
                  isPending={false}
                  isPast={isPast}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
