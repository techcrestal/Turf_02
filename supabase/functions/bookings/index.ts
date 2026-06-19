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

    // GET /bookings — list user's own bookings (hosting)
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
          if (bookedHours >= TOTAL_HOURS) status = 'full';
          else if (bookedHours >= LIMITED_THRESHOLD) status = 'limited';
        }
        dayStatuses.push({ date: dateStr, status });
      }

      return ok({ booked_slots: bookedSlots, day_statuses: dayStatuses });
    }

    // GET /bookings/joined — games I've been approved to join
    if (method === 'GET' && sub === 'joined') {
      const { data: participations, error: pErr } = await supabase
        .from('booking_participants')
        .select('booking_id, joined_at, status')
        .eq('user_id', auth.user.id)
        .eq('status', 'approved');
      if (pErr) throw pErr;
      if (!participations?.length) return ok([]);
      const ids = participations.map((p) => p.booking_id);
      const { data: bookings, error: bErr } = await supabase
        .from('bookings').select('*').in('id', ids).is('deleted_at', null).neq('status', 'cancelled')
        .order('start_time', { ascending: false });
      if (bErr) throw bErr;
      const joinMap = Object.fromEntries(participations.map((p) => [p.booking_id, p.joined_at]));
      return ok((bookings ?? []).map((b) => ({ ...b, joined_at: joinMap[b.id] })));
    }

    // GET /bookings/pending-joins — games I've requested to join, awaiting approval
    if (method === 'GET' && sub === 'pending-joins') {
      const { data: participations, error: pErr } = await supabase
        .from('booking_participants')
        .select('booking_id, joined_at')
        .eq('user_id', auth.user.id)
        .eq('status', 'pending');
      if (pErr) throw pErr;
      if (!participations?.length) return ok([]);
      const ids = participations.map((p) => p.booking_id);
      const { data: bookings, error: bErr } = await supabase
        .from('bookings').select('*').in('id', ids).is('deleted_at', null).neq('status', 'cancelled')
        .order('start_time', { ascending: false });
      if (bErr) throw bErr;
      const joinMap = Object.fromEntries(participations.map((p) => [p.booking_id, p.joined_at]));
      return ok((bookings ?? []).map((b) => ({ ...b, join_status: 'pending', joined_at: joinMap[b.id] })));
    }

    // GET /bookings/join-requests — pending join requests for my hosted public games
    if (method === 'GET' && sub === 'join-requests') {
      const { data: myBookings, error: bErr } = await supabase
        .from('bookings').select('id, start_time, end_time, turf_id, court_id')
        .eq('user_id', auth.user.id).eq('game_type', 'public')
        .neq('status', 'cancelled').is('deleted_at', null);
      if (bErr) throw bErr;
      if (!myBookings?.length) return ok([]);

      const ids = myBookings.map((b) => b.id);
      const { data: requests, error: rErr } = await supabase
        .from('booking_participants')
        .select('booking_id, user_id, joined_at, status')
        .in('booking_id', ids).eq('status', 'pending');
      if (rErr) throw rErr;
      if (!requests?.length) return ok([]);

      const userIds = [...new Set(requests.map((r) => r.user_id))];
      const { data: users } = await supabase
        .from('users').select('id, name, phone_number').in('id', userIds);
      const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]));
      const bookingMap = Object.fromEntries(myBookings.map((b) => [b.id, b]));

      return ok(requests.map((r) => ({
        booking_id: r.booking_id,
        user_id: r.user_id,
        requested_at: r.joined_at,
        requester: userMap[r.user_id] ?? { id: r.user_id, name: 'Player', phone_number: '' },
        booking: bookingMap[r.booking_id],
      })));
    }

    // GET /bookings/public — all upcoming public games with my join status
    if (method === 'GET' && sub === 'public') {
      const { data, error } = await supabase
        .from('bookings').select('*')
        .eq('game_type', 'public').neq('status', 'cancelled')
        .is('deleted_at', null).gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (error) throw error;
      const bookingIds = (data ?? []).map((b) => b.id);
      const { data: myJoins } = bookingIds.length
        ? await supabase.from('booking_participants').select('booking_id, status')
            .eq('user_id', auth.user.id).in('booking_id', bookingIds)
        : { data: [] };
      const joinMap = Object.fromEntries((myJoins ?? []).map((p) => [p.booking_id, p.status]));
      return ok((data ?? []).map((b) => ({
        ...b,
        is_mine: b.user_id === auth.user.id,
        join_status: b.user_id === auth.user.id ? 'host' : (joinMap[b.id] ?? 'none'),
      })));
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

    // GET /bookings/:id/participants — host + approved participants with skills
    if (method === 'GET' && sub.endsWith('/participants')) {
      const bookingId = sub.replace('/participants', '');
      const { data: booking } = await supabase.from('bookings').select('user_id').eq('id', bookingId).single();
      if (!booking) return notFound('Booking not found');
      const { data: parts } = await supabase.from('booking_participants')
        .select('user_id').eq('booking_id', bookingId).eq('status', 'approved');
      const allIds = [...new Set([booking.user_id, ...(parts ?? []).map((p: any) => p.user_id)])];
      const { data: users } = await supabase.from('users').select('id, name, username').in('id', allIds);
      const { data: userSkillsRaw } = await supabase.from('user_skills').select('user_id, skill_id').in('user_id', allIds);
      const skillIds = [...new Set((userSkillsRaw ?? []).map((us: any) => us.skill_id))];
      const skillsData = skillIds.length
        ? (await supabase.from('sport_skills').select('id, display_name, sport_id').in('id', skillIds)).data
        : [];
      const skillMeta = Object.fromEntries((skillsData ?? []).map((s: any) => [s.id, s]));
      const skillsByUser: Record<string, any[]> = {};
      (userSkillsRaw ?? []).forEach((us: any) => {
        if (!skillsByUser[us.user_id]) skillsByUser[us.user_id] = [];
        if (skillMeta[us.skill_id]) skillsByUser[us.user_id].push(skillMeta[us.skill_id]);
      });
      return ok((users ?? []).map((u: any) => ({
        id: u.id, name: u.name ?? u.username ?? 'Player',
        is_host: u.id === booking.user_id,
        skills: skillsByUser[u.id] ?? [],
      })));
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
        .insert({ user_id: auth.user.id, turf_id, court_id: court_id ?? null, start_time, end_time, price, status: 'confirmed', payment_status: 'pending', game_type: resolvedGameType })
        .select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /bookings/:id/join — request to join a public game
    if (method === 'POST' && sub.endsWith('/join')) {
      const bookingId = sub.replace('/join', '');
      const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
      if (!booking || booking.deleted_at) return notFound('Booking not found');
      if (booking.game_type !== 'public') return err('This booking is private', 403);
      if (booking.user_id === auth.user.id) return err('Cannot join your own game', 400);
      // Check existing status
      const { data: existing } = await supabase.from('booking_participants')
        .select('status').eq('booking_id', bookingId).eq('user_id', auth.user.id).maybeSingle();
      if (existing?.status === 'approved') return ok({ message: 'Already approved' });
      if (existing?.status === 'pending') return ok({ message: 'Request already pending' });
      const { error } = await supabase.from('booking_participants')
        .upsert({ booking_id: bookingId, user_id: auth.user.id, status: 'pending', joined_at: new Date().toISOString() }, { onConflict: 'booking_id,user_id' });
      if (error) throw error;
      // Notify game owner about the new join request
      const { data: requester } = await supabase.from('users').select('name').eq('id', auth.user.id).single();
      const jBookingDate = booking.start_time.replace('T', ' ').slice(0, 16);
      const jExpiresAt = new Date(new Date(booking.end_time).getTime() + 86400000).toISOString();
      await supabase.from('notifications').insert({
        user_id: booking.user_id, type: 'join_request', title: 'New Join Request',
        body: `${requester?.name ?? 'Someone'} wants to join your game on ${jBookingDate}`,
        payload: { booking_id: bookingId, requester_id: auth.user.id },
        expires_at: jExpiresAt,
      });
      return ok({ message: 'Join request sent — awaiting approval' });
    }

    // DELETE /bookings/:id/join — withdraw join request or leave game
    if (method === 'DELETE' && sub.endsWith('/join')) {
      const bookingId = sub.replace('/join', '');
      const { error } = await supabase.from('booking_participants')
        .delete().eq('booking_id', bookingId).eq('user_id', auth.user.id);
      if (error) throw error;
      return ok({ message: 'Left game' });
    }

    // PUT /bookings/:id/join-requests/approve — owner approves a request
    if (method === 'PUT' && sub.endsWith('/join-requests/approve')) {
      const bookingId = sub.split('/')[0];
      const { user_id } = await req.json();
      if (!user_id) return err('user_id required', 400);
      const { data: booking } = await supabase.from('bookings').select('user_id, start_time, end_time').eq('id', bookingId).single();
      if (!booking) return notFound('Booking not found');
      if (booking.user_id !== auth.user.id) return forbidden('Not authorized');
      const { error } = await supabase.from('booking_participants')
        .update({ status: 'approved', responded_at: new Date().toISOString() })
        .eq('booking_id', bookingId).eq('user_id', user_id);
      if (error) throw error;
      // Notify requester that their join was approved
      const aBookingDate = booking.start_time.replace('T', ' ').slice(0, 16);
      const aExpiresAt = new Date(new Date(booking.end_time).getTime() + 86400000).toISOString();
      await supabase.from('notifications').insert({
        user_id, type: 'join_approved', title: 'Join Request Approved',
        body: `Your request to join the game on ${aBookingDate} has been approved!`,
        payload: { booking_id: bookingId },
        expires_at: aExpiresAt,
      });
      return ok({ message: 'Approved' });
    }

    // PUT /bookings/:id/join-requests/reject — owner rejects a request
    if (method === 'PUT' && sub.endsWith('/join-requests/reject')) {
      const bookingId = sub.split('/')[0];
      const { user_id } = await req.json();
      if (!user_id) return err('user_id required', 400);
      const { data: booking } = await supabase.from('bookings').select('user_id, start_time, end_time').eq('id', bookingId).single();
      if (!booking) return notFound('Booking not found');
      if (booking.user_id !== auth.user.id) return forbidden('Not authorized');
      const { error } = await supabase.from('booking_participants')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('booking_id', bookingId).eq('user_id', user_id);
      if (error) throw error;
      // Notify requester that their join was rejected
      const rBookingDate = booking.start_time.replace('T', ' ').slice(0, 16);
      const rExpiresAt = new Date(new Date(booking.end_time).getTime() + 86400000).toISOString();
      await supabase.from('notifications').insert({
        user_id, type: 'join_rejected', title: 'Join Request Not Approved',
        body: `Your request to join the game on ${rBookingDate} was not approved.`,
        payload: { booking_id: bookingId },
        expires_at: rExpiresAt,
      });
      return ok({ message: 'Rejected' });
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
