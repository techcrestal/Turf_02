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

    // GET /users/me
    if (method === 'GET' && sub === 'me') {
      return ok(auth.user);
    }

    // PUT /users/me
    if (method === 'PUT' && sub === 'me') {
      const body = await req.json();
      const { name, email, username, age, favorite_sports } = body;
      const update: Record<string, any> = {};
      if (name !== undefined) update.name = name;
      if (email !== undefined) update.email = email;
      if (username !== undefined) update.username = username;
      if (age !== undefined) update.age = age;

      const { data: updated } = await supabase.from('users').update(update).eq('id', auth.user.id).select().single();

      if (favorite_sports !== undefined) {
        await supabase.from('user_sports').delete().eq('user_id', auth.user.id);
        if (favorite_sports.length) {
          await supabase.from('user_sports').insert(favorite_sports.map((sid: string) => ({ user_id: auth.user.id, sport_id: sid })));
        }
      }
      return ok(updated ?? auth.user);
    }

    // GET /users/:id
    if (method === 'GET' && sub && sub !== 'me') {
      const { data: user } = await supabase.from('users').select('*').eq('id', sub).single();
      if (!user) return notFound('User not found');
      return ok(user);
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
