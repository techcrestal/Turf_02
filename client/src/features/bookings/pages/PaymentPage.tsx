import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../../../api/endpoints/payments';

interface PaymentState {
  bookingId: string;
  amount: number;       // charge now (advance or full)
  totalAmount?: number; // full booking price — present when advance < total
  turfName: string;
  courtName?: string;
  courtDetails?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <p className={`text-sm flex-shrink-0 ${bold ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{label}</p>
      <p className={`text-sm text-right ${bold ? 'font-bold text-slate-800' : 'text-slate-700 font-medium'}`}>{value}</p>
    </div>
  );
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PaymentState | null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);

  // Eagerly load Razorpay script in the background
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  if (!state) {
    navigate('/home', { replace: true });
    return null;
  }

  const isAdvanceOnly = state.totalAmount != null && state.totalAmount > state.amount;
  const balanceDue = isAdvanceOnly ? state.totalAmount! - state.amount : 0;

  if (paid) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-5xl mb-5">✅</div>
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Booking Confirmed!</h2>
        <p className="text-slate-500 text-sm mb-1">
          {isAdvanceOnly ? `Advance of ₹${state.amount} received` : `Payment of ₹${state.amount} received`}
        </p>
        {isAdvanceOnly && (
          <p className="text-amber-600 text-sm font-medium mb-1">₹{balanceDue} due at the venue</p>
        )}
        {state.courtName && (
          <p className="text-sm font-semibold text-emerald-600 mb-1">{state.courtName}</p>
        )}
        <p className="text-xs text-slate-400 mb-6 font-mono">#{state.bookingId.slice(0, 8)}</p>
        <button
          onClick={() => navigate('/bookings')}
          className="bg-emerald-500 text-white font-bold px-8 py-3 rounded-xl mb-3 w-full max-w-xs"
        >
          View My Bookings
        </button>
        <button onClick={() => navigate('/home')} className="text-slate-500 text-sm">
          Back to Home
        </button>
      </div>
    );
  }

  const formattedDate = new Date(state.date + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Could not load payment gateway. Check your connection and try again.');
        setLoading(false);
        return;
      }

      const order = await paymentsApi.createRazorpayOrder(state.amount, state.bookingId);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'Turf Booking',
        description: state.courtName
          ? `${state.turfName} · ${state.courtName}`
          : state.turfName,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await paymentsApi.verifyRazorpayPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: state.bookingId,
              amount: state.amount,
            });
            setPaid(true);
          } catch {
            setError(
              'Payment was received but verification failed. Contact support with booking ID: ' +
                state.bookingId.slice(0, 8),
            );
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
        theme: { color: '#10b981' },
      });

      rzp.on('payment.failed', (response: { error: { description?: string } }) => {
        setError(response.error.description ?? 'Payment failed. Please try again.');
        setLoading(false);
      });

      rzp.open();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
          ?.message ??
        (e instanceof Error ? e.message : 'Failed to initiate payment.');
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 pt-12">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-slate-800">Payment</h1>
      </div>

      <div className="px-4 py-5 pb-8 space-y-4 lg:max-w-xl lg:mx-auto">

        {/* Booking Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Booking Summary</h2>
          <Row label="Turf" value={state.turfName} />
          {state.courtName && (
            <Row
              label="Court"
              value={state.courtDetails ? `${state.courtName} · ${state.courtDetails}` : state.courtName}
            />
          )}
          <Row label="Date" value={formattedDate} />
          <Row label="Time" value={`${state.startTime} – ${state.endTime}`} />
          <Row label="Duration" value={`${state.duration} hr${state.duration !== 1 ? 's' : ''}`} />
          <div className="border-t border-slate-100 pt-3 space-y-1.5">
            {isAdvanceOnly && <Row label="Total Booking" value={`₹${state.totalAmount}`} />}
            <Row label={isAdvanceOnly ? 'Pay Now (Advance)' : 'Total Amount'} value={`₹${state.amount}`} bold />
            {isAdvanceOnly && (
              <p className="text-xs text-amber-600 mt-1">₹{balanceDue} remaining balance due at venue</p>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Payment Method</h2>
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="text-2xl">💳</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Razorpay</p>
              <p className="text-xs text-slate-400">UPI · Cards · Net Banking · Wallets</p>
            </div>
            <span className="ml-auto w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs">✓</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors text-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Pay ₹${state.amount}${isAdvanceOnly ? ' (Advance)' : ''} via Razorpay`
          )}
        </button>

      </div>
    </div>
  );
}
