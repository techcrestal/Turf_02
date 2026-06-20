import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminTurfs, ReportBooking } from '../api/adminTurfs';
import { useAdminAuth } from '../context/AdminAuthContext';

// ── Date helpers ─────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function lastMonthRange(): [string, string] {
  const d = new Date();
  const y = d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear();
  const m = d.getMonth() === 0 ? 12 : d.getMonth();
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const end = new Date(y, m, 0).toISOString().slice(0, 10);
  return [start, end];
}

type Period = 'today' | 'week' | 'month' | 'last_month' | 'custom';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Last 7 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
];

function periodDates(p: Period, customStart: string, customEnd: string): [string, string] {
  const t = todayStr();
  switch (p) {
    case 'today':      return [t, t];
    case 'week':       return [daysAgo(6), t];
    case 'month':      return [monthStart(), t];
    case 'last_month': return lastMonthRange();
    default:           return [customStart || monthStart(), customEnd || t];
  }
}

// ── Status / payment normalisation ───────────────────────────────────────────

function displayPayStatus(ps: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    paid:      { label: 'Paid',     cls: 'bg-green-100 text-green-700' },
    completed: { label: 'Paid',     cls: 'bg-green-100 text-green-700' },
    partial:   { label: 'Partial',  cls: 'bg-amber-100 text-amber-700' },
    pending:   { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-700' },
    refunded:  { label: 'Refunded', cls: 'bg-red-100 text-red-600' },
  };
  return map[ps] ?? { label: ps, cls: 'bg-slate-100 text-slate-500' };
}

function displayStatus(s: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
    pending:   { label: 'Pending',   cls: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
    completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600' },
  };
  return map[s] ?? { label: s, cls: 'bg-slate-100 text-slate-500' };
}

function fmtDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

// ── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(rows: ReportBooking[], isAdmin: boolean) {
  const headers = [
    'Date', 'Time', ...(isAdmin ? ['Turf'] : []), 'Court', 'Customer', 'Phone',
    'Type', 'Amount', 'Payment', 'Status', ...(isAdmin ? ['Commission'] : []),
  ];
  const lines = rows.map(b => {
    const { date, time } = fmtDateTime(b.start_time);
    return [
      date, time,
      ...(isAdmin ? [b.turf_name] : []),
      b.court_name, b.customer_name, b.customer_phone ?? '',
      b.booking_type === 'online' ? 'Online' : 'Cash',
      b.amount, b.payment_status, b.status,
      ...(isAdmin ? [b.commission_amount] : []),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bookings_report.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'administrator';

  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [filterTurf, setFilterTurf] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  const [start, end] = periodDates(period, customStart, customEnd);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-report', start, end, filterTurf],
    queryFn: () => adminTurfs.getReport({ start, end, turf_id: filterTurf || undefined }),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const allBookings = data?.bookings ?? [];
  const turfs = data?.turfs ?? [];

  // Client-side status / payment filter
  const rows = useMemo(() => {
    return allBookings.filter(b => {
      if (filterStatus) {
        if (filterStatus === 'active' && b.status === 'cancelled') return false;
        if (filterStatus === 'cancelled' && b.status !== 'cancelled') return false;
      }
      if (filterPayment) {
        const isPaid = ['paid', 'completed'].includes(b.payment_status);
        if (filterPayment === 'paid' && !isPaid) return false;
        if (filterPayment === 'partial' && b.payment_status !== 'partial') return false;
        if (filterPayment === 'pending' && b.payment_status !== 'pending') return false;
        if (filterPayment === 'refunded' && b.payment_status !== 'refunded') return false;
      }
      return true;
    });
  }, [allBookings, filterStatus, filterPayment]);

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Booking Reports</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAdmin ? 'All turfs overview' : 'Your turf performance'}
          </p>
        </div>
        <button
          onClick={() => exportCSV(rows, isAdmin)}
          disabled={rows.length === 0}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2"
        >
          ↓ Export CSV
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              period === p.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400" />
            <span className="text-slate-400 text-sm">→</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
        )}
        {isFetching && (
          <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin ml-2" />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {isAdmin && turfs.length > 0 && (
          <select value={filterTurf} onChange={e => setFilterTurf(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 bg-white">
            <option value="">All Turfs</option>
            {turfs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">All Payments</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial (advance paid)</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
        </select>
        {(filterStatus || filterPayment || filterTurf) && (
          <button onClick={() => { setFilterStatus(''); setFilterPayment(''); setFilterTurf(''); }}
            className="text-xs text-indigo-500 hover:text-indigo-700">
            Clear filters
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{rows.length} bookings</span>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            label="Total Bookings"
            value={String(summary.total_bookings)}
            sub={`${summary.confirmed_bookings} active`}
            color="border-slate-200 bg-white text-slate-800"
          />
          <SummaryCard
            label="Total Revenue"
            value={`₹${summary.total_revenue.toLocaleString('en-IN')}`}
            sub={`Online ₹${summary.online_revenue.toLocaleString('en-IN')} · Cash ₹${summary.cash_revenue.toLocaleString('en-IN')}`}
            color="border-emerald-200 bg-emerald-50 text-emerald-800"
          />
          <SummaryCard
            label="Pending Amount"
            value={`₹${summary.pending_amount.toLocaleString('en-IN')}`}
            sub="Unpaid + partial balance"
            color="border-amber-200 bg-amber-50 text-amber-800"
          />
          {isAdmin ? (
            <SummaryCard
              label="Commission Earned"
              value={`₹${summary.commission_amount.toLocaleString('en-IN')}`}
              sub="Platform earnings"
              color="border-indigo-200 bg-indigo-50 text-indigo-800"
            />
          ) : (
            <SummaryCard
              label="Cash Revenue"
              value={`₹${summary.cash_revenue.toLocaleString('en-IN')}`}
              sub="Manual / walk-in"
              color="border-violet-200 bg-violet-50 text-violet-800"
            />
          )}
        </div>
      ) : null}

      {/* Bookings table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          No bookings found for the selected period.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 font-semibold text-left">
                <th className="px-4 py-3">Date & Time</th>
                {isAdmin && <th className="px-4 py-3">Turf</th>}
                <th className="px-4 py-3">Court</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3">Commission</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(b => {
                const { date, time } = fmtDateTime(b.start_time);
                const ps = displayPayStatus(b.payment_status);
                const st = displayStatus(b.status);
                const isOnline = b.booking_type === 'online';
                return (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="text-slate-700 font-medium">{date}</p>
                      <p className="text-slate-400 text-xs">{time}</p>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[120px] truncate">{b.turf_name}</td>
                    )}
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.court_name}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700 font-medium">{b.customer_name}</p>
                      {b.customer_phone && <p className="text-slate-400 text-xs">{b.customer_phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isOnline ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isOnline ? 'Online' : 'Cash'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 font-semibold">₹{b.amount.toLocaleString('en-IN')}</p>
                      {b.advance_amount != null && b.advance_amount < b.amount && (
                        <p className="text-xs text-amber-600">Adv: ₹{b.advance_amount}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ps.cls}`}>
                        {ps.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-indigo-700 font-medium text-xs">
                        {b.commission_amount > 0 ? `₹${b.commission_amount.toFixed(2)}` : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-semibold text-slate-600">
                <td className="px-4 py-3" colSpan={isAdmin ? 5 : 4}>
                  Totals ({rows.length} bookings)
                </td>
                <td className="px-4 py-3 text-slate-800 font-bold">
                  ₹{rows.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.amount, 0).toLocaleString('en-IN')}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3" />
                {isAdmin && (
                  <td className="px-4 py-3 text-indigo-700 font-bold">
                    ₹{rows.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.commission_amount, 0).toFixed(2)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
