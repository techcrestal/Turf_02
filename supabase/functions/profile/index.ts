import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, preflight } from '../_shared/response.ts';

async function getProfile(supabase: any, userId: string) {
  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
  if (!user) return null;
  const { data: favs } = await supabase.from('user_sports').select('sport_id').eq('user_id', userId);
  const { data: skills } = await supabase.from('user_skills').select('skill_id').eq('user_id', userId);
  return {
    ...user,
    favorite_sports: (favs ?? []).map((r: any) => r.sport_id),
    skill_ids: (skills ?? []).map((r: any) => r.skill_id),
  };
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

    // GET /profile
    if (method === 'GET' && sub === '') {
      const profile = await getProfile(supabase, auth.user.id);
      if (!profile) return notFound('User not found');
      return ok(profile);
    }

    // POST /profile — create profile
    if (method === 'POST' && sub === '') {
      const body = await req.json();
      const { name, email, username, age, favorite_sports, skill_ids, home_lat, home_lng } = body;
      const userUpdate: Record<string, any> = { name, email, username, age, profile_completed: true };
      if (home_lat !== undefined) userUpdate.home_lat = home_lat;
      if (home_lng !== undefined) userUpdate.home_lng = home_lng;
      await supabase.from('users').update(userUpdate).eq('id', auth.user.id);
      await supabase.from('user_sports').delete().eq('user_id', auth.user.id);
      if (favorite_sports?.length) {
        await supabase.from('user_sports').insert(favorite_sports.map((sid: string) => ({ user_id: auth.user.id, sport_id: sid })));
      }
      await supabase.from('user_skills').delete().eq('user_id', auth.user.id);
      if (skill_ids?.length) {
        await supabase.from('user_skills').insert(skill_ids.map((sid: string) => ({ user_id: auth.user.id, skill_id: sid })));
      }
      const profile = await getProfile(supabase, auth.user.id);
      return new Response(JSON.stringify(profile), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // PUT /profile — update profile
    if (method === 'PUT' && sub === '') {
      const body = await req.json();
      const { name, email, username, age, favorite_sports, skill_ids, home_lat, home_lng } = body;
      const update: Record<string, any> = {};
      if (name !== undefined) update.name = name;
      if (email !== undefined) update.email = email;
      if (username !== undefined) update.username = username;
      if (age !== undefined) update.age = age;
      if (home_lat !== undefined) update.home_lat = home_lat;
      if (home_lng !== undefined) update.home_lng = home_lng;
      if (Object.keys(update).length) {
        await supabase.from('users').update(update).eq('id', auth.user.id);
      }
      if (favorite_sports !== undefined) {
        await supabase.from('user_sports').delete().eq('user_id', auth.user.id);
        if (favorite_sports.length) {
          await supabase.from('user_sports').insert(favorite_sports.map((sid: string) => ({ user_id: auth.user.id, sport_id: sid })));
        }
      }
      if (skill_ids !== undefined) {
        await supabase.from('user_skills').delete().eq('user_id', auth.user.id);
        if (skill_ids.length) {
          await supabase.from('user_skills').insert(skill_ids.map((sid: string) => ({ user_id: auth.user.id, skill_id: sid })));
        }
      }
      const profile = await getProfile(supabase, auth.user.id);
      return ok(profile);
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
