import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, forbidden, preflight } from '../_shared/response.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(corsHeaders);

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(1).join('/'); // after 'courts'
  const supabase = getSupabase();
  const method = req.method;

  try {
    const auth = await authenticate(req);
    if (!auth) return unauthorized();

    // GET /courts?turf_id=xxx — list courts for a turf (with slots)
    if (method === 'GET' && sub === '') {
      const turfId = url.searchParams.get('turf_id');
      if (!turfId) return err('turf_id is required');

      const { data: courts, error } = await supabase
        .from('courts')
        .select('*, court_time_slots(*)')
        .eq('turf_id', turfId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return ok(courts ?? []);
    }

    // POST /courts — create court + slots (owner only)
    if (method === 'POST' && sub === '') {
      const body = await req.json();
      const { turf_id, name, size, court_type, description, sort_order = 0, slots = [] } = body;

      // Verify owner
      const { data: turf } = await supabase.from('turfs').select('owner_id').eq('id', turf_id).single();
      if (!turf) return notFound('Turf not found');
      if (turf.owner_id !== auth.user.id) return forbidden('Not authorized');

      const { data: court, error: courtErr } = await supabase
        .from('courts')
        .insert({ turf_id, name, size, court_type, description, sort_order })
        .select().single();
      if (courtErr) throw courtErr;

      // Insert time slots
      if (slots.length > 0) {
        const slotRows = slots.map((s: any) => ({
          court_id: court.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          price_per_slot: s.price_per_slot ?? 0,
          slot_duration_minutes: s.slot_duration_minutes ?? 60,
          is_available: true,
        }));
        const { error: slotErr } = await supabase.from('court_time_slots').insert(slotRows);
        if (slotErr) throw slotErr;
      }

      // Return court with slots
      const { data: full } = await supabase
        .from('courts')
        .select('*, court_time_slots(*)')
        .eq('id', court.id)
        .single();

      return new Response(JSON.stringify(full), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /courts/:id — update court
    if (method === 'PUT' && sub && !sub.includes('/')) {
      const body = await req.json();
      const { data: court } = await supabase.from('courts').select('turf_id').eq('id', sub).single();
      if (!court) return notFound('Court not found');

      const { data: turf } = await supabase.from('turfs').select('owner_id').eq('id', court.turf_id).single();
      if (!turf || turf.owner_id !== auth.user.id) return forbidden('Not authorized');

      const { name, size, court_type, description, slots } = body;
      const { data: updated, error } = await supabase
        .from('courts')
        .update({ name, size, court_type, description })
        .eq('id', sub)
        .select().single();
      if (error) throw error;

      // Replace slots if provided
      if (slots !== undefined) {
        await supabase.from('court_time_slots').delete().eq('court_id', sub);
        if (slots.length > 0) {
          const slotRows = slots.map((s: any) => ({
            court_id: sub,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            price_per_slot: s.price_per_slot ?? 0,
            slot_duration_minutes: s.slot_duration_minutes ?? 60,
            is_available: true,
          }));
          await supabase.from('court_time_slots').insert(slotRows);
        }
      }

      return ok(updated);
    }

    // DELETE /courts/:id — soft delete
    if (method === 'DELETE' && sub && !sub.includes('/')) {
      const { data: court } = await supabase.from('courts').select('turf_id').eq('id', sub).single();
      if (!court) return notFound('Court not found');

      const { data: turf } = await supabase.from('turfs').select('owner_id').eq('id', court.turf_id).single();
      if (!turf || turf.owner_id !== auth.user.id) return forbidden('Not authorized');

      await supabase.from('courts').update({ deleted_at: new Date().toISOString() }).eq('id', sub);
      return ok({ message: 'Court deleted' });
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
