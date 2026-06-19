import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTurfs, ManualBooking, Court, CourtTimeSlot, BookingAvailabilitySlot } from '../../api/adminTurfs';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface AdminSlot {
  start: string; // "09:00"
  end: string;   // "10:00"
  price: number;
}

function strToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function minsToStr(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function buildSlots(slots: CourtTimeSlot[], dayOfWeek: number): AdminSlot[] {
  const result: AdminSlot[] = [];
  for (const ts of slots.filter(s => s.day_of_week === dayOfWeek)) {
    const startMin = strToMins(ts.start_time);
    const endMin = strToMins(ts.end_time);
    const dur = ts.slot_duration_minutes ?? 60;
    for (let cur = startMin; cur + dur <= endMin; cur += dur) {
      result.push({ start: minsToStr(cur), end: minsToStr(cur + dur), price: Number(ts.price_per_slot) });
    }
  }
  return result.sort((a, b) => a.start.localeCompare(b.start));
}

function isSlotBooked(slot: AdminSlot, date: string, booked: BookingAvailabilitySlot[]): boolean {
  const sStart = new Date(`${date}T${slot.start}:00`).getTime();
  const sEnd = new Date(`${date}T${slot.end}:00`).getTime();
  return booked.some(b => {
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return sStart < bEnd && sEnd > bStart;
  });
}

// ── Simple calendar (no color coding needed for admin) ───────────────────────

function AdminCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 font-bold">‹</button>
        <span className="font-semibold text-slate-700 text-sm">{MONTHS[month]} {year}</span>
        <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 font-bold">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-xs text-slate-400 font-semibold py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === value;
          return (
            <button
              key={dateStr}
              onClick={() => onChange(dateStr)}
              className={`aspect-square flex items-center justify-center text-xs rounded-full font-medium transition-all
                ${isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-50 text-slate-700'}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Slot grid ────────────────────────────────────────────────────────────────

function AdminSlotGrid({
  date, slots, startTime, endTime, booked, onSelect,
}: {
  date: string;
  slots: AdminSlot[];
  startTime: string;
  endTime: string;
  booked: BookingAvailabilitySlot[];
  onSelect: (start: string, end: string) => void;
}) {
  const isSelected = (slot: AdminSlot) =>
    !!startTime && !!endTime && slot.start >= startTime && slot.end <= endTime;

  const handleClick = (slot: AdminSlot) => {
    if (isSlotBooked(slot, date, booked)) return;

    if (startTime === slot.start && endTime === slot.end) {
      onSelect('', ''); return;
    }
    if (!startTime || slot.start <= startTime) {
      onSelect(slot.start, slot.end); return;
    }
    if (slot.start >= endTime) {
      const blocked = slots
        .filter(s => s.start >= endTime && s.start <= slot.start)
        .some(s => isSlotBooked(s, date, booked));
      if (blocked) onSelect(slot.start, slot.end);
      else onSelect(startTime, slot.end);
      return;
    }
    onSelect(slot.start, slot.end);
  };

  if (slots.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-4">No slots configured for this day.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> Selected</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-100 border border-red-200 inline-block" /> Booked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" /> Available</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {slots.map(slot => {
          const booked_ = isSlotBooked(slot, date, booked);
          const sel = isSelected(slot);
          let cls = 'py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ';
          if (booked_) cls += 'bg-red-50 text-red-400 cursor-not-allowed border border-red-100';
          else if (sel) cls += 'bg-indigo-500 text-white border border-indigo-600 shadow-sm';
          else cls += 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer';

          return (
            <button key={slot.start} onClick={() => handleClick(slot)} className={cls}>
              {booked_ && <span className="text-red-300 text-[10px]">🔒</span>}
              <span>{slot.start}</span>
              <span className="text-[10px] opacity-70">{slot.end}</span>
              {!booked_ && <span className="text-[10px] opacity-60">₹{slot.price}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const statusBadge = (s: string) => ({
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  refunded: 'bg-red-100 text-red-700',
}[s] ?? 'bg-slate-100 text-slate-500');

type DetailsForm = {
  customer_name: string;
  customer_phone: string;
  total_amount: string;
  payment_status: string;
  notes: string;
};

const emptyDetails: DetailsForm = {
  customer_name: '', customer_phone: '', total_amount: '', payment_status: 'paid', notes: '',
};

interface Props { turfId: string; }

export default function BookingsTab({ turfId }: Props) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [details, setDetails] = useState<DetailsForm>(emptyDetails);
  const [formErr, setFormErr] = useState('');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-bookings', turfId],
    queryFn: () => adminTurfs.listBookings(turfId),
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['admin-courts', turfId],
    queryFn: () => adminTurfs.listCourts(turfId),
  });

  const { data: bookedSlots = [] } = useQuery({
    queryKey: ['admin-booking-avail', turfId, selectedCourt?.id ?? null, date],
    queryFn: () => adminTurfs.getBookingAvailability(turfId, selectedCourt?.id ?? null, date),
    enabled: !!date,
    staleTime: 30_000,
  });

  const dayOfWeek = date ? new Date(date + 'T12:00:00').getDay() : -1;

  const courtSlots = useMemo(
    () => buildSlots(selectedCourt?.court_time_slots ?? [], dayOfWeek),
    [selectedCourt, dayOfWeek],
  );

  const totalPrice = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return courtSlots
      .filter(s => s.start >= startTime && s.end <= endTime)
      .reduce((sum, s) => sum + s.price, 0);
  }, [courtSlots, startTime, endTime]);

  const getDuration = () => {
    if (!startTime || !endTime) return 0;
    return (strToMins(endTime) - strToMins(startTime)) / 60;
  };

  const handleSlotSelect = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    // Pre-fill amount from slot price
    if (start && end) {
      const price = courtSlots
        .filter(s => s.start >= start && s.end <= end)
        .reduce((sum, s) => sum + s.price, 0);
      setDetails(d => ({ ...d, total_amount: price > 0 ? String(price) : d.total_amount }));
    }
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    setDate('');
    setStartTime('');
    setEndTime('');
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    setStartTime('');
    setEndTime('');
  };

  const addMutation = useMutation({
    mutationFn: () => {
      if (!date || !startTime || !endTime || !details.customer_name.trim()) {
        throw new Error('Fill all required fields');
      }
      return adminTurfs.createBooking(turfId, {
        court_id: selectedCourt?.id ?? null,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        customer_name: details.customer_name,
        customer_phone: details.customer_phone || null,
        total_amount: parseFloat(details.total_amount) || 0,
        payment_status: details.payment_status,
        notes: details.notes || null,
      } as never);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bookings', turfId] });
      qc.invalidateQueries({ queryKey: ['admin-booking-avail'] });
      resetForm();
    },
    onError: (e: Error) => setFormErr(e.message || 'Failed to create booking'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminTurfs.deleteBooking(turfId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bookings', turfId] });
      qc.invalidateQueries({ queryKey: ['admin-booking-avail'] });
    },
  });

  const resetForm = () => {
    setShowAdd(false);
    setSelectedCourt(null);
    setDate('');
    setStartTime('');
    setEndTime('');
    setDetails(emptyDetails);
    setFormErr('');
  };

  const submitBooking = () => {
    if (!date || !startTime || !endTime) { setFormErr('Select a date and time slot'); return; }
    if (!details.customer_name.trim()) { setFormErr('Customer name is required'); return; }
    setFormErr('');
    addMutation.mutate();
  };

  const needsCourt = courts.length > 0;
  const canSelectDate = !needsCourt || selectedCourt !== null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-700">Manual Bookings (Cash)</h2>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            + Add Booking
          </button>
        )}
      </div>

      {/* ── Booking form ───────────────────────────────────────────────── */}
      {showAdd && (
        <div className="bg-white border border-indigo-100 rounded-xl p-5 mb-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">New Manual Booking</h3>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
          </div>

          {/* Step 1: Court selection */}
          {needsCourt && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">1. Select Court</p>
              <div className="space-y-2">
                {courts.map(court => {
                  const isSel = selectedCourt?.id === court.id;
                  return (
                    <button
                      key={court.id}
                      onClick={() => handleCourtSelect(court)}
                      className={`w-full text-left border-2 rounded-xl p-3 transition-all flex items-center justify-between
                        ${isSel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{court.name}</p>
                        <p className="text-xs text-slate-500">{court.size} · {court.court_type}</p>
                      </div>
                      {isSel && (
                        <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 2: Date selection */}
          {canSelectDate && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {needsCourt ? '2.' : '1.'} Select Date
              </p>
              <AdminCalendar value={date} onChange={handleDateChange} />
              {date && (
                <p className="text-sm text-slate-600 font-medium mt-2">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </section>
          )}

          {/* Step 3: Slot grid */}
          {date && canSelectDate && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                {needsCourt ? '3.' : '2.'} Select Time Slot
              </p>
              <div className="bg-slate-50 rounded-xl p-3">
                <AdminSlotGrid
                  date={date}
                  slots={courtSlots}
                  startTime={startTime}
                  endTime={endTime}
                  booked={bookedSlots}
                  onSelect={handleSlotSelect}
                />
              </div>

              {/* Selection summary bar */}
              {startTime && endTime && (
                <div className="mt-3 flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-sm">
                  <span className="text-indigo-700 font-semibold">{startTime} – {endTime}</span>
                  <span className="text-indigo-500 text-xs">{getDuration()} hr · ₹{totalPrice}</span>
                </div>
              )}
            </section>
          )}

          {/* Step 4: Customer details */}
          {startTime && endTime && (
            <section>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {needsCourt ? '4.' : '3.'} Booking Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Customer Name *</label>
                  <input
                    value={details.customer_name}
                    onChange={e => setDetails(d => ({ ...d, customer_name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs text-slate-500 mb-1">Phone</label>
                  <input
                    value={details.customer_phone}
                    onChange={e => setDetails(d => ({ ...d, customer_phone: e.target.value }))}
                    placeholder="Optional"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={details.total_amount}
                    onChange={e => setDetails(d => ({ ...d, total_amount: e.target.value }))}
                    placeholder={String(totalPrice || 0)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Payment Status</label>
                  <select
                    value={details.payment_status}
                    onChange={e => setDetails(d => ({ ...d, payment_status: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Notes</label>
                  <input
                    value={details.notes}
                    onChange={e => setDetails(d => ({ ...d, notes: e.target.value }))}
                    placeholder="Optional"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {formErr && <p className="text-red-500 text-xs mt-2">{formErr}</p>}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={submitBooking}
                  disabled={addMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addMutation.isPending ? 'Creating…' : 'Create Booking'}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Bookings table ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          No manual bookings yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-medium text-left">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Court</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: ManualBooking) => (
                <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-700">{b.booking_date}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 font-medium">{b.customer_name}</p>
                    {b.customer_phone && <p className="text-slate-400 text-xs">{b.customer_phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{b.court?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">₹{b.total_amount}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge(b.payment_status)}`}>
                      {b.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { if (confirm('Delete this booking?')) deleteMutation.mutate(b.id); }}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
