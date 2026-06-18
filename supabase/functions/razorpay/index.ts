import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, preflight } from '../_shared/response.ts';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const RAZORPAY_API = 'https://api.razorpay.com/v1';

function razorpayAuth(): string {
  return 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
}

async function verifyHmac(orderId: string, paymentId: string, signature: string): Promise<boolean> {
  const message = `${orderId}|${paymentId}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(RAZORPAY_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return expected === signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(corsHeaders);

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(1).join('/');
  const supabase = getSupabase();
  const method = req.method;

  try {
    const auth = await authenticate(req);
    if (!auth) return unauthorized();

    // POST /razorpay/create-order
    if (method === 'POST' && sub === 'create-order') {
      const { amount, currency = 'INR', booking_id } = await req.json();
      if (!amount || !booking_id) return err('amount and booking_id are required');

      const response = await fetch(`${RAZORPAY_API}/orders`, {
        method: 'POST',
        headers: {
          Authorization: razorpayAuth(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // rupees → paise
          currency,
          receipt: booking_id,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        return err(body?.error?.description ?? 'Failed to create Razorpay order', 502);
      }

      const order = await response.json();
      return ok({ order_id: order.id, amount: order.amount, currency: order.currency });
    }

    // POST /razorpay/verify
    if (method === 'POST' && sub === 'verify') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id, amount } =
        await req.json();

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
        return err('Missing required payment fields');
      }

      const valid = await verifyHmac(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!valid) return err('Invalid payment signature', 400, 'SIGNATURE_MISMATCH');

      // Validate booking ownership
      const { data: booking } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('id', booking_id)
        .single();
      if (!booking || booking.user_id !== auth.user.id) {
        return err('Not authorized for this booking', 403, 'FORBIDDEN');
      }

      // Record payment
      const { error: payErr } = await supabase.from('payments').insert({
        user_id: auth.user.id,
        booking_id,
        amount,
        currency: 'INR',
        status: 'completed',
        provider: 'razorpay',
        provider_transaction_id: razorpay_payment_id,
        metadata: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
      });
      if (payErr) throw payErr;

      // Update booking payment_status
      await supabase
        .from('bookings')
        .update({ payment_status: 'completed' })
        .eq('id', booking_id);

      return ok({ success: true, payment_id: razorpay_payment_id });
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
