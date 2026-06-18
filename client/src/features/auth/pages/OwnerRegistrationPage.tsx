import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sportsApi } from '../../../api/endpoints/sports';
import { authApi } from '../../../api/endpoints/auth';
import { uploadTurfPhoto, deleteTurfPhoto } from '../../../lib/supabaseStorage';

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white';
const labelCls = 'text-sm font-medium text-slate-700 mb-1 block';
const errCls = 'text-red-500 text-xs mt-1';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COURT_SIZES = ['5-a-side', '7-a-side', '11-a-side', 'Singles', 'Doubles', 'Standard', 'Other'];
const SURFACE_TYPES = ['Natural Grass', 'Artificial Turf', 'Hard Court', 'Clay', 'Wooden', 'Concrete', 'Indoor'];
const TOTAL_STEPS = 5;

function uid() { return Math.random().toString(36).slice(2); }

interface SlotDraft {
  _id: string;
  days: number[];
  start_time: string;
  end_time: string;
  price_per_slot: number;
  slot_duration_minutes: number;
}

interface CourtDraft {
  _id: string;
  name: string;
  size: string;
  court_type: string;
  description: string;
  sort_order: number;
  slots: SlotDraft[];
}

interface PhotoItem {
  url: string;
  loading: boolean;
  tempKey: string;
}

function emptySlot(): SlotDraft {
  return { _id: uid(), days: [1, 2, 3, 4, 5], start_time: '09:00', end_time: '10:00', price_per_slot: 0, slot_duration_minutes: 60 };
}

