import { corsHeaders } from '../_shared/cors.ts';
import { getSupabase } from '../_shared/supabase.ts';
import { authenticate } from '../_shared/auth.ts';
import { ok, err, unauthorized, notFound, conflict, preflight } from '../_shared/response.ts';

const STATIC_OTP = '123456';
const OTP_TTL_MINUTES = 10;
const SESSION_TTL_DAYS = 14;

function addMinutes(m: number) { return new Date(Date.now() + m * 60000).toISOString(); }
function addDays(d: number) { return new Date(Date.now() + d * 86400000).toISOString(); }

function randomHex(bytes = 32): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function createSession(supabase: ReturnType<typeof getSupabase>, userId: string) {
  const token = randomHex(32);
  return supabase
    .from('user_sessions')
    .insert({ user_id: userId, token, expires_at: addDays(SESSION_TTL_DAYS) })
    .select().single()
    .then(({ data, error }) => {
      if (error) throw error;
      return { token, expiresAt: data.expires_at };
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight(corsHeaders);

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const sub = parts.slice(1).join('/');
  const supabase = getSupabase();

  try {
    // POST /auth/check-user — check if phone or email already has an account
    if (req.method === 'POST' && sub === 'check-user') {
      const body = await req.json();
      const identifier = body.identifier;
      if (!identifier) return err('identifier is required');

      const isEmail = identifier.includes('@');
      const { data: users } = await supabase
        .from('users')
        .select('id, phone_number, email')
        .is('deleted_at', null)
        .eq(isEmail ? 'email' : 'phone_number', identifier)
        .limit(1);

      const user = users?.[0] ?? null;
      return ok({ exists: !!user, phone_number: user?.phone_number ?? null });
    }

    // POST /auth/send-otp
    if (req.method === 'POST' && sub === 'send-otp') {
      const body = await req.json();
      const phone = body.phone_number ?? body.phoneNumber;
      if (!phone) return err('phone_number is required');

      await supabase.from('otp_verifications')
        .update({ used_at: new Date().toISOString() })
        .eq('phone_number', phone)
        .is('used_at', null);

      const expiresAt = addMinutes(OTP_TTL_MINUTES);
      const { error: insertErr } = await supabase.from('otp_verifications')
        .insert({ phone_number: phone, otp_code: STATIC_OTP, expires_at: expiresAt, attempts: 0 });
      if (insertErr) throw insertErr;

      return ok({ message: 'OTP sent. For MVP use code 123456.', expiresAt });
    }

    // POST /auth/verify-otp
    if (req.method === 'POST' && sub === 'verify-otp') {
      const body = await req.json();
      const phone = body.phone_number ?? body.phoneNumber;
      const otp = body.otp;

      if (!phone) return err('phone_number is required');
      if (!otp) return err('otp is required');
      if (otp !== STATIC_OTP) return unauthorized('Invalid OTP code');

      const now = new Date().toISOString();
      const { data: otpRows } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('phone_number', phone)
        .eq('otp_code', otp)
        .is('used_at', null)
        .gte('expires_at', now)
        .order('created_at', { ascending: false })
        .limit(1);

      const otpRecord = otpRows?.[0] ?? null;
      if (!otpRecord) return unauthorized('OTP has expired or is invalid');

      await supabase.from('otp_verifications')
        .update({ used_at: now, verified_at: now })
        .eq('id', otpRecord.id);

      let { data: user } = await supabase
        .from('users').select('*').eq('phone_number', phone).single();

      if (!user) {
        const { data: newUser, error } = await supabase.from('users')
          .insert({ phone_number: phone, is_phone_verified: true, profile_completed: false, role: 'customer' })
          .select().single();
        if (error) return conflict('Unable to create user');
        user = newUser;
      } else {
        await supabase.from('users').update({ is_phone_verified: true }).eq('id', user.id);
        user.is_phone_verified = true;
      }

      const sess = await createSession(supabase, user.id);
      return new Response(JSON.stringify({ accessToken: sess.token, expiresAt: sess.expiresAt, user }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /auth/register — full customer registration
    if (req.method === 'POST' && sub === 'register') {
      const body = await req.json();
      const { phone_number, email, username, password, first_name, last_name, middle_name, gender, dob, favorite_sports, promotions_opt_in } = body;

      if (!email) return err('email is required');
      if (!username) return err('username is required');
      if (!first_name || !last_name) return err('first_name and last_name are required');
      if (!password || password.length < 6) return err('password must be at least 6 characters');

      const orFilter = [`email.eq.${email}`, `username.eq.${username}`];
      if (phone_number) orFilter.push(`phone_number.eq.${phone_number}`);
      const { data: existing } = await supabase.from('users')
        .select('id, email, username, phone_number')
        .is('deleted_at', null)
        .or(orFilter.join(','))
        .limit(1);
      if (existing?.length) {
        const clash = existing[0];
        if (clash.email === email) return conflict('Email already registered');
        if (clash.username === username) return conflict('Username already taken');
        if (clash.phone_number === phone_number) return conflict('Phone number already registered');
      }

      const passwordHash = await hashPassword(password);

      const { data: user, error } = await supabase.from('users').insert({
        phone_number: phone_number || null,
        email,
        username,
        first_name,
        last_name,
        middle_name: middle_name || null,
        gender: gender || null,
        dob: dob || null,
        password_hash: passwordHash,
        name: `${first_name} ${last_name}`,
        is_phone_verified: false,
        profile_completed: true,
        role: 'customer',
        promotions_opt_in: promotions_opt_in ?? false,
        terms_accepted_at: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      if (Array.isArray(favorite_sports) && favorite_sports.length > 0) {
        await supabase.from('user_sports').insert(
          favorite_sports.map((sportId: string) => ({ user_id: user.id, sport_id: sportId }))
        );
      }

      const sess = await createSession(supabase, user.id);
      return new Response(JSON.stringify({ accessToken: sess.token, expiresAt: sess.expiresAt, user }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /auth/login-password — login with username/email/phone + password
    if (req.method === 'POST' && sub === 'login-password') {
      const body = await req.json();
      const { identifier, password } = body;
      if (!identifier || !password) return err('identifier and password are required');

      const isEmail = identifier.includes('@');
      const isPhone = /^\d+$/.test(identifier);
      const field = isEmail ? 'email' : isPhone ? 'phone_number' : 'username';

      const { data: users } = await supabase
        .from('users').select('*').is('deleted_at', null)
        .eq(field, identifier).limit(1);
      const user = users?.[0] ?? null;

      if (!user) return unauthorized('No account found with those details');
      if (!user.password_hash) return unauthorized('This account uses OTP login. Please use OTP instead.');

      const hash = await hashPassword(password);
      if (hash !== user.password_hash) return unauthorized('Incorrect password');

      const sess = await createSession(supabase, user.id);
      return new Response(JSON.stringify({ accessToken: sess.token, expiresAt: sess.expiresAt, user }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /auth/register-owner — public, submits an owner registration request
    if (req.method === 'POST' && sub === 'register-owner') {
      const body = await req.json();
      const { first_name, last_name, phone_number, email, turf_data } = body;

      if (!first_name || !last_name) return err('first_name and last_name are required');
      if (!phone_number) return err('phone_number is required');
      if (!email) return err('email is required');
      if (!turf_data || !turf_data.name) return err('turf_data with name is required');

      // Prevent duplicate pending requests for same phone
      const { data: existing } = await supabase
        .from('owner_registrations')
        .select('id, status')
        .eq('phone_number', phone_number)
        .in('status', ['pending', 'approved'])
        .limit(1);
      if (existing?.length) {
        const s = existing[0].status;
        return conflict(s === 'approved' ? 'An account already exists for this phone number' : 'A pending registration already exists for this phone number');
      }

      const { error } = await supabase.from('owner_registrations').insert({
        first_name, last_name, phone_number, email, turf_data,
      });
      if (error) throw error;

      return ok({ message: 'Registration submitted. You will be notified once an admin reviews your request.' });
    }

    // GET /auth/admin/registrations — admin only
    if (req.method === 'GET' && sub === 'admin/registrations') {
      const auth = await authenticate(req);
      if (!auth || auth.user.role !== 'admin') return unauthorized('Admin access required');

      const { data } = await supabase
        .from('owner_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      return ok({ registrations: data ?? [] });
    }

    // POST /auth/admin/approve/:id — create owner user + turf from registration
    if (req.method === 'POST' && sub.startsWith('admin/approve/')) {
      const registrationId = sub.split('/')[2];
      const auth = await authenticate(req);
      if (!auth || auth.user.role !== 'admin') return unauthorized('Admin access required');

      const body = await req.json();
      const { username, password } = body;
      if (!username || !password) return err('username and password are required');
      if (password.length < 6) return err('password must be at least 6 characters');

      const { data: reg } = await supabase
        .from('owner_registrations')
        .select('*')
        .eq('id', registrationId)
        .single();
      if (!reg) return notFound('Registration not found');
      if (reg.status !== 'pending') return err(`Registration is already ${reg.status}`);

      // Username uniqueness check
      const { data: existingUser } = await supabase
        .from('users').select('id').eq('username', username).limit(1);
      if (existingUser?.length) return conflict('Username already taken');

      const passwordHash = await hashPassword(password);

      // Create owner user
      const { data: owner, error: userErr } = await supabase.from('users').insert({
        username,
        password_hash: passwordHash,
        first_name: reg.first_name,
        last_name: reg.last_name,
        name: `${reg.first_name} ${reg.last_name}`,
        phone_number: reg.phone_number,
        email: reg.email,
        role: 'owner',
        profile_completed: true,
        is_phone_verified: false,
        terms_accepted_at: new Date().toISOString(),
      }).select().single();
      if (userErr) throw userErr;

      // Create turf
      const td = reg.turf_data as Record<string, unknown>;
      const { data: turf, error: turfErr } = await supabase.from('turfs').insert({
        owner_id: owner.id,
        sport_id: td.sport_id,
        name: td.name,
        description: td.description || null,
        address: td.address,
        city: td.city,
        state: td.state || null,
        country: td.country || 'India',
        price_per_hour: td.price_per_hour,
        capacity: td.capacity || 22,
        status: 'active',
        is_public: true,
        contact_number: td.contact_number || null,
        turf_email: td.turf_email || null,
        opening_time: td.opening_time || null,
        closing_time: td.closing_time || null,
      }).select().single();
      if (turfErr) throw turfErr;

      // Create courts + slots
      const courts = (td.courts as unknown[]) ?? [];
      for (let i = 0; i < courts.length; i++) {
        const c = courts[i] as Record<string, unknown>;
        const { data: court } = await supabase.from('courts').insert({
          turf_id: turf.id,
          name: c.name,
          size: c.size,
          court_type: c.court_type,
          description: c.description || null,
          sort_order: i,
        }).select().single();

        if (court && Array.isArray(c.slots)) {
          const slotRows = (c.slots as Record<string, unknown>[]).flatMap((sl) => {
            const days = Array.isArray(sl.days) ? sl.days : [sl.day_of_week];
            return (days as number[]).map((d) => ({
              court_id: court.id,
              day_of_week: d,
              start_time: sl.start_time,
              end_time: sl.end_time,
              price_per_slot: sl.price_per_slot || 0,
              slot_duration_minutes: sl.slot_duration_minutes || 60,
            }));
          });
          if (slotRows.length > 0) {
            await supabase.from('court_time_slots').insert(slotRows);
          }
        }
      }

      // Save photos
      const photos = (td.photos as string[]) ?? [];
      if (photos.length > 0) {
        await supabase.from('turf_photos').insert(
          photos.map((url: string, i: number) => ({
            turf_id: turf.id,
            url,
            is_primary: i === 0,
            sort_order: i,
          }))
        );
      }

      // Mark registration approved
      await supabase.from('owner_registrations').update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        created_user_id: owner.id,
      }).eq('id', registrationId);

      return ok({
        message: `Owner account created for ${reg.first_name} ${reg.last_name}`,
        credentials: {
          username,
          password,
          phone_number: reg.phone_number,
          email: reg.email,
          name: `${reg.first_name} ${reg.last_name}`,
          turf_name: td.name as string,
        },
      });
    }

    // POST /auth/admin/reject/:id
    if (req.method === 'POST' && sub.startsWith('admin/reject/')) {
      const registrationId = sub.split('/')[2];
      const auth = await authenticate(req);
      if (!auth || auth.user.role !== 'admin') return unauthorized('Admin access required');

      const body = await req.json();
      const { reason } = body;

      const { error } = await supabase.from('owner_registrations').update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        admin_notes: reason || null,
      }).eq('id', registrationId);
      if (error) throw error;

      return ok({ message: 'Registration rejected' });
    }

    // GET /auth/me
    if (req.method === 'GET' && sub === 'me') {
      const auth = await authenticate(req);
      if (!auth) return unauthorized();
      return ok({ user: auth.user });
    }

    // POST /auth/logout
    if (req.method === 'POST' && sub === 'logout') {
      const auth = await authenticate(req);
      if (!auth) return unauthorized();
      await supabase.from('user_sessions')
        .update({ revoked_at: new Date().toISOString() })
        .eq('token', auth.token);
      return ok({ message: 'Session revoked' });
    }

    return notFound('Route not found');
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Internal error', 500, 'INTERNAL_SERVER_ERROR');
  }
});
