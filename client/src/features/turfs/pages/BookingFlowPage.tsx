import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { turfsApi } from '../../../api/endpoints/turfs';
import { sportsApi } from '../../../api/endpoints/sports';
import { courtsApi, Court, TimeSlot } from '../../../api/endpoints/courts';
import { bookingsApi, BookedSlot } from '../../../api/endpoints/bookings';
import { gamesApi } from '../../../api/endpoints/games';
import { paymentsApi } from '../../../api/endpoints/payments';
import { getSportEmoji, turfGradient } from '../../../utils/helpers';

type GameType = 'private' | 'public' | null;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

function getMatchingSlots(court: Court, date: string, startTime: string, endTime: string): TimeSlot[] {
  const dayOfWeek = new Date(date).getDay();
  return (court.court_time_slots ?? []).filter((s) => {
    if (s.day_of_week !== dayOfWeek) return false;
    return s.start_time.slice(0, 5) >= startTime || s.end_time.slice(0, 5) <= endTime;
  });
}

type DayStatus = 'available' | 'partial' | 'full';

function computeDayStatus(dateStr: string, bookedSlots: BookedSlot[]): DayStatus {
  const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
  const dayEnd = new Date(`${dateStr}T23:59:59`).getTime();

  const dayBookings = bookedSlots.filter(b => {
    const bStart = new Date(b.start_time).getTime();
    return bStart >= dayStart && bStart <= dayEnd;
  });

  if (dayBookings.length === 0) return 'available';

  const bookedHours = HOUR_SLOTS.filter(slot => {
    const slotStart = new Date(`${dateStr}T${slot}:00`).getTime();
    const slotEnd = slotStart + 60 * 60 * 1000;
    return dayBookings.some(b => {
      const bStart = new Date(b.start_time).getTime();
      const bEnd = new Date(b.end_time).getTime();
      return slotStart < bEnd && slotEnd > bStart;
    });
  }).length;

  if (bookedHours >= Math.ceil(HOUR_SLOTS.length * 0.7)) return 'full';
  return 'partial';
}

