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

    // GET /bookings/availability?turf_id=&court_id=&start=&end=
    if (method === 'GET' && sub === 'availability') {
      const turfId = url.searchParams.get('turf_id');
      const courtId = url.searchParams.get('court_id');
      const start = url.searchParams.get('start');
      const end = url.searchParams.get('end');
      if (!start || !end) return err('start and end are required', 400);
      if (!turfId && !courtId) return err('turf_id or court_id is required', 400);

      let query = supabase
        .from('bookings')
        .select('id, start_time, end_time, game_type')
        .is('deleted_at', null)
        .neq('status', 'cancelled')
        .gte('start_time', start)
        .lte('start_time', end);
      if (courtId) {
        query = query.eq('court_id', courtId);
      } else {
        query = query.eq('turf_id', turfId!);
      }
      const { data, error } = await query;
      if (error) throw error;

      const rawSlots = data ?? [];

      // Expose booking_id only for public slots so others can join
      const bookedSlots = rawSlots.map((b) => ({
        start_time: b.start_time,
        end_time: b.end_time,
        game_type: b.game_type ?? 'private',
        ...(b.game_type === 'public' ? { booking_id: b.id } : {}),
      }));

      const slotsByDate = new Map<string, { start_time: string; end_time: string }[]>();
      for (const slot of rawSlots) {
        const dateStr = slot.start_time.slice(0, 10);
        if (!slotsByDate.has(dateStr)) slotsByDate.set(dateStr, []);
        slotsByDate.get(dateStr)!.push(slot);
      }

      const endDate = new Date(end);
      const displayYear = endDate.getUTCFullYear();
      const displayMonth = endDate.getUTCMonth();
      const daysInMonth = new Date(Date.UTC(displayYear, displayMonth + 1, 0)).getUTCDate();

      const TOTAL_HOURS = 17;
      const LIMITED_THRESHOLD = TOTAL_HOURS * 0.7;

      const dayStatuses: { date: string; status: string }[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const daySlots = slotsByDate.get(dateStr) ?? [];

        let status = 'available';
        if (daySlots.length > 0) {
          const bookedHours = daySlots.reduce((sum, b) => {
            return sum + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime());
          }, 0) / 3_600_000;
          if (bookedHours >= TOTAL_HOURS) {
            status = 'full';
          } else if (bookedHours >= LIMITED_THRESHOLD) {
            status = 'limited';
          }
        }

        dayStatuses.push({ date: dateStr, status });
      }

      return ok({ booked_slots: bookedSlots, day_statuses: dayStatuses });
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
      const { turf_id, court_id, start_time, end_time, price, game_type } = body;
      if (new Date(start_time) >= new Date(end_time)) return conflict('start_time must be before end_time');
      const { data: turf } = await supabase.from('turfs').select('id').eq('id', turf_id).single();
      if (!turf) return notFound('Turf not found');
      const resolvedGameType = game_type === 'public' ? 'public' : 'private';
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: auth.user.id,
          turf_id,
          court_id: court_id ?? null,
          start_time,
          end_time,
          price,
          status: 'confirmed',
          payment_status: 'pending',
          game_type: resolvedGameType,
        })
        .select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /bookings/:id/join — join a public game
    if (method === 'POST' && sub.endsWith('/join')) {
      const bookingId = sub.replace('/join', '');
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!booking || booking.deleted_at) return notFound('Booking not found');
      if (booking.game_type !== 'public') return err('This booking is private', 403);
      if (booking.user_id === auth.user.id) return err('Cannot join your own game', 400);
      const { error } = await supabase
        .from('booking_participants')
        .upsert({ booking_id: bookingId, user_id: auth.user.id }, { onConflict: 'booking_id,user_id' });
      if (error) throw error;
      return ok({ message: 'Joined successfully' });
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

    // PUT /bookings/:id/game-type — toggle private/public
    if (method === 'PUT' && sub.endsWith('/game-type')) {
      const bookingId = sub.replace('/game-type', '');
      const { game_type } = await req.json();
      if (!['private', 'public'].includes(game_type)) return err('Invalid game_type', 400);
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!booking || booking.deleted_at) return notFound('Booking not found');
      if (booking.user_id !== auth.user.id) return forbidden('Not authorized');
      if (booking.status === 'cancelled') return conflict('Cannot update a cancelled booking');
      const { data, error } = await supabase
        .from('bookings').update({ game_type }).eq('id', bookingId).select().single();
      if (error) throw error;
      return ok(data);
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
