import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminTurfs, Court, Turf } from '../../api/adminTurfs';
import SlotMatrix from './SlotMatrix';

interface Props { turfId: string; turf: Turf; }

const SIZES = ['5-a-side', '7-a-side', '11-a-side', 'Singles', 'Doubles', 'Standard', 'Half Court', 'Full Court'];
const TYPES = ['Artificial Turf', 'Natural Grass', 'Wooden', 'Hard Court', 'Clay', 'Synthetic'];

type CourtForm = { name: string; size: string; court_type: string; description: string };
const emptyForm: CourtForm = { name: '', size: '5-a-side', court_type: 'Artificial Turf', description: '' };

export default function CourtsTab({ turfId, turf }: Props) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editCourt, setEditCourt] = useState<Court | null>(null);
  const [form, setForm] = useState<CourtForm>(emptyForm);
  const [activeSlotsCourtId, setActiveSlotsCourtId] = useState<string | null>(null);
  const [formErr, setFormErr] = useState('');

  const { data: courts = [], isLoading } = useQuery({
    queryKey: ['admin-courts', turfId],
    queryFn: () => adminTurfs.listCourts(turfId),
  });

  const activeCourt = courts.find(c => c.id === activeSlotsCourtId);

  const { data: slots = [] } = useQuery({
    queryKey: ['admin-slots', turfId, activeSlotsCourtId],
    queryFn: () => adminTurfs.getSlots(turfId, activeSlotsCourtId!),
    enabled: !!activeSlotsCourtId,
  });

  const addMutation = useMutation({
    mutationFn: () => adminTurfs.addCourt(turfId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courts', turfId] });
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: () => setFormErr('Failed to add court'),
  });

  const updateMutation = useMutation({
    mutationFn: () => adminTurfs.updateCourt(turfId, editCourt!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courts', turfId] });
      setEditCourt(null);
    },
    onError: () => setFormErr('Failed to update court'),
  });

  const deleteMutation = useMutation({
    mutationFn: (courtId: string) => adminTurfs.deleteCourt(turfId, courtId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courts', turfId] });
      if (activeSlotsCourtId) setActiveSlotsCourtId(null);
    },
  });

  const openAdd = () => { setForm(emptyForm); setFormErr(''); setEditCourt(null); setShowAdd(true); };
  const openEdit = (c: Court) => {
    setEditCourt(c);
    setForm({ name: c.name, size: c.size, court_type: c.court_type, description: c.description ?? '' });
    setFormErr('');
    setShowAdd(false);
  };

  const submitForm = () => {
    if (!form.name.trim()) { setFormErr('Court name is required'); return; }
    if (editCourt) updateMutation.mutate();
    else addMutation.mutate();
  };

  const CourtFormPanel = () => (
    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 mb-4">
      <h3 className="font-medium text-slate-700 mb-4">{editCourt ? 'Edit Court' : 'Add Court'}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Court Name</label>
          <input
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            placeholder="e.g. Court A"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Size</label>
          <select
            value={form.size}
            onChange={e => setForm(p => ({ ...p, size: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          >
            {SIZES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Surface Type</label>
          <select
            value={form.court_type}
            onChange={e => setForm(p => ({ ...p, court_type: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
          >
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Description (optional)</label>
          <input
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            placeholder="Any notes about this court"
          />
        </div>
      </div>

      {formErr && <p className="text-red-500 text-xs mt-2">{formErr}</p>}

      <div className="flex gap-2 mt-4">
        <button
          onClick={submitForm}
          disabled={addMutation.isPending || updateMutation.isPending}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {addMutation.isPending || updateMutation.isPending ? 'Saving…' : editCourt ? 'Update Court' : 'Add Court'}
        </button>
        <button
          onClick={() => { setShowAdd(false); setEditCourt(null); }}
          className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-700">Courts & Time Slots</h2>
        <button onClick={openAdd} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          + Add Court
        </button>
      </div>

      {(showAdd || editCourt) && <CourtFormPanel />}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-16 bg-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : courts.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          No courts yet. Add a court to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {courts.map(court => (
            <div key={court.id}>
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800">{court.name}</p>
                  <p className="text-slate-400 text-sm">{court.size} · {court.court_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveSlotsCourtId(activeSlotsCourtId === court.id ? null : court.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                      activeSlotsCourtId === court.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    {activeSlotsCourtId === court.id ? 'Hide Slots' : 'Manage Slots'}
                  </button>
                  <button
                    onClick={() => openEdit(court)}
                    className="text-xs text-slate-500 hover:text-indigo-600 px-2 py-1.5"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${court.name}"?`)) deleteMutation.mutate(court.id); }}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {activeSlotsCourtId === court.id && activeCourt && (
                <SlotMatrix
                  turfId={turfId}
                  courtId={court.id}
                  courtName={court.name}
                  openingTime={turf.opening_time}
                  closingTime={turf.closing_time}
                  initialSlots={slots}
                  onClose={() => setActiveSlotsCourtId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