function CalendarPicker({
  value,
  onChange,
  minDate,
  bookedSlots,
  viewYear,
  viewMonth,
  onMonthChange,
  isLoading,
}: {
  value: string;
  onChange: (d: string) => void;
  minDate: string;
  bookedSlots: BookedSlot[];
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
          const status: DayStatus = isPast ? 'available' : computeDayStatus(dateStr, bookedSlots);

          let cls = 'aspect-square flex items-center justify-center text-sm rounded-full transition-all font-medium ';

          if (isSelected) {
            cls += 'bg-emerald-500 text-white shadow-md';
          } else if (isPast) {
            cls += 'text-slate-300 cursor-not-allowed';
          } else if (status === 'full') {
            cls += 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 cursor-pointer';
          } else if (status === 'partial') {
            cls += 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 cursor-pointer';
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
          <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200" />
          <span className="text-xs text-slate-500">Limited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />
          <span className="text-xs text-slate-500">Almost full</span>
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

    if (!startTime || (startTime && endTime)) {
      onStartChange(slotHour);
      onEndChange('');
      return;
    }

    if (h <= startHour) {
      onStartChange(slotHour);
      onEndChange('');
      return;
    }

    const allClear = HOUR_SLOTS
      .filter((s) => parseInt(s) > startHour && parseInt(s) <= h)
      .every((s) => !isSlotBooked(s));

    if (allClear) {
      onEndChange(`${String(h + 1).padStart(2, '0')}:00`);
    }
  };

  const awaitingEnd = startTime && !endTime;

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
          const isStart = slot === startTime && !endTime;

          let cls = 'py-2.5 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ';
          if (booked) {
            cls += 'bg-red-50 text-red-400 cursor-not-allowed border border-red-100';
          } else if (inRange) {
            cls += 'bg-emerald-500 text-white shadow-sm border border-emerald-600';
          } else if (isStart) {
            cls += 'bg-emerald-400 text-white border border-emerald-500 ring-2 ring-emerald-300';
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
        {awaitingEnd && (
          <p className="text-xs text-emerald-600 font-medium animate-pulse">
            ✓ Start: {startTime} — now tap your end slot
          </p>
        )}
        {startTime && endTime && (
          <p className="text-xs text-emerald-700 font-semibold">
            ✓ {startTime} – {endTime} ({getDuration(startTime, endTime)} hr
            {getDuration(startTime, endTime) !== 1 ? 's' : ''})
          </p>
        )}
        {!startTime && (
          <p className="text-xs text-slate-400">Tap a slot to set your start time</p>
        )}
      </div>
    </div>
  );
}

export default function BookingFlowPage() {
  const { turfId } = useParams<{ turfId: string }>();
  const navigate = useNavigate();

  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(1);
  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [gameType, setGameType] = useState<GameType>(null);
  const [gameForm, setGameForm] = useState({
    sport_id: '',
    title: '',
    description: '',
    entry_fee: '0',
    max_players: '10',
  });
  const [activePhoto, setActivePhoto] = useState(0);
  const [success, setSuccess] = useState<{ bookingId: string } | null>(null);
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

  const { data: monthBookedSlots = [], isFetching: monthSlotsLoading } = useQuery({
    queryKey: ['availability', turfId, calYear, calMonth],
    queryFn: () => {
      const start = new Date(calYear, calMonth, 1).toISOString();
      const end = new Date(calYear, calMonth + 1, 0, 23, 59, 59).toISOString();
      return bookingsApi.getAvailability(turfId!, start, end);
    },
    enabled: !!turfId,
    staleTime: 60_000,
  });

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
    if (selectedCourt && date && startTime && endTime) {
      const matching = getMatchingSlots(selectedCourt, date, startTime, endTime);
      if (matching.length > 0) {
        return matching.reduce((sum, s) => sum + Number(s.price_per_slot), 0);
      }
    }
    return Math.max(0, duration) * (turf?.price_per_hour ?? 500);
  };

  const totalPrice = calcPrice();
  const TOTAL_STEPS = 4;

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!turfId) throw new Error('No turf selected');
      if (duration <= 0) throw new Error('Invalid time selection');

      const booking = await bookingsApi.createBooking({
        turf_id: turfId,
        court_id: selectedCourt?.id ?? undefined,
        start_time: toISO(date, startTime),
        end_time: toISO(date, endTime),
        price: totalPrice,
      });

      if (gameType === 'public') {
        await gamesApi.createGame({
          turf_id: turfId,
          sport_id: gameForm.sport_id || turf?.sport_id || sports[0]?.id,
          title: gameForm.title || `Game at ${turf?.name}`,
          description: gameForm.description || undefined,
          type: 'public',
          entry_fee: parseFloat(gameForm.entry_fee) || 0,
          max_players: parseInt(gameForm.max_players) || 10,
          start_time: toISO(date, startTime),
          end_time: toISO(date, endTime),
        });
      } else if (gameType === 'private') {
        await gamesApi.createGame({
          turf_id: turfId,
          sport_id: turf?.sport_id || sports[0]?.id,
          title: `Private game at ${turf?.name}`,
          type: 'private',
          start_time: toISO(date, startTime),
          end_time: toISO(date, endTime),
        });
      }

      await paymentsApi.createPayment({
        booking_id: booking.id,
        amount: totalPrice,
        currency: 'INR',
        provider: 'mock',
      });

      return booking;
    },
    onSuccess: (booking) => setSuccess({ bookingId: booking.id }),
    onError: (err: any) => {
      setError(
        err?.response?.data?.error?.message ??
          err?.response?.data?.message ??
          err?.message ??
          'Booking failed. Try again.'
      );
    },
  });

  const goBack = () => {
    setError('');
    if (step === 1) navigate(-1);
    else setStep((s) => s - 1);
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setStartTime('');
    setEndTime('');
  };

  const handleMonthChange = (year: number, month: number) => {
    setCalYear(year);
    setCalMonth(month);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-5xl mb-5">✅</div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Booking Confirmed!</h2>
        <p className="text-slate-500 text-sm mb-1">Your turf is booked successfully</p>
        {selectedCourt && (
          <p className="text-sm font-semibold text-emerald-600 mb-1">{selectedCourt.name}</p>
        )}
        <p className="text-xs text-slate-400 mb-6 font-mono">#{success.bookingId.slice(0, 8)}</p>
        <button
          onClick={() => navigate('/bookings')}
          className="bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl mb-3"
        >
          View My Bookings
        </button>
        <button onClick={() => navigate('/home')} className="text-slate-500 text-sm">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative bg-black">
        {photos.length > 0 ? (
          <>
            <div className="relative h-52 overflow-hidden">
              <img
                src={photos[activePhoto]?.url}
                alt={`${turf?.name} photo ${activePhoto + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40" />
              <span className="absolute top-14 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {activePhoto + 1}/{photos.length}
              </span>
              {activePhoto > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => p - 1); }}
                  className="absolute left-10 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
                >
                  ‹
                </button>
              )}
              {activePhoto < photos.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setActivePhoto((p) => p + 1); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center text-lg backdrop-blur-sm"
                >
                  ›
                </button>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto bg-black/90 no-scrollbar">
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePhoto(i)}
                    className={`flex-shrink-0 w-12 h-8 rounded overflow-hidden border-2 transition-all ${
                      i === activePhoto ? 'border-emerald-400' : 'border-transparent opacity-50'
                    }`}
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={`h-52 bg-gradient-to-br ${turfGradient(sport?.name ?? '')} flex items-center justify-center`}>
            <span className="text-6xl">{getSportEmoji(sport?.name ?? '')}</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 text-white">
          <h1 className="text-xl font-extrabold drop-shadow">{turf?.name ?? 'Book Turf'}</h1>
          <p className="text-white/70 text-xs mt-0.5">
            Step {step} of {TOTAL_STEPS} —{' '}
            {step === 1 ? 'Date & Time' : step === 2 ? 'Select Court' : step === 3 ? 'Game Type' : 'Confirm'}
          </p>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? 'bg-emerald-400' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <button
          onClick={goBack}
          className="absolute top-12 left-4 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center text-sm backdrop-blur-sm"
        >
          ←
        </button>
      </div>

      <div className="px-5 py-5 lg:max-w-xl lg:mx-auto">

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Select Date & Time</h2>

            <CalendarPicker
              value={date}
              onChange={handleDateChange}
              minDate={today}
              bookedSlots={monthBookedSlots}
              viewYear={calYear}
              viewMonth={calMonth}
              onMonthChange={handleMonthChange}
              isLoading={monthSlotsLoading}
            />

            {date && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Pick your time slot</p>
              <SlotGrid
                date={date}
                startTime={startTime}
                endTime={endTime}
                bookedSlots={dayBookedSlots}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
            </div>

            {duration > 0 && (
              <div className="bg-emerald-50 rounded-xl p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Duration</span>
                  <span className="font-semibold text-slate-800">
                    {duration} hr{duration !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Base rate</span>
                  <span className="font-semibold text-slate-800">₹{turf?.price_per_hour ?? '—'}/hr</span>
                </div>
              </div>
            )}

            <button
              onClick={() => duration > 0 && setStep(2)}
              disabled={duration <= 0}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {duration > 0 ? `Next → (${startTime} – ${endTime})` : 'Select start and end time to continue'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Choose a Court</h2>
            <p className="text-sm text-slate-500">
              {new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              {' · '}{startTime} – {endTime}
            </p>

            {courts.length === 0 && (
              <div className="bg-slate-50 rounded-2xl p-8 text-center">
                <p className="text-slate-400 text-sm">No courts available for this turf</p>
              </div>
            )}

            <div className="space-y-3">
              {courts.map((court) => {
                const dayOfWeek = new Date(date + 'T12:00:00').getDay();
                const slots = (court.court_time_slots ?? []).filter((s) => s.day_of_week === dayOfWeek);
                const isSelected = selectedCourt?.id === court.id;
                const minPrice = slots.length > 0 ? Math.min(...slots.map((s) => Number(s.price_per_slot))) : null;

                return (
                  <button
                    key={court.id}
                    type="button"
                    onClick={() => setSelectedCourt(court)}
                    className={`w-full text-left border-2 rounded-2xl p-4 transition-all ${
                      isSelected ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
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
                        {slots.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {slots.slice(0, 5).map((s) => (
                              <span key={s.id ?? `${s.start_time}-${s.day_of_week}`} className="bg-white border border-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                              </span>
                            ))}
                            {slots.length > 5 && <span className="text-xs text-slate-400">+{slots.length - 5} more</span>}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 mt-1.5">No slots for {DAYS[dayOfWeek]}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {minPrice !== null ? (
                          <>
                            <p className="text-xs text-slate-400">from</p>
                            <p className="text-base font-bold text-emerald-600">₹{minPrice}</p>
                            <p className="text-xs text-slate-400">per slot</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-slate-400">base</p>
                            <p className="text-base font-bold text-emerald-600">₹{turf?.price_per_hour}</p>
                            <p className="text-xs text-slate-400">per hr</p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => selectedCourt && setStep(3)}
              disabled={!selectedCourt}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {selectedCourt ? `Continue with ${selectedCourt.name} →` : 'Select a court to continue'}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">What type of game?</h2>

            <div
              onClick={() => setGameType('private')}
              className={`border-2 rounded-2xl p-5 cursor-pointer transition-colors ${
                gameType === 'private' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="font-bold text-slate-800 text-lg">Private Game</h3>
              <p className="text-slate-500 text-sm">Only for you and invited friends</p>
            </div>

            <div
              onClick={() => setGameType('public')}
              className={`border-2 rounded-2xl p-5 cursor-pointer transition-colors ${
                gameType === 'public' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="text-3xl mb-2">🌍</div>
              <h3 className="font-bold text-slate-800 text-lg">Public Game</h3>
              <p className="text-slate-500 text-sm">Anyone can join and pay entry fee</p>
            </div>

            {gameType === 'public' && (
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-emerald-100">
                <p className="text-sm font-semibold text-slate-700">Game Details</p>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Sport</label>
                  <select
                    value={gameForm.sport_id}
                    onChange={(e) => setGameForm({ ...gameForm, sport_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Select sport</option>
                    {sports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Game Title</label>
                  <input
                    type="text"
                    value={gameForm.title}
                    onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
                    placeholder="Friday evening match"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Entry Fee (₹)</label>
                    <input type="number" value={gameForm.entry_fee} onChange={(e) => setGameForm({ ...gameForm, entry_fee: e.target.value })} min="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 mb-1 block">Max Players</label>
                    <input type="number" value={gameForm.max_players} onChange={(e) => setGameForm({ ...gameForm, max_players: e.target.value })} min="2" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => gameType && setStep(4)}
              disabled={!gameType}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Confirm Booking</h2>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <Row label="Turf" value={turf?.name ?? '—'} />
              {selectedCourt && (
                <Row label="Court" value={`${selectedCourt.name} · ${selectedCourt.size} · ${selectedCourt.court_type}`} />
              )}
              <Row
                label="Date"
                value={new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
              <Row label="Time" value={`${startTime} – ${endTime}`} />
              <Row label="Duration" value={`${duration} hr${duration !== 1 ? 's' : ''}`} />
              {gameType && <Row label="Game" value={gameType === 'public' ? '🌍 Public' : '🔒 Private'} />}
              {gameType === 'public' && gameForm.title && <Row label="Title" value={gameForm.title} />}
              {gameType === 'public' && parseFloat(gameForm.entry_fee) > 0 && (
                <Row label="Entry Fee" value={`₹${gameForm.entry_fee}/person`} />
              )}
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                <span className="font-bold text-slate-800">Total to Pay</span>
                <span className="font-bold text-emerald-700 text-xl">₹{totalPrice}</span>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              {confirmMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                '💳 Confirm & Pay ₹' + totalPrice
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <p className="text-sm text-slate-500 flex-shrink-0">{label}</p>
      <p className="text-sm text-slate-800 font-medium text-right">{value}</p>
    </div>
  );
}
