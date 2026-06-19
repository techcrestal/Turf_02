import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, preflight } from '../_shared/response.ts';

const TURF_PARAMS = ['surface', 'facilities', 'lighting', 'cleanliness', 'value', 'staff'];

function avgRatings(rows: { parameters: Record<string, number> }[]) {
  const averages: Record<string, number> = {};
  for (const p of TURF_PARAMS) {
    const vals = rows.map((r) => Number(r.parameters?.[p])).filter((v) => v > 0);
    averages[p] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  const rated = TURF_PARAMS.filter((p) => averages[p] > 0);
  const overall = rated.length
    ? rated.reduce((s, p) => s + averages[p], 0) / rated.length
    : 0;
  return { overall: Math.round(overall * 10) / 10, averages };
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

    // ── Skills ───────────────────────────────────────────────────────────────

    // GET /ratings/skills — all sport skills (for profile skill picker)
    if (method === 'GET' && sub === 'skills') {
      const { data, error } = await supabase
        .from('sport_skills').select('id, sport_id, name, display_name').order('display_name');
      if (error) throw error;
      return ok(data ?? []);
    }

    // ── Turf ratings ─────────────────────────────────────────────────────────

    // GET /ratings/turf/:turfId — aggregated ratings for a turf
    if (method === 'GET' && sub.startsWith('turf/') && !sub.startsWith('turf/') === false) {
      const turfId = sub.slice('turf/'.length);
      if (!turfId.includes('/')) {
        const { data, error } = await supabase
          .from('turf_ratings').select('parameters').eq('turf_id', turfId);
        if (error) throw error;
        const rows = data ?? [];
        if (!rows.length) return ok({ count: 0, overall: 0, averages: {} });
        return ok({ count: rows.length, ...avgRatings(rows) });
      }
    }

    // GET /ratings/my-turf/:turfId — my rating for a turf
    if (method === 'GET' && sub.startsWith('my-turf/')) {
      const turfId = sub.slice('my-turf/'.length);
      const { data } = await supabase
        .from('turf_ratings').select('*').eq('turf_id', turfId).eq('user_id', auth.user.id).maybeSingle();
      return ok(data ?? null);
    }

    // POST /ratings/turf/:turfId — submit / update my rating
    if (method === 'POST' && sub.startsWith('turf/')) {
      const turfId = sub.slice('turf/'.length);
      const body = await req.json();
      const { parameters, review } = body;
      if (!parameters || typeof parameters !== 'object') return err('parameters required', 400);
      const { data, error } = await supabase
        .from('turf_ratings')
        .upsert(
          { user_id: auth.user.id, turf_id: turfId, parameters, review: review ?? null, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,turf_id' }
        )
        .select().single();
      if (error) throw error;
      return ok(data);
    }

    // ── Player ratings ────────────────────────────────────────────────────────

    // GET /ratings/player/:playerId — aggregated skill ratings for a player
    if (method === 'GET' && sub.startsWith('player/')) {
      const playerId = sub.slice('player/'.length);
      if (!playerId.includes('/')) {
        const { data: ratingRows, error } = await supabase
          .from('player_ratings').select('skill_id, rating').eq('player_id', playerId);
        if (error) throw error;
        if (!ratingRows?.length) return ok({ count: 0, skills: [] });
        // Avg per skill
        const map: Record<string, number[]> = {};
        for (const r of ratingRows) {
          if (!map[r.skill_id]) map[r.skill_id] = [];
          map[r.skill_id].push(r.rating);
        }
        const skillIds = Object.keys(map);
        const { data: skillData } = await supabase
          .from('sport_skills').select('id, display_name, sport_id').in('id', skillIds);
        const skillMeta = Object.fromEntries((skillData ?? []).map((s: any) => [s.id, s]));
        const skills = skillIds.map((sid) => {
          const vals = map[sid];
          return {
            skill_id: sid,
            display_name: skillMeta[sid]?.display_name ?? sid,
            sport_id: skillMeta[sid]?.sport_id,
            average: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
            count: vals.length,
          };
        }).sort((a, b) => b.average - a.average);
        const totalRaters = new Set(ratingRows.map((r) => r.skill_id)).size;
        return ok({ count: totalRaters, skills });
      }
    }

    // GET /ratings/my-player/:playerId — my ratings for a player
    if (method === 'GET' && sub.startsWith('my-player/')) {
      const playerId = sub.slice('my-player/'.length);
      const { data } = await supabase
        .from('player_ratings').select('skill_id, rating')
        .eq('rater_id', auth.user.id).eq('player_id', playerId);
      return ok(Object.fromEntries((data ?? []).map((r: any) => [r.skill_id, r.rating])));
    }

    // POST /ratings/player/:playerId — upsert ratings for a player's skills
    if (method === 'POST' && sub.startsWith('player/')) {
      const playerId = sub.slice('player/'.length);
      if (playerId === auth.user.id) return err('Cannot rate yourself', 400);
      const body = await req.json();
      const { ratings } = body; // { [skill_id]: 1-5 }
      if (!ratings || typeof ratings !== 'object') return err('ratings required', 400);
      const entries = Object.entries(ratings as Record<string, number>).filter(
        ([, v]) => typeof v === 'number' && v >= 1 && v <= 5
      );
      if (!entries.length) return err('No valid ratings provided', 400);
      const rows = entries.map(([skill_id, rating]) => ({
        rater_id: auth.user.id, player_id: playerId, skill_id, rating,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('player_ratings')
        .upsert(rows, { onConflict: 'rater_id,player_id,skill_id' });
      if (error) throw error;
      return ok({ message: 'Ratings saved' });
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
