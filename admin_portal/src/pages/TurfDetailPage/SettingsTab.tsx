import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTurfs, TurfSettings } from '../../api/adminTurfs';

interface Props { turfId: string; isAdmin: boolean; }

type Form = {
  advance_payment_enabled: boolean;
  advance_payment_type: 'percentage' | 'fixed';
  advance_payment_value: string;
  cancellation_enabled: boolean;
  cancellation_window_hours: string;
  cancellation_refund_percentage: string;
  cancellation_notes: string;
  commission_percentage: string;
};

const DEFAULT: Form = {
  advance_payment_enabled: false,
  advance_payment_type: 'percentage',
  advance_payment_value: '50',
  cancellation_enabled: false,
  cancellation_window_hours: '24',
  cancellation_refund_percentage: '100',
  cancellation_notes: '',
  commission_percentage: '0',
};

function settingsToForm(s: TurfSettings | null): Form {
  if (!s) return DEFAULT;
  return {
    advance_payment_enabled: s.advance_payment_enabled,
    advance_payment_type: s.advance_payment_type ?? 'percentage',
    advance_payment_value: String(s.advance_payment_value ?? 50),
    cancellation_enabled: s.cancellation_enabled,
    cancellation_window_hours: String(s.cancellation_window_hours ?? 24),
    cancellation_refund_percentage: String(s.cancellation_refund_percentage ?? 100),
    cancellation_notes: s.cancellation_notes ?? '',
    commission_percentage: String(s.commission_percentage ?? 0),
  };
}

export default function SettingsTab({ turfId, isAdmin }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(DEFAULT);
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['admin-settings', turfId],
    queryFn: () => adminTurfs.getSettings(turfId),
  });

  useEffect(() => {
    if (settings !== undefined) setForm(settingsToForm(settings));
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () => adminTurfs.saveSettings(turfId, {
      advance_payment_enabled: form.advance_payment_enabled,
      advance_payment_type: form.advance_payment_type,
      advance_payment_value: parseFloat(form.advance_payment_value) || 0,
      cancellation_enabled: form.cancellation_enabled,
      cancellation_window_hours: parseInt(form.cancellation_window_hours) || 24,
      cancellation_refund_percentage: parseInt(form.cancellation_refund_percentage) || 100,
      cancellation_notes: form.cancellation_notes || null,
      ...(isAdmin ? { commission_percentage: parseFloat(form.commission_percentage) || 0 } : {}),
    } as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-settings', turfId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (k: keyof Form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="max-w-2xl space-y-5">
      {/* Advance Payment */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-700">Advance Payment</h3>
            <p className="text-slate-400 text-xs mt-0.5">Require partial payment at the time of booking</p>
          </div>
          <Toggle
            value={form.advance_payment_enabled}
            onChange={v => set('advance_payment_enabled', v)}
          />
        </div>

        {form.advance_payment_enabled && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="ap_type" checked={form.advance_payment_type === 'percentage'}
                  onChange={() => set('advance_payment_type', 'percentage')}
                  className="accent-indigo-600" />
                <span className="text-sm text-slate-600">Percentage of total</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="ap_type" checked={form.advance_payment_type === 'fixed'}
                  onChange={() => set('advance_payment_type', 'fixed')}
                  className="accent-indigo-600" />
                <span className="text-sm text-slate-600">Fixed amount (₹)</span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500 w-24">
                {form.advance_payment_type === 'percentage' ? 'Percentage' : 'Amount'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={form.advance_payment_type === 'percentage' ? 10 : 1}
                  max={form.advance_payment_type === 'percentage' ? 100 : undefined}
                  value={form.advance_payment_value}
                  onChange={e => set('advance_payment_value', e.target.value)}
                  className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                />
                <span className="absolute right-3 top-2 text-slate-400 text-sm">
                  {form.advance_payment_type === 'percentage' ? '%' : '₹'}
                </span>
              </div>
              {form.advance_payment_type === 'percentage' && (
                <span className="text-xs text-slate-400">Must be between 10% and 100%</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancellation Policy */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-700">Cancellation Policy</h3>
            <p className="text-slate-400 text-xs mt-0.5">Allow users to cancel and receive a refund</p>
          </div>
          <Toggle
            value={form.cancellation_enabled}
            onChange={v => set('cancellation_enabled', v)}
          />
        </div>

        {form.cancellation_enabled && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500 w-40">Cancel up to</label>
              <input
                type="number" min={1} value={form.cancellation_window_hours}
                onChange={e => set('cancellation_window_hours', e.target.value)}
                className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <span className="text-sm text-slate-400">hours before booking</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500 w-40">Refund</label>
              <input
                type="number" min={0} max={100} value={form.cancellation_refund_percentage}
                onChange={e => set('cancellation_refund_percentage', e.target.value)}
                className="w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <span className="text-sm text-slate-400">% of total paid</span>
            </div>
            <div className="flex items-start gap-3">
              <label className="text-sm text-slate-500 w-40 mt-2">Policy notes</label>
              <textarea
                rows={2}
                value={form.cancellation_notes}
                onChange={e => set('cancellation_notes', e.target.value)}
                placeholder="Shown to users before booking..."
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Commission (admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-700 mb-1">Commission</h3>
          <p className="text-slate-400 text-xs mb-4">Platform commission on all bookings at this turf (admin-only setting)</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500 w-36">Commission rate</label>
            <div className="relative">
              <input
                type="number" min={0} max={100} step={0.5} value={form.commission_percentage}
                onChange={e => set('commission_percentage', e.target.value)}
                className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <span className="absolute right-3 top-2 text-slate-400 text-sm">%</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">Saved!</span>}
        {mutation.isError && <span className="text-red-500 text-sm">Save failed</span>}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );
}
