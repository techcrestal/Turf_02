import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { sportsApi } from '../../../api/endpoints/sports';
import { getSportEmoji } from '../../../utils/helpers';

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Rather not say' },
];

const TOTAL_STEPS = 3;

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  // Pull pre-filled value from login page navigation state
  const prefill = location.state as { identifier?: string; type?: 'phone' | 'email' } | null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [dob, setDob] = useState('');
  const [location_, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [favSports, setFavSports] = useState<string[]>([]);

  // Step 3
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [promotions, setPromotions] = useState(false);

  const { data: sports = [] } = useQuery({
    queryKey: ['sports'],
    queryFn: sportsApi.getSports,
  });

  // Autofill from login page
  useEffect(() => {
    if (prefill?.type === 'phone') setPhone(prefill.identifier ?? '');
    if (prefill?.type === 'email') setEmail(prefill.identifier ?? '');
  }, [prefill]);

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationStatus('denied'); return; }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied')
    );
  };

  const toggleSport = (id: string) =>
    setFavSports((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  // Step 1 validation
  const step1Valid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phone.replace(/\D/g, '').length === 10 &&
    email.includes('@') &&
    username.trim().length >= 3 &&
    password.length >= 6;

  const handleNext = () => {
    setError('');
    if (step === 1 && !step1Valid) {
      setError('Please fill all required fields correctly.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions to continue.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({
        phone_number: phone.replace(/\D/g, ''),
        email,
        username,
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        middle_name: middleName.trim() || undefined,
        gender: gender || undefined,
        dob: dob || undefined,
        location_lat: location_?.lat,
        location_lng: location_?.lng,
        favorite_sports: favSports,
        promotions_opt_in: promotions,
      });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        err?.response?.data?.error?.message ??
        err?.message ??
        'Registration failed. Try again.'
      );
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 px-5 pt-14 pb-6 text-white">
        <button onClick={() => (step === 1 ? navigate('/login') : setStep((s) => s - 1))} className="text-emerald-100 text-sm mb-3">
          ← Back
        </button>
        <h1 className="text-2xl font-extrabold">
          {step === 1 ? 'Create Account' : step === 2 ? 'Your Sports' : 'Almost Done!'}
        </h1>
        <p className="text-emerald-100 text-xs mt-0.5">
          Step {step} of {TOTAL_STEPS}
        </p>
        {/* Progress bar */}
        <div className="flex gap-1 mt-3">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < step ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="px-5 py-5 max-w-lg mx-auto">

        {/* ── Step 1: Personal Details ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Rahul"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="(optional)"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Last Name *</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Sharma"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
              />
            </div>

            {/* Contact row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Phone *</label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 bg-white">
                  <span className="pl-2.5 pr-1.5 text-slate-500 text-xs font-medium">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 pr-3 py-2.5 text-slate-800 outline-none text-sm bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Gender</label>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      gender === opt.value
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().slice(0, 10)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Location</label>
              <button
                type="button"
                onClick={requestLocation}
                disabled={locationStatus === 'loading' || locationStatus === 'granted'}
                className={`w-full flex items-center justify-center gap-2 border rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  locationStatus === 'granted'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : locationStatus === 'denied'
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400'
                }`}
              >
                {locationStatus === 'loading' && <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                {locationStatus === 'granted' ? '📍 Location access granted' : locationStatus === 'denied' ? '❌ Location denied' : '📍 Allow location access'}
              </button>
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Username * <span className="font-normal text-slate-400">(unique, min 3 chars)</span></label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 bg-white">
                <span className="pl-3 text-slate-400 text-sm">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="rahul_plays"
                  className="flex-1 px-2 py-2.5 text-slate-800 outline-none text-sm bg-transparent"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Password * <span className="font-normal text-slate-400">(min 6 chars)</span></label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500 bg-white">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="flex-1 px-3 py-2.5 text-slate-800 outline-none text-sm bg-transparent"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="px-3 text-slate-400 text-base">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={`h-1 flex-1 rounded-full ${
                        password.length >= lvl * 3
                          ? lvl === 1 ? 'bg-red-400' : lvl === 2 ? 'bg-yellow-400' : 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button
              type="button"
              onClick={handleNext}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Next → Favourite Sports
            </button>
          </div>
        )}

        {/* ── Step 2: Favourite Sports ─────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">What sports do you play?</h2>
              <p className="text-sm text-slate-500 mt-0.5">Select all that apply — you can change this later</p>
            </div>

            {sports.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">Loading sports...</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {sports.map((sport) => (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => toggleSport(sport.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                      favSports.includes(sport.id)
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm scale-105'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <span>{getSportEmoji(sport.name)}</span>
                    <span>{sport.name}</span>
                    {favSports.includes(sport.id) && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {favSports.length > 0 && (
              <p className="text-emerald-600 text-xs font-medium">
                {favSports.length} sport{favSports.length > 1 ? 's' : ''} selected
              </p>
            )}

            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Step 3: Terms & Submit ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Almost there!</h2>
              <p className="text-sm text-slate-500 mt-0.5">Please review and agree before joining</p>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
              <p className="text-sm font-bold text-slate-700">{firstName} {middleName} {lastName}</p>
              <p className="text-xs text-slate-500">@{username}</p>
              <p className="text-xs text-slate-500">{phone ? `+91 ${phone}` : ''}{phone && email ? ' · ' : ''}{email}</p>
              {favSports.length > 0 && (
                <p className="text-xs text-slate-400">{favSports.length} sport{favSports.length > 1 ? 's' : ''} selected</p>
              )}
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  termsAccepted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                }`}>
                  {termsAccepted && <span className="text-white text-xs font-bold">✓</span>}
                </div>
              </div>
              <span className="text-sm text-slate-600 leading-relaxed">
                I agree to the{' '}
                <button type="button" className="text-emerald-600 font-medium underline">Terms & Conditions</button>
                {' '}and{' '}
                <button type="button" className="text-emerald-600 font-medium underline">Privacy Policy</button>
                <span className="text-red-500 ml-0.5">*</span>
              </span>
            </label>

            {/* Promotions checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={promotions}
                  onChange={(e) => setPromotions(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  promotions ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 bg-white'
                }`}>
                  {promotions && <span className="text-white text-xs font-bold">✓</span>}
                </div>
              </div>
              <span className="text-sm text-slate-600 leading-relaxed">
                Receive promotional emails and SMS about offers, new turfs, and game alerts <span className="text-slate-400">(optional)</span>
              </span>
            </label>

            {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !termsAccepted}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating your account...
                </span>
              ) : (
                '🎉 Create Account'
              )}
            </button>

            <p className="text-center text-slate-400 text-xs">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('/login')} className="text-emerald-600 font-medium">
                Login
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
