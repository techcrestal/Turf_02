import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../api/endpoints/auth';

type LoginMode = 'otp' | 'password';
type IdentifierType = 'email' | 'phone' | 'username';

function detectType(value: string, mode: LoginMode): IdentifierType {
  if (value.includes('@')) return 'email';
  if (/^\d+$/.test(value.replace(/\s/g, ''))) return 'phone';
  // In password mode, non-numeric non-email is a username
  return mode === 'password' ? 'username' : 'phone';
}

export default function PhoneLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [mode, setMode] = useState<LoginMode>('otp');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setOtpContext, sendOtp, loginWithPassword } = useAuth();
  const navigate = useNavigate();

  const inputType = detectType(identifier, mode);
  const isPhoneInput = inputType === 'phone';
  const isUsernameInput = inputType === 'username';
  const cleanIdentifier = isPhoneInput ? identifier.replace(/\D/g, '').slice(0, 10) : identifier;

  const isValid = isPhoneInput
    ? cleanIdentifier.length === 10
    : isUsernameInput
      ? cleanIdentifier.length >= 3
      : cleanIdentifier.includes('@') && cleanIdentifier.includes('.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);

    try {
      if (mode === 'password') {
        const loggedInUser = await loginWithPassword(cleanIdentifier, password);
        if (loggedInUser.role === 'admin') navigate('/admin', { replace: true });
        else if (loggedInUser.role === 'owner') navigate('/owner', { replace: true });
        else navigate('/home', { replace: true });
        return;
      }

      // OTP mode: check if user exists first
      const result = await authApi.checkUser(cleanIdentifier);

      if (!result.exists) {
        // New user → register
        navigate('/register', { state: { identifier: cleanIdentifier, type: inputType } });
        return;
      }

      // Existing user → send OTP and go to verify
      const phone = result.phone_number ?? cleanIdentifier;
      setOtpContext(cleanIdentifier, phone);
      await sendOtp(phone);
      navigate('/verify-otp');
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
        ?? err?.response?.data?.message
        ?? err?.message
        ?? 'Something went wrong. Try again.';

      if (msg.includes('not found') || msg.includes('No account')) {
        navigate('/register', { state: { identifier: cleanIdentifier, type: inputType } });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white lg:flex-row">
      {/* Left brand panel — desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/2 lg:items-center lg:justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white px-12">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center text-6xl mb-6">🏟️</div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-3">SquadEazy</h1>
        <p className="text-emerald-100 text-lg text-center max-w-xs">Book your turf, play your game. Find sports venues near you.</p>
      </div>

      {/* Top hero — mobile */}
      <div className="lg:hidden bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 pt-16 pb-10 flex flex-col items-center text-white">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-4">🏟️</div>
        <h1 className="text-3xl font-extrabold tracking-tight">SquadEazy</h1>
        <p className="text-emerald-100 mt-1 text-sm">Book your turf, play your game</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-5 -mt-5 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-6 lg:w-full lg:max-w-md">
          <h2 className="text-xl font-bold text-slate-800 mb-0.5">Welcome back!</h2>
          <p className="text-slate-500 text-sm mb-5">
            {mode === 'password' ? 'Use your phone, email, or username' : 'Enter your phone number or email to continue'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Identifier input */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {mode === 'password' ? 'Phone, Email or Username' : 'Phone number or Email'}
              </label>
              {isPhoneInput && identifier.length > 0 ? (
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <span className="px-3 py-3 bg-slate-50 text-slate-600 text-sm font-medium border-r border-slate-200">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={cleanIdentifier}
                    onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-3 text-slate-800 outline-none text-sm bg-white"
                    autoComplete="tel"
                    autoFocus
                  />
                </div>
              ) : (
                <input
                  type="text"
                  inputMode={identifier.length === 0 || isPhoneInput ? 'numeric' : 'text'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={mode === 'password' ? 'admin, phone or email' : '9876543210 or you@email.com'}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  autoComplete="username"
                  autoFocus
                />
              )}
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => { setMode('otp'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'otp'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                📱 OTP Login
              </button>
              <button
                type="button"
                onClick={() => { setMode('password'); setError(''); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'password'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔑 Password
              </button>
            </div>

            {/* Password field (only in password mode) */}
            {mode === 'password' && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Password</label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="flex-1 px-4 py-3 text-slate-800 outline-none text-sm bg-white"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="px-3 text-slate-400 hover:text-slate-600 text-lg"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !isValid || (mode === 'password' && !password)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'otp' ? 'Checking...' : 'Logging in...'}
                </span>
              ) : mode === 'otp' ? (
                'Continue →'
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* OTP hint */}
          {mode === 'otp' && (
            <p className="text-center text-emerald-600 text-xs mt-3 bg-emerald-50 px-3 py-2 rounded-lg">
              💡 MVP OTP is <strong>123456</strong>
            </p>
          )}

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-slate-400 text-xs">New here?</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <Link
            to="/register"
            className="block text-center w-full border border-emerald-500 text-emerald-600 font-semibold py-3 rounded-xl hover:bg-emerald-50 transition-colors text-sm"
          >
            Create an Account
          </Link>

          <div className="text-center mt-4">
            <Link to="/owner-register" className="text-slate-500 text-xs hover:text-emerald-600 hover:underline">
              Want to list your turf? Register as an Owner →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
