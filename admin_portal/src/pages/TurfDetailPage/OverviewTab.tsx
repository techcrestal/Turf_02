import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTurfs, Turf } from '../../api/adminTurfs';

interface Props { turf: Turf; turfId: string; }

type FormData = {
  name: string; address: string; city: string; state: string;
  contact_number: string; turf_email: string;
  opening_time: string; closing_time: string; status: string;
};

export default function OverviewTab({ turf, turfId }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: turf.name, address: turf.address, city: turf.city, state: turf.state,
    contact_number: turf.contact_number, turf_email: turf.turf_email,
    opening_time: turf.opening_time, closing_time: turf.closing_time, status: turf.status,
  });
  const [saveErr, setSaveErr] = useState('');

  const mutation = useMutation({
    mutationFn: (data: FormData) => adminTurfs.update(turfId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-turf', turfId] });
      qc.invalidateQueries({ queryKey: ['admin-turfs'] });
      setEditing(false);
    },
    onError: () => setSaveErr('Failed to save changes'),
  });

  const set = (k: keyof FormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-700">Turf Information</h2>
          <button onClick={() => setEditing(true)} className="text-sm text-indigo-600 font-medium hover:text-indigo-800">
            Edit
          </button>
        </div>
        <dl className="space-y-3">
          {[
            ['Name', turf.name], ['Address', turf.address],
            ['City', turf.city], ['State', turf.state],
            ['Phone', turf.contact_number], ['Email', turf.turf_email],
            ['Opens', turf.opening_time], ['Closes', turf.closing_time],
            ['Status', turf.status],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-4 text-sm">
              <dt className="w-28 text-slate-400 flex-shrink-0">{label}</dt>
              <dd className="text-slate-700 capitalize">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <h2 className="font-semibold text-slate-700 mb-5">Edit Turf Information</h2>
      <div className="space-y-4">
        {([
          ['Name', 'name', 'text'],
          ['Address', 'address', 'text'],
          ['City', 'city', 'text'],
          ['State', 'state', 'text'],
          ['Phone', 'contact_number', 'tel'],
          ['Email', 'turf_email', 'email'],
          ['Opens', 'opening_time', 'time'],
          ['Closes', 'closing_time', 'time'],
        ] as [string, keyof FormData, string][]).map(([label, key, type]) => (
          <div key={key} className="flex items-center gap-4">
            <label className="w-28 text-sm text-slate-500 flex-shrink-0">{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={e => set(key, e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
        ))}
        <div className="flex items-center gap-4">
          <label className="w-28 text-sm text-slate-500 flex-shrink-0">Status</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {saveErr && <p className="text-red-500 text-sm mt-3">{saveErr}</p>}

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => mutation.mutate(form)}
          disabled={mutation.isPending}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-5 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
