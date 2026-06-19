import axios from 'axios';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const BUCKET = 'turf-photos';

export const api = axios.create({
  baseURL: `${SUPABASE_URL}/functions/v1`,
});

api.interceptors.request.use(config => {
  config.headers['apikey'] = ANON_KEY;
  config.headers['Authorization'] = `Bearer ${ANON_KEY}`;
  const token = localStorage.getItem('admin_token');
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

api.interceptors.response.use(
  r => r,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export async function uploadPhoto(file: File, turfId: string): Promise<string> {
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
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
}

export async function deleteStoragePhoto(url: string): Promise<void> {
  const path = url.split(`/object/public/${BUCKET}/`)[1];
  if (!path) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
  });
}