function emptyCourt(idx: number): CourtDraft {
  return { _id: uid(), name: `Court ${String.fromCharCode(65 + idx)}`, size: '5-a-side', court_type: 'Artificial Turf', description: '', sort_order: idx, slots: [emptySlot()] };
}

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {Array.from({ length: total }).map((_, i) => {
        const done = i < step - 1;
        const active = i === step - 1;
        return (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' : 'bg-slate-200 text-slate-500'}`}>
              {done ? '✓' : i + 1}
            </div>
            {i < total - 1 && <div className={`w-5 h-0.5 ${i < step - 1 ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function SlotRow({ slot, onChange, onRemove, showRemove }: { slot: SlotDraft; onChange: (s: SlotDraft) => void; onRemove: () => void; showRemove: boolean }) {
  const set = (k: keyof SlotDraft, v: unknown) => onChange({ ...slot, [k]: v });
  const toggleDay = (d: number) => {
    const days = slot.days.includes(d) ? slot.days.filter(x => x !== d) : [...slot.days, d];
    onChange({ ...slot, days });
  };
  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-2">
      <div className="flex flex-wrap gap-1">
        {DAYS.map((d, i) => (
          <button key={i} type="button" onClick={() => toggleDay(i)}
            className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${slot.days.includes(i) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-200'}`}>
            {d}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><p className="text-xs text-slate-500 mb-0.5">Start</p><input type="time" value={slot.start_time} onChange={e => set('start_time', e.target.value)} className={inputCls} /></div>
        <div><p className="text-xs text-slate-500 mb-0.5">End</p><input type="time" value={slot.end_time} onChange={e => set('end_time', e.target.value)} className={inputCls} /></div>
        <div><p className="text-xs text-slate-500 mb-0.5">Price (₹)</p><input type="number" min="0" value={slot.price_per_slot || ''} onChange={e => set('price_per_slot', Number(e.target.value))} placeholder="500" className={inputCls} /></div>
        <div><p className="text-xs text-slate-500 mb-0.5">Duration</p>
          <select value={slot.slot_duration_minutes} onChange={e => set('slot_duration_minutes', Number(e.target.value))} className={inputCls}>
            <option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>120 min</option>
          </select>
        </div>
      </div>
      {showRemove && <button type="button" onClick={onRemove} className="text-red-400 text-xs hover:text-red-600">Remove slot</button>}
    </div>
  );
}

function CourtCard({ court, index, onUpdate, onRemove, errors }: { court: CourtDraft; index: number; onUpdate: (c: CourtDraft) => void; onRemove: () => void; errors: Record<string, string> }) {
  const [expanded, setExpanded] = useState(true);
  const set = (k: keyof CourtDraft, v: unknown) => onUpdate({ ...court, [k]: v });
  const updateSlot = (id: string, s: SlotDraft) => onUpdate({ ...court, slots: court.slots.map(x => x._id === id ? s : x) });
  const addSlot = () => onUpdate({ ...court, slots: [...court.slots, emptySlot()] });
  const removeSlot = (id: string) => onUpdate({ ...court, slots: court.slots.filter(x => x._id !== id) });

  return (
    <div className="border-l-4 border-emerald-500 bg-white rounded-xl shadow-sm overflow-hidden">
      <button type="button" onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50">
        <div className="text-left">
          <p className="font-semibold text-slate-800 text-sm">Court {index + 1}: {court.name || '(unnamed)'}</p>
          <p className="text-xs text-slate-400">{court.size} • {court.court_type} • {court.slots.length} slot(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200">Remove</button>
          <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Court Name *</label>
              <input type="text" value={court.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Court A" />
              {errors[`court_${court._id}_name`] && <p className={errCls}>{errors[`court_${court._id}_name`]}</p>}
            </div>
            <div>
              <label className={labelCls}>Court Size *</label>
              <select value={court.size} onChange={e => set('size', e.target.value)} className={inputCls}>
                {COURT_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Surface Type *</label>
            <select value={court.court_type} onChange={e => set('court_type', e.target.value)} className={inputCls}>
              {SURFACE_TYPES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={court.description} onChange={e => set('description', e.target.value)} rows={2} className={inputCls} placeholder="Optional notes..." />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Time Slots *</p>
            {errors[`court_${court._id}_slots`] && <p className={errCls}>{errors[`court_${court._id}_slots`]}</p>}
            <div className="space-y-2">
              {court.slots.map(slot => (
                <SlotRow key={slot._id} slot={slot} onChange={s => updateSlot(slot._id, s)} onRemove={() => removeSlot(slot._id)} showRemove={court.slots.length > 1} />
              ))}
            </div>
            <button type="button" onClick={addSlot} className="mt-2 text-emerald-600 text-xs font-semibold hover:text-emerald-700">+ Add Time Slot</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OwnerRegistrationPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tempId = useRef(`pending-owner-${uid()}`);

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState('');

  // Step 1 — personal
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 — turf info
  const [turfName, setTurfName] = useState('');
  const [sportId, setSportId] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
  const [contactNumber, setContactNumber] = useState('');
  const [turfEmail, setTurfEmail] = useState('');
  const [openingTime, setOpeningTime] = useState('06:00');
  const [closingTime, setClosingTime] = useState('22:00');

  // Step 3 — courts
  const [courts, setCourts] = useState<CourtDraft[]>([emptyCourt(0)]);

  // Step 4 — photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const { data: sports = [] } = useQuery({ queryKey: ['sports'], queryFn: sportsApi.getSports });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const validate = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!firstName.trim()) errs.firstName = 'First name is required';
      if (!lastName.trim()) errs.lastName = 'Last name is required';
      if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';
      if (!email.includes('@') || !email.includes('.')) errs.email = 'Enter a valid email';
    }
    if (s === 2) {
      if (!turfName.trim()) errs.turfName = 'Turf name is required';
      if (!sportId) errs.sportId = 'Select a sport';
      if (!address.trim()) errs.address = 'Address is required';
      if (!city.trim()) errs.city = 'City is required';
      if (!/^[6-9]\d{9}$/.test(contactNumber)) errs.contactNumber = 'Enter a valid 10-digit number';
      if (!turfEmail.includes('@')) errs.turfEmail = 'Enter a valid email';
      if (openingTime >= closingTime) errs.closingTime = 'Closing time must be after opening time';
    }
    if (s === 3) {
      if (courts.length === 0) errs.courts = 'Add at least one court';
      courts.forEach(c => {
        if (!c.name.trim()) errs[`court_${c._id}_name`] = 'Court name is required';
        if (c.slots.length === 0) errs[`court_${c._id}_slots`] = 'Add at least one time slot';
        c.slots.forEach(sl => { if (sl.days.length === 0) errs[`court_${c._id}_slots`] = 'Select at least one day per slot'; });
      });
    }
    if (s === 4) {
      const uploaded = photos.filter(p => !p.loading && p.url);
      if (uploaded.length < 2) errs.photos = 'Upload at least 2 photos';
    }
    return errs;
  };

  const goNext = () => {
    const errs = validate(step);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(s => s + 1);
  };

  const goBack = () => { setErrors({}); setStep(s => s - 1); };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const newFiles = Array.from(files).filter(f => {
      if (!allowed.includes(f.type)) { showToast(`${f.name}: unsupported format`); return false; }
      if (f.size > 5 * 1024 * 1024) { showToast(`${f.name}: exceeds 5MB limit`); return false; }
      return true;
    });
    const placeholders: PhotoItem[] = newFiles.map(() => ({ url: '', loading: true, tempKey: uid() }));
    setPhotos(prev => [...prev, ...placeholders]);
    for (const [i, f] of newFiles.entries()) {
      const tempKey = placeholders[i].tempKey;
      try {
        const url = await uploadTurfPhoto(f, tempId.current);
        setPhotos(prev => prev.map(p => p.tempKey === tempKey ? { ...p, url, loading: false } : p));
      } catch {
        setPhotos(prev => prev.filter(p => p.tempKey !== tempKey));
        showToast(`Failed to upload ${f.name}`);
      }
    }
  };

  const removePhoto = async (idx: number) => {
    const photo = photos[idx];
    if (photo.url) await deleteTurfPhoto(photo.url).catch(() => {});
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await authApi.registerOwner({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: `+91${phone}`,
        email: email.trim(),
        turf_data: {
          name: turfName.trim(),
          sport_id: sportId,
          description: description.trim() || undefined,
          address: address.trim(),
          city: city.trim(),
          state: state.trim() || undefined,
          country: country.trim() || 'India',
          contact_number: contactNumber.trim(),
          turf_email: turfEmail.trim(),
          opening_time: openingTime,
          closing_time: closingTime,
          capacity: 22,
          courts: courts.map(c => ({ ...c })),
          photos: photos.filter(p => !p.loading && p.url).map(p => p.url),
        },
      });
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string }; message?: string } } })?.response?.data?.error?.message
        ?? (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (e as Error).message
        ?? 'Failed to submit. Please try again.';
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Application Submitted!</h1>
        <p className="text-slate-500 text-sm mb-6 max-w-xs">
          Your turf owner registration has been sent for review. An admin will create your account and share your login credentials once approved.
        </p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 w-full max-w-sm text-left mb-6">
          <p className="text-emerald-700 text-sm font-semibold mb-1">What happens next?</p>
          <ul className="text-emerald-600 text-xs space-y-1.5">
            <li>✓ Admin reviews your turf details</li>
            <li>✓ Your account is created with a username & password</li>
            <li>✓ You receive your login credentials</li>
            <li>✓ Login and manage your turf!</li>
          </ul>
        </div>
        <button onClick={() => navigate('/login')} className="bg-emerald-500 text-white font-bold px-8 py-3 rounded-2xl hover:bg-emerald-600 transition-colors">
          Back to Login
        </button>
      </div>
    );
  }

  const stepLabels = ['Personal', 'Turf Info', 'Courts', 'Photos', 'Review'];
  const uploadedPhotos = photos.filter(p => !p.loading && p.url);
  const selectedSport = sports.find(s => s.id === sportId);

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm shadow-lg">{toast}</div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 px-5 pt-6 pb-4 text-white">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => step === 1 ? navigate('/login') : goBack()} className="w-9 h-9 bg-black/20 rounded-full flex items-center justify-center text-lg">←</button>
          <div>
            <h1 className="text-xl font-extrabold">Register as Turf Owner</h1>
            <p className="text-emerald-100 text-xs">Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}</p>
          </div>
        </div>
        <StepBar step={step} total={TOTAL_STEPS} />
      </div>

      <div className="px-5 py-6">

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Your Personal Details</h2>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" className={inputCls} />
                  {errors.firstName && <p className={errCls}>{errors.firstName}</p>}
                </div>
                <div>
                  <label className={labelCls}>Last Name *</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" className={inputCls} />
                  {errors.lastName && <p className={errCls}>{errors.lastName}</p>}
                </div>
              </div>
              <div>
                <label className={labelCls}>Phone Number *</label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <span className="px-3 py-3 bg-slate-50 text-slate-600 text-sm font-medium border-r border-slate-200">+91</span>
                  <input type="tel" inputMode="numeric" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" className="flex-1 px-3 py-3 text-slate-800 outline-none text-sm bg-white" />
                </div>
                {errors.phone && <p className={errCls}>{errors.phone}</p>}
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className={inputCls} />
                {errors.email && <p className={errCls}>{errors.email}</p>}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-amber-700 text-xs font-medium">Your registration will be reviewed by an admin. You'll receive your login credentials once approved.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Turf Info */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Turf Details</h2>
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <label className={labelCls}>Turf Name *</label>
                <input type="text" value={turfName} onChange={e => setTurfName(e.target.value)} placeholder="Green Field Arena" className={inputCls} />
                {errors.turfName && <p className={errCls}>{errors.turfName}</p>}
              </div>
              <div>
                <label className={labelCls}>Sport *</label>
                <select value={sportId} onChange={e => setSportId(e.target.value)} className={inputCls}>
                  <option value="">Select a sport</option>
                  {sports.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.sportId && <p className={errCls}>{errors.sportId}</p>}
              </div>
              <div>
                <label className={labelCls}>Full Address *</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street / Area" className={inputCls} />
                {errors.address && <p className={errCls}>{errors.address}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>City *</label>
                  <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Bengaluru" className={inputCls} />
                  {errors.city && <p className={errCls}>{errors.city}</p>}
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="Karnataka" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Contact Number *</label>
                <input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" className={inputCls} />
                {errors.contactNumber && <p className={errCls}>{errors.contactNumber}</p>}
              </div>
              <div>
                <label className={labelCls}>Turf Email *</label>
                <input type="email" value={turfEmail} onChange={e => setTurfEmail(e.target.value)} placeholder="turf@example.com" className={inputCls} />
                {errors.turfEmail && <p className={errCls}>{errors.turfEmail}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Opening Time *</label>
                  <input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Closing Time *</label>
                  <input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className={inputCls} />
                  {errors.closingTime && <p className={errCls}>{errors.closingTime}</p>}
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Describe your turf..." className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Courts */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Courts</h2>
              <button type="button" onClick={() => setCourts(prev => [...prev, emptyCourt(prev.length)])}
                className="bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-600">+ Add Court</button>
            </div>
            {errors.courts && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{errors.courts}</div>}
            <div className="space-y-3">
              {courts.map((c, i) => (
                <CourtCard key={c._id} court={c} index={i}
                  onUpdate={updated => setCourts(prev => prev.map(x => x._id === updated._id ? updated : x))}
                  onRemove={() => setCourts(prev => prev.filter(x => x._id !== c._id))}
                  errors={errors} />
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Photos */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Photos</h2>
            <div
              className="border-2 border-dashed border-emerald-300 bg-white rounded-2xl p-8 text-center cursor-pointer hover:bg-emerald-50"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
            >
              <div className="text-4xl mb-2">📷</div>
              <p className="text-sm font-semibold text-slate-700">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP • Max 5MB • Minimum 2 photos</p>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                onChange={e => handleFileSelect(e.target.files)} />
            </div>
            <div className="flex items-center gap-2">
              {uploadedPhotos.length >= 2
                ? <span className="text-emerald-600 font-semibold text-sm">✓ {uploadedPhotos.length} photos uploaded</span>
                : <span className="text-slate-500 text-sm">{uploadedPhotos.length}/2+ photos uploaded</span>}
            </div>
            {errors.photos && <p className={errCls}>{errors.photos}</p>}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {photos.map((photo, i) => (
                  <div key={photo.tempKey} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                    {photo.loading
                      ? <div className="w-full h-full flex items-center justify-center"><span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                      : <>
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                          {i === 0 && <span className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Primary</span>}
                          <button type="button" onClick={() => removePhoto(i)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-500">×</button>
                        </>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Review & Submit</h2>
            <p className="text-sm text-slate-500">Check your details before submitting for admin review.</p>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Your Details</h3>
              <Row label="Name" value={`${firstName} ${lastName}`} />
              <Row label="Phone" value={`+91 ${phone}`} />
              <Row label="Email" value={email} />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Turf Info</h3>
              <Row label="Name" value={turfName} />
              <Row label="Sport" value={selectedSport?.name ?? '—'} />
              <Row label="Address" value={`${address}, ${city}${state ? ', ' + state : ''}`} />
              <Row label="Contact" value={contactNumber} />
              <Row label="Hours" value={`${openingTime} – ${closingTime}`} />
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Courts ({courts.length})</h3>
              {courts.map((c, i) => (
                <div key={c._id} className="border-l-4 border-emerald-400 pl-3">
                  <p className="text-sm font-semibold text-slate-700">{i + 1}. {c.name}</p>
                  <p className="text-xs text-slate-400">{c.size} • {c.court_type} • {c.slots.length} slot(s)</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-3">Photos ({uploadedPhotos.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {uploadedPhotos.slice(0, 6).map((p, i) => (
                  <div key={p.tempKey} className="aspect-square rounded-lg overflow-hidden">
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {errors.submit && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{errors.submit}</div>}

            <button type="button" disabled={submitting} onClick={handleSubmit}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base">
              {submitting
                ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</span>
                : 'Submit Application'}
            </button>
          </div>
        )}
      </div>

      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-5 py-4 flex gap-3">
          {step > 1 && <button type="button" onClick={goBack} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-2xl hover:bg-slate-50">Back</button>}
          <button type="button" onClick={goNext} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl">Next →</button>
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
