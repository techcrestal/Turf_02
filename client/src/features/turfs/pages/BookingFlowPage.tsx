import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { turfsApi } from '../../../api/endpoints/turfs';
import { courtsApi, Court } from '../../../api/endpoints/courts';
import { bookingsApi, BookedSlot, DayAvailability } from '../../../api/endpoints/bookings';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji, turfGradient } from '../../../utils/helpers';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const HOUR_SLOTS: string[] = Array.from({ length: 17 }, (_, i) =>
  `${String(i + 6).padStart(2, '0')}:00`
);

function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

function getDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}


function CalendarPicker({
  value,
  onChange,
  minDate,
  dayStatuses,
  viewYear,
  viewMonth,
  onMonthChange,
  isLoading,
}: {
  value: string;
  onChange: (d: string) => void;
  minDate: string;
  dayStatuses: DayAvailability[];
  viewYear: number;
  viewMonth: number;
  onMonthChange: (year: number, month: number) => void;
  isLoading?: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = new Date(minDate);
  min.setHours(0, 0, 0, 0);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    onMonthChange(newYear, newMonth);
  };

  const nextMonth = () => {
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    onMonthChange(newYear, newMonth);
  };

  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();
  const statusMap = new Map(dayStatuses.map(d => [d.date, d.status]));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 disabled:opacity-30 text-slate-600 font-bold text-lg"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          {isLoading && (
            <span className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
          )}
        </div>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 font-bold text-lg"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-xs text-slate-400 font-semibold py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const cellDate = new Date(viewYear, viewMonth, day);
          const isPast = cellDate < min;
          const isToday = cellDate.getTime() === today.getTime();
          const isSelected = dateStr === value;
          const status = isPast ? 'available' : (statusMap.get(dateStr) ?? 'available');

          let cls = 'aspect-square flex items-center justify-center text-sm rounded-full transition-all font-medium ';

          if (isSelected) {
            cls += 'bg-emerald-500 text-white shadow-md';
          } else if (isPast) {
            cls += 'text-slate-300 cursor-not-allowed';
          } else if (status === 'full') {
            cls += 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 cursor-pointer';
          } else if (status === 'limited') {
            cls += 'bg-yellow-50 text-yellow-600 border border-yellow-200 hover:bg-yellow-100 cursor-pointer';
          } else {
            cls += 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 cursor-pointer';
          }

          if (isToday && !isSelected) cls += ' ring-2 ring-emerald-400';

          return (
            <button
              key={dateStr}
              disabled={isPast}
              onClick={() => !isPast && onChange(dateStr)}
              className={cls}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-100 border border-green-200" />
          <span className="text-xs text-slate-500">Open</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200" />
          <span className="text-xs text-slate-500">Limited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />
          <span className="text-xs text-slate-500">Full</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-500">Selected</span>
        </div>
      </div>
    </div>
  );
}

