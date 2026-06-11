import { getSupabase } from './supabase.ts';

export async function authenticate(req: Request): Promise<{ user: any; token: string } | null> {
  // Primary: custom session token in X-Session-Token header
  // Supabase gateway requires a valid JWT in Authorization, so our hex session
  // tokens travel in this separate header instead.
  const token = req.headers.get('x-session-token') ?? (() => {
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return null;
    const t = auth.replace('Bearer ', '').trim();
    // Accept Bearer only if it looks like a hex session token (no dots = not a JWT)
    return t && !t.includes('.') ? t : null;
  })();
  if (!token) return null;

  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: session } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .gte('expires_at', now)
    .single();

  if (!session) return null;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user_id)
    .single();

  if (!user) return null;

  // Refresh last_active_at (fire & forget)
  supabase.from('user_sessions').update({ last_active_at: now }).eq('token', token).then(() => {});

  return { user, token };
}
