import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export default function OtpVerificationPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { verifyOtp, otpIdentifier, otpPhone } = useAuth();
  const navigate = useNavigate();

  const displayTarget = otpIdentifier ?? otpPhone ?? 'your number';
  const isEmail = displayTarget.includes('@');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await verifyOtp(otp);
      if (loggedInUser.role === 'admin') navigate('/admin', { replace: true });
      else if (loggedInUser.role === 'owner') navigate('/owner', { replace: true });
      else navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        'Invalid OTP. Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 px-6 pt-16 pb-12 flex flex-col items-center text-white">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl mb-4">🔐</div>
        <h1 className="text-3xl font-extrabold tracking-tight">SquadEazy</h1>
        <p className="text-emerald-100 mt-1 text-sm">Verify your {isEmail ? 'identity' : 'phone number'}</p>
      </div>

      <div className="flex-1 px-5 -mt-5 lg:flex lg:items-center lg:justify-center lg:mt-0 lg:bg-slate-50">
        <div className="bg-white rounded-2xl shadow-lg p-6 lg:max-w-md lg:w-full">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Enter OTP</h2>
          <p className="text-slate-500 text-sm mb-1">
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-slate-700">
              {isEmail ? displayTarget : `+91 ${otpPhone ?? displayTarget}`}
            </span>
          </p>
          <p className="text-emerald-600 text-xs font-medium mb-6 bg-emerald-50 px-3 py-2 rounded-lg">
            💡 For MVP, use OTP: <strong>123456</strong>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">OTP Code</label>
              <input
                type="number"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 text-center text-2xl tracking-widest font-bold"
                autoFocus
                required
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </button>
          </form>

          <button
            onClick={() => navigate('/login')}
            className="w-full mt-3 text-slate-500 text-sm py-2 hover:text-slate-700"
          >
            ← Change {isEmail ? 'email' : 'phone number'}
          </button>
        </div>
      </div>
    </div>
  );
}