function SlotGrid({
  date,
  startTime,
  endTime,
  bookedSlots,
  onStartChange,
  onEndChange,
}: {
  date: string;
  startTime: string;
  endTime: string;
  bookedSlots: BookedSlot[];
  onStartChange: (t: string) => void;
  onEndChange: (t: string) => void;
}) {
  const isSlotBooked = (slotHour: string): boolean => {
    const slotStart = new Date(`${date}T${slotHour}:00`).getTime();
    const slotEnd = slotStart + 60 * 60 * 1000;
    return bookedSlots.some((b) => {
      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();
      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  const startHour = startTime ? parseInt(startTime) : -1;
  const endHour = endTime ? parseInt(endTime) : -1;

  const isInRange = (slotHour: string): boolean => {
    if (!startTime || !endTime) return false;
    const h = parseInt(slotHour);
    return h >= startHour && h < endHour;
  };

  const handleClick = (slotHour: string) => {
    if (isSlotBooked(slotHour)) return;
    const h = parseInt(slotHour);
    const nextHour = `${String(h + 1).padStart(2, '0')}:00`;

    // Tap the already-selected single slot → deselect
    if (startTime === slotHour && endTime === nextHour) {
      onStartChange('');
      onEndChange('');
      return;
    }

    // No selection yet, or tapping at/before current start → fresh 1-hour pick
    if (!startTime || h <= startHour) {
      onStartChange(slotHour);
      onEndChange(nextHour);
      return;
    }

    // Tapping after current end → extend if every slot in between is free
    const currentEndHour = endTime ? parseInt(endTime) : -1;
    if (h >= currentEndHour) {
      const allClear = HOUR_SLOTS
        .filter((s) => parseInt(s) >= currentEndHour && parseInt(s) <= h)
        .every((s) => !isSlotBooked(s));
      if (allClear) {
        onEndChange(nextHour);
      } else {
        // Blocked path → reset to this slot only
        onStartChange(slotHour);
        onEndChange(nextHour);
      }
      return;
    }

    // Tapping within current range → shrink/reset to this slot
    onStartChange(slotHour);
    onEndChange(nextHour);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-slate-500">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-200" />
          <span className="text-xs text-slate-500">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
          <span className="text-xs text-slate-500">Available</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {HOUR_SLOTS.map((slot) => {
          const booked = isSlotBooked(slot);
          const inRange = isInRange(slot);

          let cls = 'py-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ';
          if (booked) {
            cls += 'bg-red-50 text-red-400 cursor-not-allowed border border-red-100';
          } else if (inRange) {
            cls += 'bg-emerald-500 text-white shadow-sm border border-emerald-600';
          } else {
            cls += 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer';
          }

          return (
            <button key={slot} disabled={booked} onClick={() => handleClick(slot)} className={cls}>
              {booked ? <span className="text-red-300">🔒</span> : null}
              <span>{slot}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 h-8 flex items-center">
        {startTime && endTime ? (
          <p className="text-xs text-emerald-700 font-semibold">
            ✓ {startTime} – {endTime} · {getDuration(startTime, endTime)} hr
            {getDuration(startTime, endTime) !== 1 ? 's' : ''} · tap another slot to extend
          </p>
        ) : (
          <p className="text-xs text-slate-400">Tap a slot to select it</p>
        )}
      </div>
    </div>
  );
}

export default function BookingFlowPage() {
  const { turfId } = useParams<{ turfId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [error, setError] = useState('');

  const nowDate = new Date();
  const [calYear, setCalYear] = useState(() => nowDate.getFullYear());
  const [calMonth, setCalMonth] = useState(() => nowDate.getMonth());

  const { data: turf } = useQuery({
    queryKey: ['turf', turfId],
    queryFn: () => turfsApi.getTurfById(turfId!),
    enabled: !!turfId,
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['courts', turfId],
    queryFn: () => courtsApi.getCourts(turfId!),
    enabled: !!turfId,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['turf-photos', turfId],
    queryFn: () => turfsApi.getTurfPhotos(turfId!),
    enabled: !!turfId,
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const { data: availability, isFetching: monthSlotsLoading } = useQuery({
    queryKey: ['availability', turfId, selectedCourt?.id ?? null, calYear, calMonth],
    queryFn: () => {
      const start = new Date(calYear, calMonth, 1).toISOString();
      const end = new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString();
      return bookingsApi.getAvailability(turfId!, start, end, selectedCourt?.id);
    },
    enabled: !!turfId && (!!selectedCourt || courts.length === 0),
    staleTime: 60_000,
  });
  const monthBookedSlots = availability?.booked_slots ?? [];
  const dayStatuses = availability?.day_statuses ?? [];

  // Auto-select the only court if just one exists
  useEffect(() => {
    if (courts.length === 1 && !selectedCourt) {
      setSelectedCourt(courts[0]);
    }
  }, [courts]);

  const handleCourtChange = (court: Court) => {
    setSelectedCourt(court);
    setDate(today);
    setStartTime('');
    setEndTime('');
  };

  const dayBookedSlots = useMemo(() => {
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = new Date(`${date}T23:59:59`).getTime();
    return monthBookedSlots.filter(b => {
      const bStart = new Date(b.start_time).getTime();
      return bStart >= dayStart && bStart <= dayEnd;
    });
  }, [monthBookedSlots, date]);

  const sport = sports.find((s) => s.id === turf?.sport_id);
  const duration = startTime && endTime ? getDuration(startTime, endTime) : 0;

  const calcPrice = (): number => {
    if (!selectedCourt || !date || !startTime || !endTime) return 0;
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const daySlots = (selectedCourt.court_time_slots ?? []).filter(
      (s) => s.day_of_week === dayOfWeek,
    );
    if (daySlots.length === 0) return 0;
    const startH = parseInt(startTime);
    const endH = parseInt(endTime);
    let total = 0;
    for (let h = startH; h < endH; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      // Find which slot covers this hour (slot.start_time ≤ hour < slot.end_time)
      const slot = daySlots.find((s) => {
        const ss = s.start_time.slice(0, 5);
        const se = s.end_time.slice(0, 5);
        return hourStr >= ss && hourStr < se;
      });
      if (slot) {
        const slotHours = parseInt(slot.end_time) - parseInt(slot.start_time) || 1;
        total += Number(slot.price_per_slot) / slotHours;
      }
    }
    return Math.round(total);
  };

  const totalPrice = calcPrice();
  const needsCourt = courts.length > 0;
  const canBook = date !== '' && startTime !== '' && endTime !== '' && (!needsCourt || selectedCourt !== null);

  const handleDateChange = (d: string) => {
    setDate(d);
    setStartTime('');
    setEndTime('');
  };

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!turfId) throw new Error('No turf selected');
      if (duration <= 0) throw new Error('Invalid time selection');
      return bookingsApi.createBooking({
        turf_id: turfId,
        court_id: selectedCourt?.id ?? undefined,
        start_time: toISO(date, startTime),
        end_time: toISO(date, endTime),
        price: totalPrice,
      });
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      navigate('/payment', {
        state: {
          bookingId: booking.id,
          amount: totalPrice,
          turfName: turf?.name ?? '',
          courtName: selectedCourt?.name,
          courtDetails: selectedCourt ? `${selectedCourt.size} · ${selectedCourt.court_type}` : undefined,
          date,
          startTime,
          endTime,
          duration,
        },
      });
    },
    onError: (err: any) => {
      setError(
        err?.response?.data?.error?.message ??
          err?.response?.data?.message ??
          err?.message ??
          'Failed to create booking. Please try again.'
      );
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="relative bg-black">
        {photos.length > 0 ? (
          <>
            <div className="relative h-44 overflow-hidden">
              <img
                src={photos[activePhoto]?.url}
                alt={`${turf?.name} photo ${activePhoto + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
              {activePhoto > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => p - 1); }}
                  className="absolute left-10 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
                >
                  ‹
                </button>
              )}
              {activePhoto < photos.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => p + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
                >
                  ›
                </button>
              )}
            </div>
          </>
        ) : (
          <div className={`h-44 bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center`}>
            <span className="text-6xl">{getSportEmoji(sport?.name ?? '')}</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 text-white">
          <h1 className="text-xl font-extrabold drop-shadow">{turf?.name ?? 'Book Turf'}</h1>
          <p className="text-white/60 text-xs mt-0.5">
            {turf?.city ? `${turf.city} · ` : ''}{sport?.name ?? ''}
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center text-sm backdrop-blur-sm"
        >
          ←
        </button>
      </div>

      <div className="px-4 py-5 pb-8 space-y-6 lg:max-w-xl lg:mx-auto">

        {/* Section 1: Court Selection */}
        {needsCourt && (
          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">Select Court</h2>
            <div className="space-y-3">
              {courts.map((court) => {
                const isSelected = selectedCourt?.id === court.id;
                const dayOfWeek = new Date(date + 'T12:00:00').getDay();
                const slots = (court.court_time_slots ?? []).filter((s) => s.day_of_week === dayOfWeek);
                const minPrice = slots.length > 0 ? Math.min(...slots.map((s) => Number(s.price_per_slot))) : null;

                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => handleCourtChange(court)}
                    className={`w-full text-left border-2 rounded-2xl p-4 transition-all bg-white ${
                      isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{court.name}</p>
                          {isSelected && (
                            <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{court.size}</span>
                          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{court.court_type}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {minPrice !== null && (
                          <>
                            <p className="text-xs text-slate-400">from</p>
                            <p className="text-base font-bold text-emerald-600">₹{minPrice}</p>
                            <p className="text-xs text-slate-400">per slot</p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 2: Date Selection — only after court is chosen */}
        {(selectedCourt || !needsCourt) && (
          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">Select Date</h2>
            <CalendarPicker
              value={date}
              onChange={handleDateChange}
              minDate={today}
              dayStatuses={dayStatuses}
              viewYear={calYear}
              viewMonth={calMonth}
              onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
              isLoading={monthSlotsLoading}
            />
            {date && (
              <p className="text-sm font-medium text-slate-600 mt-2">
                {new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </section>
        )}

        {/* Section 3: Time Slots — only after a date is picked */}
        {date && (selectedCourt || !needsCourt) && (
          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">Select Time Slot</h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <SlotGrid
                date={date}
                startTime={startTime}
                endTime={endTime}
                bookedSlots={dayBookedSlots}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
            </div>
          </section>
        )}

        {/* Basket summary — appears once a slot is selected */}
        {startTime && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center">
              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">From</p>
                <p className="text-2xl font-extrabold text-slate-800 leading-none">{startTime}</p>
              </div>

              <div className="text-slate-300 text-lg font-light px-2">→</div>

              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">To</p>
                {endTime ? (
                  <p className="text-2xl font-extrabold text-slate-800 leading-none">{endTime}</p>
                ) : (
                  <p className="text-2xl font-extrabold text-slate-300 leading-none">--:--</p>
                )}
              </div>

              <div className="w-px h-10 bg-slate-200 mx-3" />

              <div className="flex-1 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Total</p>
                {endTime ? (
                  <p className="text-2xl font-extrabold text-emerald-600 leading-none">₹{totalPrice}</p>
                ) : (
                  <p className="text-2xl font-extrabold text-slate-300 leading-none">—</p>
                )}
              </div>
            </div>

            {endTime && (
              <p className="text-xs text-slate-400 text-center mt-2">
                {selectedCourt ? `${selectedCourt.name} · ` : ''}{duration} hr{duration !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Book CTA */}
        <button
          onClick={() => { setError(''); bookMutation.mutate(); }}
          disabled={!canBook || bookMutation.isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3.5 rounded-2xl transition-colors text-base"
        >
          {bookMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating booking...
            </span>
          ) : canBook ? (
            `Proceed to Pay · ₹${totalPrice}`
          ) : (
            needsCourt && !selectedCourt
              ? 'Select a court to continue'
              : !date
              ? 'Select a date to continue'
              : !startTime || !endTime
              ? 'Tap a slot to set your time'
              : 'Select date & time to continue'
          )}
        </button>

      </div>

    </div>
  );
}
