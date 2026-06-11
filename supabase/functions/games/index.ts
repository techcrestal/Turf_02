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
    // GET /games/public — no auth required
    if (method === 'GET' && sub === 'public') {
      const { data, error } = await supabase
        .from('games').select('*')
        .eq('type', 'public').eq('status', 'open')
        .is('deleted_at', null)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return ok(data ?? []);
    }

    // All routes below require auth
    const auth = await authenticate(req);
    if (!auth) return unauthorized();

    // GET /games/my
    if (method === 'GET' && sub === 'my') {
      const { data, error } = await supabase
        .from('games').select('*')
        .eq('creator_id', auth.user.id)
        .is('deleted_at', null)
        .order('start_time', { ascending: true });
      if (error) throw error;
      return ok(data ?? []);
    }

    // GET /games/:id
    if (method === 'GET' && sub && !sub.includes('/')) {
      const { data: game } = await supabase.from('games').select('*').eq('id', sub).single();
      if (!game || game.deleted_at) return notFound('Game not found');
      return ok(game);
    }

    // POST /games — create
    if (method === 'POST' && sub === '') {
      const body = await req.json();
      const { turf_id, sport_id, title, description, type = 'public', entry_fee = 0, max_players = 10, start_time, end_time } = body;
      const endTime = end_time ?? new Date(new Date(start_time).getTime() + 2 * 3600000).toISOString();
      const { data, error } = await supabase
        .from('games')
        .insert({
          creator_id: auth.user.id, turf_id, sport_id, title, description,
          type, entry_fee, max_players, status: 'open', start_time, end_time: endTime,
        })
        .select().single();
      if (error) throw error;

      // Add creator as player
      await supabase.from('game_players').insert({
        game_id: data.id, user_id: auth.user.id, role: 'creator', status: 'joined', joined_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /games/:id/join
    if (method === 'POST' && sub.endsWith('/join')) {
      const gameId = sub.split('/')[0];
      const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (!game || game.deleted_at) return notFound('Game not found');
      if (game.status !== 'open') return conflict('Game is not open for joining');
      if (game.creator_id === auth.user.id) return conflict('Creator cannot join their own game');

      if (game.type === 'private') {
        const { data: invite } = await supabase.from('game_players')
          .select('id').eq('game_id', gameId).eq('user_id', auth.user.id).single();
        if (!invite) return forbidden('You need an invitation to join this private game');
      }

      // Check if already joined
      const { data: existing } = await supabase.from('game_players')
        .select('id, status').eq('game_id', gameId).eq('user_id', auth.user.id).single();

      let result;
      if (existing) {
        const { data, error } = await supabase.from('game_players')
          .update({ status: 'joined', joined_at: new Date().toISOString() })
          .eq('id', existing.id).select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase.from('game_players')
          .insert({ game_id: gameId, user_id: auth.user.id, role: 'player', status: 'joined', joined_at: new Date().toISOString() })
          .select().single();
        if (error) throw error;
        result = data;
      }

      // Check if full
      const { count } = await supabase.from('game_players')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameId).eq('status', 'joined');
      if ((count ?? 0) >= game.max_players) {
        await supabase.from('games').update({ status: 'full' }).eq('id', gameId);
      }

      return new Response(JSON.stringify(result), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // POST /games/:id/invite
    if (method === 'POST' && sub.endsWith('/invite')) {
      const gameId = sub.split('/')[0];
      const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (!game) return notFound('Game not found');
      if (game.creator_id !== auth.user.id) return forbidden('Only creator can invite');
      const { invitee_user_ids } = await req.json();
      const records = invitee_user_ids.map((uid: string) => ({
        game_id: gameId, user_id: uid, role: 'invitee', status: 'invited',
      }));
      const { data, error } = await supabase.from('game_players').insert(records).select();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // PUT /games/:id/leave
    if (method === 'PUT' && sub.endsWith('/leave')) {
      const gameId = sub.split('/')[0];
      const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (!game) return notFound('Game not found');
      if (game.creator_id === auth.user.id) return conflict('Creator cannot leave their own game');
      const { data, error } = await supabase.from('game_players')
        .update({ status: 'left', left_at: new Date().toISOString() })
        .eq('game_id', gameId).eq('user_id', auth.user.id).select().single();
      if (error) throw error;
      // Re-open if was full
      if (game.status === 'full') {
        await supabase.from('games').update({ status: 'open' }).eq('id', gameId);
      }
      return ok(data);
    }

    // PUT /games/:id/cancel
    if (method === 'PUT' && sub.endsWith('/cancel')) {
      const gameId = sub.split('/')[0];
      const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (!game) return notFound('Game not found');
      if (game.creator_id !== auth.user.id) return forbidden('Only creator can cancel');
      const { data, error } = await supabase.from('games')
        .update({ status: 'cancelled' }).eq('id', gameId).select().single();
      if (error) throw error;
      return ok(data);
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
