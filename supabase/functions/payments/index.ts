import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, forbidden, notFound, preflight } from '../_shared/response.ts';

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

    // GET /payments
    if (method === 'GET' && sub === '') {
      const { data, error } = await supabase
        .from('payments').select('*').eq('user_id', auth.user.id)
        .is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return ok(data ?? []);
    }

    // POST /payments
    if (method === 'POST' && sub === '') {
      const body = await req.json();
      const { booking_id, game_id, amount, currency = 'INR', provider = 'mock', provider_transaction_id, metadata } = body;

      // Validate ownership
      if (booking_id) {
        const { data: booking } = await supabase.from('bookings').select('user_id').eq('id', booking_id).single();
        if (!booking || booking.user_id !== auth.user.id) return forbidden('Not authorized for this booking');
      }
      if (game_id) {
        const { data: game } = await supabase.from('games').select('creator_id').eq('id', game_id).single();
        if (!game) {
          // Check if joined
          const { data: player } = await supabase.from('game_players')
            .select('id').eq('game_id', game_id).eq('user_id', auth.user.id).single();
          if (!player) return forbidden('Not authorized for this game');
        }
      }

      const { data, error } = await supabase.from('payments')
        .insert({ user_id: auth.user.id, booking_id, game_id, amount, currency, status: 'completed', provider, provider_transaction_id, metadata })
        .select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // PUT /payments/:id
    if (method === 'PUT' && sub && !sub.includes('/')) {
      const body = await req.json();
      const { data, error } = await supabase
        .from('payments').update({ status: body.status }).eq('id', sub).select().single();
      if (error) throw error;
      return ok(data);
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
