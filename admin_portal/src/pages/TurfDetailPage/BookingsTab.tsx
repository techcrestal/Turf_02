import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTurfs, ManualBooking } from '../../api/adminTurfs';

interface Props { turfId: string; }

type BookingForm = {
  court_id: string; booking_date: string; start_time: string; end_time: string;
  customer_name: string; customer_phone: string; total_amount: string; payment_status: string; notes: string;
};

const emptyForm: BookingForm = {
  court_id: '', booking_date: '', start_time: '', end_time: '',
  customer_name: '', customer_phone: '', total_amount: '', payment_status: 'paid', notes: '',
};

const statusBadge = (s: string) => ({
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  refunded: 'bg-red-100 text-red-700',
}[s] ?? 'bg-slate-100 text-slate-500');

export default function BookingsTab({ turfId }: Props) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [formErr, setFormErr] = useState('');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-bookings', turfId],
    queryFn: () => adminTurfs.listBookings(turfId),
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['admin-courts', turfId],
    queryFn: () => adminTurfs.listCourts(turfId),
  });

  const addMutation = useMutation({
    mutationFn: () => adminTurfs.createBooking(turfId, {
      court_id: form.court_id || null,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      total_amount: parseFloat(form.total_amount) || 0,
      payment_status: form.payment_status,
      notes: form.notes || null,
    } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bookings', turfId] });
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: () => setFormErr('Failed to create booking'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminTurfs.deleteBooking(turfId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings', turfId] }),
  });

  const submitForm = () => {
    if (!form.booking_date || !form.start_time || !form.end_time || !form.customer_name.trim()) {
      setFormErr('Date, time range and customer name are required');
      return;
    }
    setFormErr('');
    addMutation.mutate();
  };

  const set = (k: keyof BookingForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-700">Manual Bookings (Cash)</h2>
        <button
          onClick={() => { setShowAdd(true); setForm(emptyForm); setFormErr(''); }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          + Add Booking
        </button>
      </div>

      {showAdd && (
        <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 mb-5">
          <h3 className="font-medium text-slate-700 mb-4">New Manual Booking</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-slate-500 mb-1">Customer Name *</label>
              <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" placeholder="Full name" />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-xs text-slate-500 mb-1">Phone</label>
              <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Court</label>
              <select value={form.court_id} onChange={e => set('court_id', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
                <option value="">— Any court —</option>
                {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Booking Date *</label>
              <input type="date" value={form.booking_date} onChange={e => set('booking_date', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Time *</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Time *</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Amount (₹)</label>
              <input type="number" min={0} value={form.total_amount} onChange={e => set('total_amount', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Payment Status</label>
              <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Notes</label>
              <input value={form.notes} onChange={e => set('notes', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" placeholder="Optional notes" />
            </div>
          </div>
          {formErr && <p className="text-red-500 text-xs mt-2">{formErr}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={submitForm} disabled={addMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {addMutation.isPending ? 'Creating…' : 'Create Booking'}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

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
