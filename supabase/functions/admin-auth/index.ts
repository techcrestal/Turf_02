import { getSupabase } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { ok, err, unauthorized, preflight } from '../_shared/response.ts';

const TOKEN_EXPIRY_DAYS = 7;

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getAdminUser(req: Request) {
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
  return session.user as { id: string; email: string; name: string; role: string; turf_id: string | null; is_active: boolean };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(corsHeaders);

  const url = new URL(req.url);
  const clean = url.pathname.replace(/^.*\/admin-auth\/?/, '');
  const [action, subId, subAction] = clean.split('/').filter(Boolean);
  const supabase = getSupabase();

  // POST /admin-auth/login
  if (req.method === 'POST' && action === 'login') {
    const { email, password } = await req.json();
    if (!email || !password) return err('Email and password required');

    const { data: users, error } = await supabase.rpc('verify_admin_password', {
      p_email: email,
      p_password: password,
    });
    if (error) return err('Authentication failed');
    if (!users || users.length === 0) return unauthorized('Invalid credentials');

    const user = users[0];
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 864e5).toISOString();
    await supabase.from('admin_portal_sessions').insert({ user_id: user.id, token, expires_at: expiresAt });
    return ok({ token, user, expires_at: expiresAt });
  }

  // GET /admin-auth/me
  if (req.method === 'GET' && action === 'me') {
    const user = await getAdminUser(req);
    if (!user) return unauthorized();
    return ok({ user });
  }

  // POST /admin-auth/logout
  if (req.method === 'POST' && action === 'logout') {
    const token = req.headers.get('x-admin-token');
    if (token) await supabase.from('admin_portal_sessions').delete().eq('token', token);
    return ok({ ok: true });
  }

  // GET /admin-auth/users  (admin only)
  if (req.method === 'GET' && action === 'users' && !subId) {
    const user = await getAdminUser(req);
    if (!user) return unauthorized();
    if (user.role !== 'administrator') return err('Admin only', 403);
    const { data } = await supabase
      .from('admin_portal_users')
      .select('id, email, name, role, turf_id, is_active, created_at')
      .order('created_at');
    return ok({ users: data ?? [] });
  }

  // POST /admin-auth/users  (admin only - create portal user)
  if (req.method === 'POST' && action === 'users' && !subId) {
    const user = await getAdminUser(req);
    if (!user) return unauthorized();
    if (user.role !== 'administrator') return err('Admin only', 403);
    const { email, name, role, turf_id, password } = await req.json();
    if (!email || !name || !role || !password) return err('Missing required fields');
    const { data: newId, error } = await supabase.rpc('create_admin_portal_user', {
      p_email: email, p_password: password, p_name: name, p_role: role,
      p_turf_id: turf_id ?? null,
    });
    if (error) return err(error.message);
    return ok({ id: newId }, 201);
  }

  // PUT /admin-auth/users/:id  (admin only - update user info)
  if (req.method === 'PUT' && action === 'users' && subId && !subAction) {
    const user = await getAdminUser(req);
    if (!user) return unauthorized();
    if (user.role !== 'administrator') return err('Admin only', 403);
    const { name, role, turf_id, is_active } = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (role !== undefined) update.role = role;
    if (turf_id !== undefined) update.turf_id = turf_id;
    if (is_active !== undefined) update.is_active = is_active;
    const { error } = await supabase.from('admin_portal_users').update(update).eq('id', subId);
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  // PUT /admin-auth/users/:id/password  (admin only)
  if (req.method === 'PUT' && action === 'users' && subId && subAction === 'password') {
    const user = await getAdminUser(req);
    if (!user) return unauthorized();
    if (user.role !== 'administrator') return err('Admin only', 403);
    const { password } = await req.json();
    if (!password) return err('Password required');
    const { error } = await supabase.rpc('update_admin_portal_password', { p_id: subId, p_password: password });
    if (error) return err(error.message);
    return ok({ ok: true });
  }

  return err('Not found', 404);
});
