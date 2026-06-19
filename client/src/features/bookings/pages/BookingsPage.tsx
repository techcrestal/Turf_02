import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../../../api/endpoints/bookings';
import { turfsApi } from '../../../api/endpoints/turfs';
import { formatDate, formatTime } from '../../../utils/helpers';
import { useState } from 'react';
import { GameType } from '../../../types/booking';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
};

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [toast, setToast] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.getBookings,
  });

  const { data: turfs = [] } = useQuery({
    queryKey: ['turfs'],
    queryFn: turfsApi.getTurfs,
  });

  const turfMap = Object.fromEntries(turfs.map((t) => [t.id, t]));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => bookingsApi.cancelBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      showToast('Booking cancelled');
    },
    onError: () => showToast('Failed to cancel booking'),
  });

  const gameTypeMutation = useMutation({
    mutationFn: ({ id, gameType }: { id: string; gameType: GameType }) =>
      bookingsApi.updateGameType(id, gameType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setTogglingId(null);
      showToast('Game type updated');
    },
    onError: () => {
      setTogglingId(null);
      showToast('Failed to update game type');
    },
  });

  const handleGameTypeToggle = (bookingId: string, current: GameType) => {
    const next: GameType = current === 'private' ? 'public' : 'private';
    setTogglingId(bookingId);
    gameTypeMutation.mutate({ id: bookingId, gameType: next });
  };

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 pt-12 pb-5 text-white lg:pt-8">
        <h1 className="text-2xl font-extrabold">My Bookings</h1>
        <p className="text-emerald-100 text-sm">Your turf reservations</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-slate-500 font-medium">No bookings yet</p>
            <p className="text-slate-400 text-sm">Find a turf and book your first slot!</p>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">
          {bookings.map((booking) => {
            const turf = turfMap[booking.turf_id];
            const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
            const canToggleGameType = booking.status !== 'cancelled';
            const isPublic = booking.game_type === 'public';
            const isToggling = togglingId === booking.id;

            return (
              <div
                key={booking.id}
                className={`bg-white border rounded-2xl p-4 shadow-sm transition-colors ${
                  isPublic ? 'border-blue-200' : 'border-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">
                      {turf?.name ?? '🏟️ Turf'}
                    </h3>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">
                      📍 {turf?.city ?? turf?.address ?? '—'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-xs text-slate-500">📅 {formatDate(booking.start_time)}</span>
                      <span className="text-xs text-slate-500">
                        ⏰ {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                      </span>
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
                        className="text-xs text-red-500 border border-red-200 px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Game type row */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isPublic ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isPublic ? '👥 Public' : '🔒 Private'}
                    </span>
                    {isPublic && (
                      <span className="text-xs text-blue-500">Open for others to join</span>
                    )}
                  </div>
                  {canToggleGameType && (
                    <button
                      onClick={() => handleGameTypeToggle(booking.id, booking.game_type ?? 'private')}
                      disabled={isToggling}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                        isPublic
                          ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      {isToggling ? '...' : isPublic ? 'Make Private' : 'Make Public'}
                    </button>
                  )}
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
