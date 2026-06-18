import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ownerTurfsApi } from '../../../api/endpoints/ownerTurfs';
import { courtsApi, Court, TimeSlot } from '../../../api/endpoints/courts';
import { sportsApi } from '../../../api/endpoints/sports';
import { uploadTurfPhoto, deleteTurfPhoto } from '../../../lib/supabaseStorage';

// ─── Styles ──────────────────────────────────────────────────────────────────
const inputCls =
  'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white';
const labelCls = 'text-sm font-medium text-slate-700 mb-1 block';
const errCls = 'text-red-500 text-xs mt-1';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PhotoItem {
  url: string;
  loading: boolean;
  file?: File;
  tempKey: string;
}

interface CourtDraft extends Court {
  _id: string; // local id for keying
}

interface TimeSlotDraft extends TimeSlot {
  _id: string;
  days: number[]; // selected days
}

interface FormData {
  // Step 1
  name: string;
  sport_id: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  contact_number: string;
  turf_email: string;
  // Step 2
  opening_time: string;
  closing_time: string;
  capacity: string;
  // Step 3
  courts: CourtDraft[];
  // Step 4
  photos: PhotoItem[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COURT_SIZES = ['5-a-side', '7-a-side', '11-a-side', 'Singles', 'Doubles', 'Standard', 'Other'];
const SURFACE_TYPES = [
  'Natural Grass',
  'Artificial Turf',
  'Hard Court',
  'Clay',
  'Wooden',
  'Concrete',
  'Indoor',
];

function uid() {
  return Math.random().toString(36).slice(2);
}

function emptySlot(): TimeSlotDraft {
  return {
    _id: uid(),
    days: [1, 2, 3, 4, 5],
    day_of_week: 0,
    start_time: '09:00',
    end_time: '10:00',
    price_per_slot: 0,
    slot_duration_minutes: 60,
  };
}

function emptyCourt(idx: number): CourtDraft {
  return {
    _id: uid(),
    name: `Court ${String.fromCharCode(65 + idx)}`,
    size: '5-a-side',
    court_type: 'Artificial Turf',
    description: '',
    sort_order: idx,
    slots: [emptySlot() as unknown as TimeSlot],
  };
}

// ─── Step Progress Bar ───────────────────────────────────────────────────────
function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step - 1;
        const active = i === step - 1;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done
                  ? 'bg-emerald-500 text-white'
                  : active
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {done ? '✓' : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`w-6 h-0.5 ${i < step - 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Time Slot Row ───────────────────────────────────────────────────────────
function SlotRow({
  slot,
  onChange,
  onRemove,
  showRemove,
}: {
  slot: TimeSlotDraft;
  onChange: (updated: TimeSlotDraft) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  const set = (key: keyof TimeSlotDraft, val: unknown) =>
    onChange({ ...slot, [key]: val });

  const toggleDay = (d: number) => {
    const days = slot.days.includes(d) ? slot.days.filter((x) => x !== d) : [...slot.days, d];
    onChange({ ...slot, days });
  };

  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
      {/* Day badges */}
      <div className="flex flex-wrap gap-1">
        {DAYS.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleDay(i)}
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
              slot.days.includes(i)
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      {/* Time + price row */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Start</p>
          <input
            type="time"
            value={slot.start_time}
            onChange={(e) => set('start_time', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">End</p>
          <input
            type="time"
            value={slot.end_time}
            onChange={(e) => set('end_time', e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Price (₹)</p>
          <input
            type="number"
            min="0"
            value={slot.price_per_slot || ''}
            onChange={(e) => set('price_per_slot', Number(e.target.value))}
            placeholder="500"
            className={inputCls}
          />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Duration (min)</p>
          <select
            value={slot.slot_duration_minutes}
            onChange={(e) => set('slot_duration_minutes', Number(e.target.value))}
            className={inputCls}
          >
            <option value={60}>60 min</option>
            <option value={90}>90 min</option>
            <option value={120}>120 min</option>
          </select>
        </div>
      </div>
      {showRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 text-xs hover:text-red-600"
        >
          Remove slot
        </button>
      )}
    </div>
  );
}

// ─── Court Card ──────────────────────────────────────────────────────────────
function CourtCard({
  court,
  index,
  onUpdate,
  onRemove,
  errors,
}: {
  court: CourtDraft;
  index: number;
  onUpdate: (c: CourtDraft) => void;
  onRemove: () => void;
  errors: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(true);

  const slots = (court.slots ?? []) as TimeSlotDraft[];

  const updateSlot = (slotId: string, updated: TimeSlotDraft) => {
    const newSlots = slots.map((s) => (s._id === slotId ? updated : s));
    onUpdate({ ...court, slots: newSlots as unknown as TimeSlot[] });
  };

  const addSlot = () => {
    onUpdate({ ...court, slots: [...slots, emptySlot()] as unknown as TimeSlot[] });
  };

  const removeSlot = (slotId: string) => {
    onUpdate({ ...court, slots: slots.filter((s) => s._id !== slotId) as unknown as TimeSlot[] });
  };

  const set = (key: keyof CourtDraft, val: unknown) => onUpdate({ ...court, [key]: val });

  return (
    <div className="border-l-4 border-emerald-500 bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50"
      >
        <div className="text-left">
          <p className="font-semibold text-slate-800 text-sm">
            Court {index + 1}: {court.name || '(unnamed)'}
          </p>
          <p className="text-xs text-slate-400">
            {court.size} • {court.court_type} • {slots.length} slot(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200"
          >
            Remove
          </button>
          <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Court Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={court.name}
                onChange={(e) => set('name', e.target.value)}
                className={inputCls}
                placeholder="Court A"
              />
              {errors[`court_${court._id}_name`] && (
                <p className={errCls}>{errors[`court_${court._id}_name`]}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>
                Court Size <span className="text-red-500">*</span>
              </label>
              <select
                value={court.size}
                onChange={(e) => set('size', e.target.value)}
                className={inputCls}
              >
                {COURT_SIZES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>
              Surface Type <span className="text-red-500">*</span>
            </label>
            <select
              value={court.court_type}
              onChange={(e) => set('court_type', e.target.value)}
              className={inputCls}
            >
              {SURFACE_TYPES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={court.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Optional notes about this court..."
            />
          </div>

          {/* Time Slots */}
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">
              Time Slots <span className="text-red-500">*</span>
            </p>
            {errors[`court_${court._id}_slots`] && (
              <p className={errCls}>{errors[`court_${court._id}_slots`]}</p>
            )}
            <div className="space-y-2">
              {slots.map((slot) => (
                <SlotRow
                  key={slot._id}
                  slot={slot}
                  onChange={(u) => updateSlot(slot._id, u)}
                  onRemove={() => removeSlot(slot._id)}
                  showRemove={slots.length > 1}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addSlot}
              className="mt-2 text-emerald-600 text-xs font-semibold hover:text-emerald-700"
            >
              + Add Time Slot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AddTurfPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const TEMP_TURF_ID = useRef(`temp-${Date.now()}`);

  const [form, setForm] = useState<FormData>({
    name: '',
    sport_id: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    contact_number: '',
    turf_email: '',
    opening_time: '06:00',
    closing_time: '22:00',
    capacity: '22',
    courts: [emptyCourt(0)],
    photos: [],
  });

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  const showToast = (msg: string, dur = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(''), dur);
  };

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateStep = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.name.trim()) errs.name = 'Turf name is required';
      if (!form.contact_number.trim()) errs.contact_number = 'Contact number is required';
      else if (!/^[6-9]\d{9}$/.test(form.contact_number.replace(/\s+/g, '')))
        errs.contact_number = 'Enter a valid 10-digit Indian mobile number';
      if (!form.turf_email.trim()) errs.turf_email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.turf_email))
        errs.turf_email = 'Enter a valid email address';
      if (!form.address.trim()) errs.address = 'Address is required';
      if (!form.city.trim()) errs.city = 'City is required';
      if (!form.sport_id) errs.sport_id = 'Please select a sport';
    }
    if (s === 2) {
      if (!form.opening_time) errs.opening_time = 'Opening time is required';
      if (!form.closing_time) errs.closing_time = 'Closing time is required';
      if (form.opening_time && form.closing_time && form.opening_time >= form.closing_time)
        errs.closing_time = 'Closing time must be after opening time';
    }
    if (s === 3) {
      if (form.courts.length === 0) errs.courts = 'Add at least one court';
      form.courts.forEach((c) => {
        if (!c.name.trim()) errs[`court_${c._id}_name`] = 'Court name is required';
        const slots = (c.slots ?? []) as TimeSlotDraft[];
        if (slots.length === 0) errs[`court_${c._id}_slots`] = 'Add at least one time slot';
        slots.forEach((sl) => {
          if (sl.days.length === 0) errs[`court_${c._id}_slots`] = 'Select at least one day per slot';
        });
      });
    }
    if (s === 4) {
      const uploaded = form.photos.filter((p) => !p.loading && p.url);
      if (uploaded.length < 5) errs.photos = 'Please upload at least 5 photos of your courts';
    }
    return errs;
  };

  const goNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  // ── Photo Upload ────────────────────────────────────────────────────────────
  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    const newFiles = Array.from(files).filter((f) => {
      if (!allowed.includes(f.type)) {
        showToast(`${f.name}: unsupported format`);
        return false;
      }
      if (f.size > maxSize) {
        showToast(`${f.name}: exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    const placeholders: PhotoItem[] = newFiles.map((f) => ({
      url: '',
      loading: true,
      file: f,
      tempKey: uid(),
    }));

    set('photos', [...form.photos, ...placeholders]);

    for (const [i, f] of newFiles.entries()) {
      const tempKey = placeholders[i].tempKey;
      try {
        const url = await uploadTurfPhoto(f, TEMP_TURF_ID.current);
        setForm((prev) => ({
          ...prev,
          photos: prev.photos.map((p) => (p.tempKey === tempKey ? { ...p, url, loading: false } : p)),
        }));
      } catch {
        setForm((prev) => ({
          ...prev,
          photos: prev.photos.filter((p) => p.tempKey !== tempKey),
        }));
        showToast(`Failed to upload ${f.name}`);
      }
    }
  };

  const removePhoto = async (idx: number) => {
    const photo = form.photos[idx];
    if (photo.url) {
      await deleteTurfPhoto(photo.url).catch(() => {});
    }
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateStep(5);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create turf
      const turf = await ownerTurfsApi.createTurf({
        name: form.name.trim(),
        sport_id: form.sport_id,
        description: form.description.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        country: form.country.trim() || 'India',
        contact_number: form.contact_number.trim(),
        turf_email: form.turf_email.trim(),
        opening_time: form.opening_time,
        closing_time: form.closing_time,
        capacity: Number(form.capacity),
        is_public: true,
      });

      const turfId = turf.id;

      // 2. Create courts with slots
      for (const [i, c] of form.courts.entries()) {
        const slots = (c.slots ?? []) as TimeSlotDraft[];
        // Expand days into individual slot records
        const expandedSlots: TimeSlot[] = slots.flatMap((sl) =>
          sl.days.map((d) => ({
            day_of_week: d,
            start_time: sl.start_time,
            end_time: sl.end_time,
            price_per_slot: sl.price_per_slot,
            slot_duration_minutes: sl.slot_duration_minutes,
          }))
        );
        await courtsApi.createCourt({
          turf_id: turfId,
          name: c.name,
          size: c.size,
          court_type: c.court_type,
          description: c.description,
          sort_order: i,
          slots: expandedSlots,
        });
      }

      // 3. Save photos to turf_photos via edge function (service role bypasses RLS)
      const uploadedPhotos = form.photos.filter((p) => !p.loading && p.url);
      if (uploadedPhotos.length > 0) {
        await ownerTurfsApi.savePhotos(
          turfId,
          uploadedPhotos.map((p, i) => ({ url: p.url, is_primary: i === 0, sort_order: i }))
        );
      }

      queryClient.invalidateQueries({ queryKey: ['my-turfs'] });
      showToast('Turf listed successfully!');
      setTimeout(() => navigate(`/owner/turfs/${turfId}`), 1000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create turf. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open hours display ──────────────────────────────────────────────────────
  const openHours = (() => {
    if (!form.opening_time || !form.closing_time) return null;
    const [oh, om] = form.opening_time.split(':').map(Number);
    const [ch, cm] = form.closing_time.split(':').map(Number);
    const total = (ch * 60 + cm) - (oh * 60 + om);
    if (total <= 0) return null;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  })();

  const stepLabels = ['Details', 'Timing', 'Courts', 'Photos', 'Review'];

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 px-5 pt-6 pb-4 text-white">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => (step === 1 ? navigate(-1) : goBack())}
            className="w-9 h-9 bg-black/20 rounded-full flex items-center justify-center text-lg"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-extrabold">List a New Turf</h1>
            <p className="text-emerald-100 text-xs">
              Step {step} of 5 — {stepLabels[step - 1]}
            </p>
          </div>
        </div>
        <StepBar step={step} total={5} />
      </div>

      <div className="px-5 py-6">
        {/* ── Step 1: Turf Details ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Turf Details</h2>

            <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm">
              <div>
                <label className={labelCls}>
                  Turf Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Green Field Arena"
                  className={inputCls}
                />
                {errors.name && <p className={errCls}>{errors.name}</p>}
              </div>

              <div>
                <label className={labelCls}>
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={form.contact_number}
                  onChange={(e) => set('contact_number', e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className={inputCls}
                />
                {errors.contact_number && <p className={errCls}>{errors.contact_number}</p>}
              </div>

              <div>
                <label className={labelCls}>
                  Email ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.turf_email}
                  onChange={(e) => set('turf_email', e.target.value)}
                  placeholder="turf@example.com"
                  className={inputCls}
                />
                {errors.turf_email && <p className={errCls}>{errors.turf_email}</p>}
              </div>

              <div>
                <label className={labelCls}>
                  Full Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Street / Area"
                  className={inputCls}
                />
                {errors.address && <p className={errCls}>{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="Bengaluru"
                    className={inputCls}
                  />
                  {errors.city && <p className={errCls}>{errors.city}</p>}
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                    placeholder="Karnataka"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Sport <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.sport_id}
                  onChange={(e) => set('sport_id', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select a sport</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.sport_id && <p className={errCls}>{errors.sport_id}</p>}
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  placeholder="Describe your turf facilities, amenities..."
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Timing & Pricing ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Timing & Pricing</h2>

            <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>
                    Opening Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.opening_time}
                    onChange={(e) => set('opening_time', e.target.value)}
                    className={inputCls}
                  />
                  {errors.opening_time && <p className={errCls}>{errors.opening_time}</p>}
                </div>
                <div>
                  <label className={labelCls}>
                    Closing Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={form.closing_time}
                    onChange={(e) => set('closing_time', e.target.value)}
                    className={inputCls}
                  />
                  {errors.closing_time && <p className={errCls}>{errors.closing_time}</p>}
                </div>
              </div>

              {openHours && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <span className="text-emerald-600 text-lg">⏰</span>
                  <p className="text-sm text-emerald-700 font-medium">
                    Turf will be open for <span className="font-bold">{openHours}</span> per day
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ── Step 3: Courts ───────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Courts</h2>
              <button
                type="button"
                onClick={() =>
                  set('courts', [...form.courts, emptyCourt(form.courts.length)])
                }
                className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-600 transition-colors"
              >
                + Add Court
              </button>
            </div>

            {errors.courts && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {errors.courts}
              </div>
            )}

            {form.courts.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">No courts added yet</p>
                <p className="text-slate-300 text-xs mt-1">Click "+ Add Court" to get started</p>
              </div>
            )}

            <div className="space-y-3">
              {form.courts.map((c, i) => (
                <CourtCard
                  key={c._id}
                  court={c}
                  index={i}
                  onUpdate={(updated) =>
                    set(
                      'courts',
                      form.courts.map((x) => (x._id === updated._id ? updated : x))
                    )
                  }
                  onRemove={() =>
                    set(
                      'courts',
                      form.courts.filter((x) => x._id !== c._id)
                    )
                  }
                  errors={errors}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: Photos ───────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Photos</h2>

            {/* Upload zone */}
            <div
              className="border-2 border-dashed border-emerald-300 bg-white rounded-2xl p-8 text-center cursor-pointer hover:bg-emerald-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelect(e.dataTransfer.files);
              }}
            >
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP • Max 5MB per photo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {/* Counter */}
            <div className="flex items-center gap-2">
              {form.photos.filter((p) => !p.loading && p.url).length >= 5 ? (
                <span className="text-emerald-600 font-semibold text-sm">
                  ✓ {form.photos.filter((p) => !p.loading && p.url).length} photos uploaded
                </span>
              ) : (
                <span className="text-slate-500 text-sm">
                  {form.photos.filter((p) => !p.loading && p.url).length}/5+ photos uploaded
                </span>
              )}
            </div>

            {errors.photos && <p className={errCls}>{errors.photos}</p>}

            {/* Photo grid */}
            {form.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {form.photos.map((photo, i) => (
                  <div key={photo.tempKey} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                    {photo.loading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        <img
                          src={photo.url}
                          alt={`Turf photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {i === 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 5: Review & Submit ──────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Review & Submit</h2>
            <p className="text-sm text-slate-500">
              Review your turf details before publishing.
            </p>

            {/* Turf Info */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                Turf Info
              </h3>
              <Row label="Name" value={form.name} />
              <Row label="Contact" value={form.contact_number} />
              <Row label="Email" value={form.turf_email} />
              <Row label="Address" value={`${form.address}, ${form.city}${form.state ? ', ' + form.state : ''}, ${form.country}`} />
              <Row label="Sport" value={sports.find((s) => s.id === form.sport_id)?.name ?? '—'} />
              {form.description && <Row label="Description" value={form.description} />}
            </div>

            {/* Timing */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                Timing & Pricing
              </h3>
              <Row label="Opening" value={form.opening_time} />
              <Row label="Closing" value={form.closing_time} />
              {openHours && <Row label="Open Hours" value={`${openHours}/day`} />}
            </div>

            {/* Courts */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                Courts ({form.courts.length})
              </h3>
              {form.courts.map((c, i) => (
                <div key={c._id} className="border-l-4 border-emerald-400 pl-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {i + 1}. {c.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {c.size} • {c.court_type} •{' '}
                    {(c.slots ?? []).length} slot(s)
                  </p>
                </div>
              ))}
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
                Photos ({form.photos.filter((p) => !p.loading && p.url).length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {form.photos
                  .filter((p) => !p.loading && p.url)
                  .slice(0, 6)
                  .map((p, i) => (
                    <div key={p.tempKey} className="aspect-square rounded-lg overflow-hidden">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="sr-only">Primary</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                {errors.submit}
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-sm text-base transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Listing your turf...
                </span>
              ) : (
                'Confirm & List Turf'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav Buttons (steps 1-4) */}
      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-2xl hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <p className="text-xs text-slate-400 flex-shrink-0">{label}</p>
      <p className="text-sm text-slate-700 font-medium text-right">{value}</p>
    </div>
  );
}
