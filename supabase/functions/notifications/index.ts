import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, preflight } from '../_shared/response.ts';

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

    // GET /notifications — lazy-clean expired entries first
    if (method === 'GET' && sub === '') {
      // Soft-delete notifications that expired more than now
      await supabase.from('notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('user_id', auth.user.id)
        .lt('expires_at', new Date().toISOString())
        .is('deleted_at', null);

      const { data, error } = await supabase
        .from('notifications').select('*').eq('user_id', auth.user.id)
        .is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return ok(data ?? []);
    }

    // PUT /notifications/:id/read
    if (method === 'PUT' && sub.endsWith('/read')) {
      const notifId = sub.replace('/read', '');
      const { data, error } = await supabase
        .from('notifications').update({ is_read: true })
        .eq('id', notifId).eq('user_id', auth.user.id).select().single();
      if (error || !data) return notFound('Notification not found');
      return ok(data);
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
