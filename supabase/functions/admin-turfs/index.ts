import { getSupabase } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { ok, err, unauthorized, forbidden, notFound, preflight } from '../_shared/response.ts';

type AdminUser = { id: string; email: string; name: string; role: string; turf_id: string | null };

async function getAdminUser(req: Request): Promise<AdminUser | null> {
  const token = req.headers.get('x-admin-token');
  if (!token) return null;
  const supabase = getSupabase();
  const { data: session } = await supabase
    .from('admin_portal_sessions')
    .select('*, user:admin_portal_users(id, email, name, role, turf_id, is_active)')
    .eq('token', token)
    .gte('expires_at', new Date().toISOString())
    .single();
  if (!session?.user?.is_active) return null;
  return session.user as AdminUser;
}

function canAccessTurf(user: AdminUser, turfId: string): boolean {
  if (user.role === 'administrator') return true;
  return user.turf_id === turfId;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(corsHeaders);

  const user = await getAdminUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const clean = url.pathname.replace(/^.*\/admin-turfs\/?/, '');
  const segs = clean.split('/').filter(Boolean);
  // segs: [] | [turfId] | [turfId, 'courts'|'photos'|'settings'|'bookings']
  //        | [turfId, 'courts', courtId] | [turfId, 'courts', courtId, 'slots']
  //        | [turfId, 'photos', photoId] | [turfId, 'bookings', bookingId]

  const supabase = getSupabase();

  // ── GET / → list turfs ──────────────────────────────────────────────────────
  if (req.method === 'GET' && segs.length === 0) {
    let query = supabase
      .from('turfs')
      .select(`
        id, name, city, state, status, sport_id,
        opening_time, closing_time, contact_number, turf_email,
        address, latitude, longitude,
        sports(name),
        courts(count),
        turf_photos(url, is_primary)
      `)
      .order('name');
    if (user.role === 'turf_owner' && user.turf_id) {
      query = query.eq('id', user.turf_id);
    }
    const { data, error } = await query;
    if (error) return err(error.message);
    return ok({ turfs: data ?? [] });
  }

  const [turfId, resource, resourceId, subResource] = segs;
  if (!turfId) return notFound();
  if (!canAccessTurf(user, turfId)) return forbidden();

  // ── GET /:id → turf detail ──────────────────────────────────────────────────
  if (req.method === 'GET' && !resource) {
    const { data, error } = await supabase
      .from('turfs')
      .select(`*, sports(id, name)`)
      .eq('id', turfId)
      .single();
    if (error) return notFound();
    return ok({ turf: data });
  }

  // ── PUT /:id → update turf basic info ───────────────────────────────────────
  if (req.method === 'PUT' && !resource) {
    const body = await req.json();
    const allowed = ['name','description','address','city','state','contact_number','turf_email','opening_time','closing_time','status'];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (body[k] !== undefined) update[k] = body[k];
    update.updated_at = new Date().toISOString();
    const { error } = await supabase.from('turfs').update(update).eq('id', turfId);
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  // ─────────────────────────────── PHOTOS ─────────────────────────────────────

  // GET /:id/photos
  if (req.method === 'GET' && resource === 'photos' && !resourceId) {
    const { data, error } = await supabase
      .from('turf_photos')
      .select('id, url, is_primary, sort_order')
      .eq('turf_id', turfId)
      .order('sort_order');
    if (error) return err(error.message);
    return ok({ photos: data ?? [] });
  }

  // POST /:id/photos
  if (req.method === 'POST' && resource === 'photos' && !resourceId) {
    const { url: photoUrl, is_primary = false } = await req.json();
    if (!photoUrl) return err('url required');
    const { data: maxRow } = await supabase
      .from('turf_photos').select('sort_order').eq('turf_id', turfId).order('sort_order', { ascending: false }).limit(1).single();
    const sort_order = (maxRow?.sort_order ?? -1) + 1;
    if (is_primary) await supabase.from('turf_photos').update({ is_primary: false }).eq('turf_id', turfId);
    const { data, error } = await supabase.from('turf_photos').insert({ turf_id: turfId, url: photoUrl, is_primary, sort_order }).select().single();
    if (error) return err(error.message);
    return ok({ photo: data }, 201);
  }

  // DELETE /:id/photos/:photoId
  if (req.method === 'DELETE' && resource === 'photos' && resourceId) {
    const { error } = await supabase.from('turf_photos').delete().eq('id', resourceId).eq('turf_id', turfId);
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  // ─────────────────────────────── COURTS ─────────────────────────────────────

  // GET /:id/courts
  if (req.method === 'GET' && resource === 'courts' && !resourceId) {
    const { data, error } = await supabase
      .from('courts')
      .select('id, name, size, court_type, description, sort_order, deleted_at')
      .eq('turf_id', turfId)
      .is('deleted_at', null)
      .order('sort_order');
    if (error) return err(error.message);
    return ok({ courts: data ?? [] });
  }

  // POST /:id/courts
  if (req.method === 'POST' && resource === 'courts' && !resourceId) {
    const { name, size, court_type, description } = await req.json();
    if (!name) return err('name required');
    const { data: maxRow } = await supabase
      .from('courts').select('sort_order').eq('turf_id', turfId).order('sort_order', { ascending: false }).limit(1).single();
    const sort_order = (maxRow?.sort_order ?? -1) + 1;
    const { data, error } = await supabase.from('courts')
      .insert({ turf_id: turfId, name, size: size ?? '5-a-side', court_type: court_type ?? 'Artificial Turf', description, sort_order })
      .select().single();
    if (error) return err(error.message);
    return ok({ court: data }, 201);
  }

  // PUT /:id/courts/:courtId
  if (req.method === 'PUT' && resource === 'courts' && resourceId && !subResource) {
    const body = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const k of ['name','size','court_type','description','sort_order']) {
      if (body[k] !== undefined) update[k] = body[k];
    }
    const { error } = await supabase.from('courts').update(update).eq('id', resourceId).eq('turf_id', turfId);
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  // DELETE /:id/courts/:courtId (soft delete)
  if (req.method === 'DELETE' && resource === 'courts' && resourceId && !subResource) {
    const { error } = await supabase.from('courts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', resourceId).eq('turf_id', turfId);
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  // GET /:id/courts/:courtId/slots
  if (req.method === 'GET' && resource === 'courts' && resourceId && subResource === 'slots') {
    const { data, error } = await supabase
      .from('court_time_slots')
      .select('id, day_of_week, start_time, end_time, price_per_slot')
      .eq('court_id', resourceId)
      .order('day_of_week').order('start_time');
    if (error) return err(error.message);
    return ok({ slots: data ?? [] });
  }

  // PUT /:id/courts/:courtId/slots (replace all slots)
  if (req.method === 'PUT' && resource === 'courts' && resourceId && subResource === 'slots') {
    const { slots } = await req.json() as { slots: Array<{ day_of_week: number; start_time: string; end_time: string; price_per_slot: number }> };
    // Delete all existing, then insert non-zero
    await supabase.from('court_time_slots').delete().eq('court_id', resourceId);
    const toInsert = (slots ?? []).filter(s => s.price_per_slot > 0).map(s => ({
      court_id: resourceId,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
      price_per_slot: s.price_per_slot,
      slot_duration_minutes: 60,
    }));
    if (toInsert.length > 0) {
      const { error } = await supabase.from('court_time_slots').insert(toInsert);
      if (error) return err(error.message);
    }
    return ok({ ok: true, count: toInsert.length });
  }

  // ─────────────────────────────── SETTINGS ───────────────────────────────────

  // GET /:id/settings
  if (req.method === 'GET' && resource === 'settings') {
    const { data } = await supabase.from('turf_settings').select('*').eq('turf_id', turfId).single();
    return ok({ settings: data ?? null });
  }

  // PUT /:id/settings
  if (req.method === 'PUT' && resource === 'settings') {
    const body = await req.json();
    // Commission is admin-only
    if (body.commission_percentage !== undefined && user.role !== 'administrator') {
      return forbidden('Only administrators can change commission');
    }
    const upsertData: Record<string, unknown> = {
      turf_id: turfId,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };
    const fields = [
      'advance_payment_enabled','advance_payment_type','advance_payment_value',
      'cancellation_enabled','cancellation_window_hours','cancellation_refund_percentage','cancellation_notes',
      'commission_percentage',
    ];
    for (const k of fields) if (body[k] !== undefined) upsertData[k] = body[k];
    const { error } = await supabase.from('turf_settings').upsert(upsertData, { onConflict: 'turf_id' });
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  // ─────────────────────────────── BOOKINGS ───────────────────────────────────

  // GET /:id/bookings
  if (req.method === 'GET' && resource === 'bookings' && !resourceId) {
    const { data, error } = await supabase
      .from('manual_bookings')
      .select(`*, court:courts(name)`)
      .eq('turf_id', turfId)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });
    if (error) return err(error.message);
    return ok({ bookings: data ?? [] });
  }

  // POST /:id/bookings
  if (req.method === 'POST' && resource === 'bookings' && !resourceId) {
    const { court_id, booking_date, start_time, end_time, customer_name, customer_phone, total_amount, payment_status, notes } = await req.json();
    if (!booking_date || !start_time || !end_time || !customer_name) return err('Missing required fields');
    const { data, error } = await supabase.from('manual_bookings').insert({
      turf_id: turfId, court_id: court_id ?? null, booking_date, start_time, end_time,
      customer_name, customer_phone, total_amount: total_amount ?? 0,
      payment_status: payment_status ?? 'paid', notes, created_by: user.id,
    }).select().single();
    if (error) return err(error.message);
    return ok({ booking: data }, 201);
  }

  // DELETE /:id/bookings/:bookingId
  if (req.method === 'DELETE' && resource === 'bookings' && resourceId) {
    const { error } = await supabase.from('manual_bookings').delete().eq('id', resourceId).eq('turf_id', turfId);
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  return notFound();
});
