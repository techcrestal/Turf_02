import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, forbidden, conflict, preflight } from '../_shared/response.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(corsHeaders);

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(1).join('/'); // after 'turfs'
  const supabase = getSupabase();
  const method = req.method;

  try {
    // GET /turfs/my — owner's turfs (protected)
    if (method === 'GET' && sub === 'my') {
      const auth = await authenticate(req);
      if (!auth) return unauthorized();
      const { data, error } = await supabase
        .from('turfs').select('*')
        .eq('owner_id', auth.user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ok(data ?? []);
    }

    // GET /turfs — public list
    if (method === 'GET' && sub === '') {
      let query = supabase.from('turfs').select('*').is('deleted_at', null).eq('status', 'active');
      const sportId = url.searchParams.get('sport_id');
      const city = url.searchParams.get('city');
      const ownerId = url.searchParams.get('owner_id');
      if (sportId) query = query.eq('sport_id', sportId);
      if (city) query = query.ilike('city', `%${city}%`);
      if (ownerId) query = query.eq('owner_id', ownerId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return ok(data ?? []);
    }

    // GET /turfs/:id
    if (method === 'GET' && sub && !sub.includes('/')) {
      const { data: turf, error } = await supabase
        .from('turfs').select('*').eq('id', sub).single();
      if (error || !turf) return notFound('Turf not found');
      if (turf.deleted_at) return notFound('Turf not found');
      if (!turf.is_public) return forbidden('This turf is private');
      return ok(turf);
    }

    // POST /turfs — create (protected)
    if (method === 'POST' && sub === '') {
      const auth = await authenticate(req);
      if (!auth) return unauthorized();
      const body = await req.json();
      const { data, error } = await supabase
        .from('turfs')
        .insert({ ...body, owner_id: auth.user.id })
        .select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // PUT /turfs/:id — update (protected)
    if (method === 'PUT' && sub && !sub.includes('/')) {
      const auth = await authenticate(req);
      if (!auth) return unauthorized();
      const { data: existing } = await supabase.from('turfs').select('*').eq('id', sub).single();
      if (!existing || existing.deleted_at) return notFound('Turf not found');
      if (existing.owner_id !== auth.user.id) return forbidden('Not authorized');
      const body = await req.json();
      const { data, error } = await supabase.from('turfs').update(body).eq('id', sub).select().single();
      if (error) throw error;
      return ok(data);
    }

    // DELETE /turfs/:id — soft delete (protected)
    if (method === 'DELETE' && sub && !sub.includes('/')) {
      const auth = await authenticate(req);
      if (!auth) return unauthorized();
      const { data: existing } = await supabase.from('turfs').select('*').eq('id', sub).single();
      if (!existing || existing.deleted_at) return notFound('Turf not found');
      if (existing.owner_id !== auth.user.id) return forbidden('Not authorized');
      await supabase.from('turfs').update({ deleted_at: new Date().toISOString() }).eq('id', sub);
      return ok({ message: 'Turf deleted' });
    }

    // GET /turfs/:id/photos — public, no auth required
    if (method === 'GET' && sub.includes('/') && sub.endsWith('/photos')) {
      const turfId = sub.split('/')[0];
      const { data, error } = await supabase
        .from('turf_photos').select('*').eq('turf_id', turfId).order('sort_order', { ascending: true });
      if (error) throw error;
      return ok(data ?? []);
    }

    // POST /turfs/:id/photos — save photo URLs after storage upload (protected)
    if (method === 'POST' && sub.includes('/') && sub.endsWith('/photos')) {
      const turfId = sub.split('/')[0];
      const auth = await authenticate(req);
      if (!auth) return unauthorized();

      const { data: turf } = await supabase.from('turfs').select('owner_id, deleted_at').eq('id', turfId).single();
      if (!turf || turf.deleted_at) return notFound('Turf not found');
      if (turf.owner_id !== auth.user.id) return forbidden('Not authorized');

      const { photos } = await req.json();
      if (!Array.isArray(photos) || photos.length === 0)
        return err('photos array is required', 400, 'VALIDATION_ERROR');

      const rows = photos.map((p: { url: string; is_primary: boolean; sort_order: number }) => ({
        turf_id: turfId,
        url: p.url,
        is_primary: p.is_primary ?? false,
        sort_order: p.sort_order ?? 0,
      }));

      const { data, error } = await supabase.from('turf_photos').insert(rows).select();
      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
