import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, forbidden, conflict, preflight } from '../_shared/response.ts';

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

    // GET /bookings — list user's bookings
    if (method === 'GET' && sub === '') {
      const { data, error } = await supabase
        .from('bookings').select('*')
        .eq('user_id', auth.user.id)
        .is('deleted_at', null)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return ok(data ?? []);
    }

    // GET /bookings/availability?turf_id=&start=&end=
    if (method === 'GET' && sub === 'availability') {
      const turfId = url.searchParams.get('turf_id');
      const start = url.searchParams.get('start');
      const end = url.searchParams.get('end');
      if (!turfId || !start || !end) return err('turf_id, start, and end are required', 400);
      const { data, error } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('turf_id', turfId)
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .gte('start_time', start)
        .lte('start_time', end);
      if (error) throw error;
      return ok({ booked_slots: data ?? [] });
    }

    // GET /bookings/turf/:turfId — owner view
    if (method === 'GET' && sub.startsWith('turf/')) {
      const turfId = sub.split('/')[1];
      const { data: turf } = await supabase.from('turfs').select('owner_id').eq('id', turfId).single();
      if (!turf) return notFound('Turf not found');
      if (turf.owner_id !== auth.user.id) return forbidden('Not authorized');
      const { data, error } = await supabase
        .from('bookings').select('*').eq('turf_id', turfId).is('deleted_at', null)
        .order('start_time', { ascending: false });
      if (error) throw error;
      return ok(data ?? []);
    }

    // GET /bookings/:id
    if (method === 'GET' && sub && !sub.includes('/')) {
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', sub).single();
      if (!booking || booking.deleted_at) return notFound('Booking not found');
      if (booking.user_id !== auth.user.id) return forbidden('Not authorized');
      return ok(booking);
    }

    // POST /bookings — create
    if (method === 'POST' && sub === '') {
      const body = await req.json();
      const { turf_id, court_id, start_time, end_time, price } = body;
      if (new Date(start_time) >= new Date(end_time)) return conflict('start_time must be before end_time');
      const { data: turf } = await supabase.from('turfs').select('id').eq('id', turf_id).single();
      if (!turf) return notFound('Turf not found');
      const { data, error } = await supabase
        .from('bookings')
        .insert({ user_id: auth.user.id, turf_id, court_id: court_id ?? null, start_time, end_time, price, status: 'confirmed', payment_status: 'pending' })
        .select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // PUT /bookings/:id/cancel
    if (method === 'PUT' && sub.endsWith('/cancel')) {
      const bookingId = sub.replace('/cancel', '');
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!booking || booking.deleted_at) return notFound('Booking not found');
      if (booking.user_id !== auth.user.id) return forbidden('Not authorized');
      if (booking.status === 'cancelled') return conflict('Already cancelled');
      const { data, error } = await supabase
        .from('bookings').update({ status: 'cancelled' }).eq('id', bookingId).select().single();
      if (error) throw error;
      return ok(data);
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});