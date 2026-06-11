const SUPABASE_URL = 'https://oexntxmelxgntruxwukl.supabase.co';
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leG50eG1lbHhnbnRydXh3dWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTEzMDQsImV4cCI6MjA5NTg4NzMwNH0.T4Z1GtjhV7xB5_Kf00ZGE3W-68483TCAQH3Gbv8bWNE';
const BUCKET = 'turf-photos';

export async function uploadTurfPhoto(file: File, turfId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${turfId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to upload photo: ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

export async function deleteTurfPhoto(url: string): Promise<void> {
  const path = url.split(`/object/public/${BUCKET}/`)[1];
  if (!path) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
  });
}

export { SUPABASE_URL, ANON_KEY };
