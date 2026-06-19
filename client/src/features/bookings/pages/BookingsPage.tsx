import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi, PublicBooking, JoinRequest } from '../../../api/endpoints/bookings';
import { turfsApi } from '../../../api/endpoints/turfs';
import { formatDate, formatTime } from '../../../utils/helpers';
import { useMemo, useState } from 'react';
import { Booking, GameType } from '../../../types/booking';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

type Tab = 'my-games' | 'public';

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<Tab>('my-games');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedRequestsId, setExpandedRequestsId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['bookings-joined'] });
    queryClient.invalidateQueries({ queryKey: ['bookings-pending-joins'] });
    queryClient.invalidateQueries({ queryKey: ['bookings-public'] });
    queryClient.invalidateQueries({ queryKey: ['join-requests'] });
  };

  const { data: myBookings = [], isLoading: myLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.getBookings,
  });

  const { data: joinedGames = [], isLoading: joinedLoading } = useQuery({
    queryKey: ['bookings-joined'],
    queryFn: bookingsApi.getJoinedGames,
  });

  const { data: pendingJoins = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['bookings-pending-joins'],
    queryFn: bookingsApi.getPendingJoins,
  });

  const { data: joinRequests = [] } = useQuery({
    queryKey: ['join-requests'],
    queryFn: bookingsApi.getJoinRequests,
  });

  const { data: publicGames = [], isLoading: publicLoading } = useQuery({
    queryKey: ['bookings-public'],
    queryFn: bookingsApi.getPublicGames,
    enabled: tab === 'public',
  });

  const { data: turfs = [] } = useQuery({
    queryKey: ['turfs'],
    queryFn: turfsApi.getTurfs,
  });

  const turfMap = useMemo(() => Object.fromEntries(turfs.map((t) => [t.id, t])), [turfs]);

  // Group join requests by booking_id for inline display on hosting cards
  const requestsByBooking = useMemo(
    () =>
      joinRequests.reduce<Record<string, JoinRequest[]>>((acc, r) => {
        if (!acc[r.booking_id]) acc[r.booking_id] = [];
        acc[r.booking_id].push(r);
        return acc;
      }, {}),
    [joinRequests],
  );

  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.cancelBooking(id),
    onSuccess: () => { invalidateAll(); showToast('Booking cancelled'); },
    onError: () => showToast('Failed to cancel'),
  });

  const gameTypeMutation = useMutation({
    mutationFn: ({ id, gameType }: { id: string; gameType: GameType }) =>
      bookingsApi.updateGameType(id, gameType),
    onSuccess: () => { invalidateAll(); setTogglingId(null); showToast('Game type updated'); },
    onError: () => { setTogglingId(null); showToast('Failed to update'); },
  });

  const approveMutation = useMutation({
    mutationFn: ({ bookingId, userId }: { bookingId: string; userId: string }) =>
      bookingsApi.approveJoinRequest(bookingId, userId),
    onSuccess: () => { invalidateAll(); showToast('Player approved!'); },
    onError: () => showToast('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ bookingId, userId }: { bookingId: string; userId: string }) =>
      bookingsApi.rejectJoinRequest(bookingId, userId),
    onSuccess: () => { invalidateAll(); showToast('Request rejected'); },
    onError: () => showToast('Failed to reject'),
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.joinBooking(id),
    onSuccess: () => { invalidateAll(); showToast('Join request sent — awaiting approval'); },
    onError: (e: any) => showToast(e?.response?.data?.error?.message ?? 'Failed to request join'),
  });

  const leaveMutation = useMutation({
    mutationFn: (id: string) => bookingsApi.leaveBooking(id),
    onSuccess: () => { invalidateAll(); showToast('Left the game'); },
    onError: () => showToast('Failed to leave'),
  });

  const handleGameTypeToggle = (id: string, current: GameType) => {
    setTogglingId(id);
    gameTypeMutation.mutate({ id, gameType: current === 'private' ? 'public' : 'private' });
  };

  const totalPendingRequests = joinRequests.length;
  const myGamesCount = myBookings.length + joinedGames.length + pendingJoins.length;

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-4 text-white lg:pt-8">
        <h1 className="text-2xl font-extrabold">Games</h1>
        <p className="text-emerald-100 text-sm">Your games & public sessions</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => setTab('my-games')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
            tab === 'my-games' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          My Games
          {myGamesCount > 0 && (
            <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{myGamesCount}</span>
          )}
          {totalPendingRequests > 0 && (
            <span className="absolute top-2 right-6 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setTab('public')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === 'public' ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          👥 Public Games
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* ── MY GAMES TAB ───────────────────────────────────────────── */}
        {tab === 'my-games' && (
          <>
            {(myLoading || joinedLoading || pendingLoading) ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : myGamesCount === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">📅</div>
                <p className="text-slate-500 font-medium">No games yet</p>
                <p className="text-slate-400 text-sm">Book a turf or join a public game!</p>
              </div>
            ) : (
              <>
                {/* ── Hosting section ── */}
                {myBookings.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">🏠 Hosting</h2>
                    <div className="space-y-3">
                      {myBookings.map((booking) => {
                        const turf = turfMap[booking.turf_id];
                        const isPublic = booking.game_type === 'public';
                        const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
                        const isToggling = togglingId === booking.id;
                        const pendingRequests = requestsByBooking[booking.id] ?? [];
                        const isExpanded = expandedRequestsId === booking.id;

                        return (
                          <div
                            key={booking.id}
                            className={`bg-white border rounded-2xl p-4 shadow-sm ${isPublic ? 'border-blue-200' : 'border-slate-100'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isPublic ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {isPublic ? '👥 Public' : '🔒 Private'}
                                  </span>
                                  {pendingRequests.length > 0 && (
                                    <button
                                      onClick={() => setExpandedRequestsId(isExpanded ? null : booking.id)}
                                      className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse"
                                    >
                                      {pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''} pending
                                    </button>
                                  )}
                                </div>
                                <h3 className="font-bold text-slate-800 truncate">{turf?.name ?? '🏟️ Turf'}</h3>
                                <p className="text-slate-500 text-xs mt-0.5 truncate">📍 {turf?.city ?? turf?.address ?? '—'}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-xs text-slate-500">📅 {formatDate(booking.start_time)}</span>
                                  <span className="text-xs text-slate-500">⏰ {formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
                                </div>
                                <p className="text-emerald-700 font-bold text-sm mt-1">₹{booking.price}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[booking.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                  {booking.status}
                                </span>
                                {canCancel && (
                                  <button
                                    onClick={() => cancelMutation.mutate(booking.id)}
                                    disabled={cancelMutation.isPending}
                                    className="text-xs text-red-500 border border-red-200 px-2 py-0.5 rounded-lg hover:bg-red-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Inline join requests panel */}
                            {isExpanded && pendingRequests.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-red-100 space-y-2">
                                <p className="text-xs font-semibold text-slate-500">Join Requests</p>
                                {pendingRequests.map((req) => (
                                  <div key={req.user_id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3 py-2">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">{req.requester.name || 'Player'}</p>
                                      <p className="text-xs text-slate-500">{req.requester.phone_number}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => approveMutation.mutate({ bookingId: booking.id, userId: req.user_id })}
                                        disabled={approveMutation.isPending}
                                        className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg disabled:opacity-60"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => rejectMutation.mutate({ bookingId: booking.id, userId: req.user_id })}
                                        disabled={rejectMutation.isPending}
                                        className="text-xs border border-red-200 text-red-500 hover:bg-red-50 font-medium px-2.5 py-1 rounded-lg disabled:opacity-60"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Game type toggle */}
                            {(booking as Booking).status !== 'cancelled' && (
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                <span className="text-xs text-slate-400">
                                  {isPublic ? 'Others can see & request to join' : 'Only you can see this'}
                                </span>
                                <button
                                  onClick={() => handleGameTypeToggle(booking.id, booking.game_type ?? 'private')}
                                  disabled={isToggling}
                                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                                    isPublic ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {isToggling ? '...' : isPublic ? 'Make Private' : 'Make Public'}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* ── Pending Approval section ── */}
                {pendingJoins.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">⏳ Pending Approval</h2>
                    <div className="space-y-3">
                      {pendingJoins.map((game) => {
                        const turf = turfMap[game.turf_id];
                        return (
                          <div key={game.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-amber-700 mb-1">⏳ Awaiting host approval</p>
                                <h3 className="font-bold text-slate-800 truncate">{turf?.name ?? '🏟️ Turf'}</h3>
                                <p className="text-slate-500 text-xs mt-0.5 truncate">📍 {turf?.city ?? turf?.address ?? '—'}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-xs text-slate-500">📅 {formatDate(game.start_time)}</span>
                                  <span className="text-xs text-slate-500">⏰ {formatTime(game.start_time)} – {formatTime(game.end_time)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => leaveMutation.mutate(game.id)}
                                disabled={leaveMutation.isPending}
                                className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-50 flex-shrink-0"
                              >
                                Withdraw
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* ── Joined section ── */}
                {joinedGames.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">✅ Joined</h2>
                    <div className="space-y-3">
                      {joinedGames.map((game) => {
                        const turf = turfMap[game.turf_id];
                        return (
                          <div key={game.id} className="bg-white border border-violet-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">✅ Joined</span>
                                <h3 className="font-bold text-slate-800 truncate mt-1">{turf?.name ?? '🏟️ Turf'}</h3>
                                <p className="text-slate-500 text-xs mt-0.5 truncate">📍 {turf?.city ?? turf?.address ?? '—'}</p>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                  <span className="text-xs text-slate-500">📅 {formatDate(game.start_time)}</span>
                                  <span className="text-xs text-slate-500">⏰ {formatTime(game.start_time)} – {formatTime(game.end_time)}</span>
                                </div>
                              </div>
                              <button
                                onClick={() => leaveMutation.mutate(game.id)}
                                disabled={leaveMutation.isPending}
                                className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-50 flex-shrink-0"
                              >
                                Leave
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}

        {/* ── PUBLIC GAMES TAB ─────────────────────────────────────────── */}
        {tab === 'public' && (
          <>
            {publicLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : publicGames.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">👥</div>
                <p className="text-slate-500 font-medium">No public games right now</p>
                <p className="text-slate-400 text-sm">Book a turf and set it to Public to start one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicGames.map((game: PublicBooking) => {
                  const turf = turfMap[game.turf_id];
                  const js = game.join_status;
                  return (
                    <div key={game.id} className="bg-white border border-blue-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {js === 'host' && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">👑 Your game</span>
                          )}
                          <h3 className="font-bold text-slate-800 truncate mt-1">{turf?.name ?? '🏟️ Turf'}</h3>
                          <p className="text-slate-500 text-xs mt-0.5 truncate">📍 {turf?.city ?? turf?.address ?? '—'}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-slate-500">📅 {formatDate(game.start_time)}</span>
                            <span className="text-xs text-slate-500">⏰ {formatTime(game.start_time)} – {formatTime(game.end_time)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          {js === 'host' && <span className="text-xs text-slate-400">Hosting</span>}
                          {js === 'pending' && (
                            <>
                              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⏳ Requested</span>
                              <button
                                onClick={() => leaveMutation.mutate(game.id)}
                                disabled={leaveMutation.isPending}
                                className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-50"
                              >
                                Withdraw
                              </button>
                            </>
                          )}
                          {js === 'approved' && (
                            <>
                              <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">✅ Joined</span>
                              <button
                                onClick={() => leaveMutation.mutate(game.id)}
                                disabled={leaveMutation.isPending}
                                className="text-xs text-slate-500 border border-slate-200 px-2 py-0.5 rounded-lg hover:bg-slate-50"
                              >
                                Leave
                              </button>
                            </>
                          )}
                          {(js === 'none' || js === 'rejected') && (
                            <button
                              onClick={() => joinMutation.mutate(game.id)}
                              disabled={joinMutation.isPending}
                              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                            >
                              {joinMutation.isPending ? '...' : js === 'rejected' ? '↩ Re-request' : '👥 Request to Join'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
