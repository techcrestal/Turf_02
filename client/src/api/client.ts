import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'https://oexntxmelxgntruxwukl.supabase.co/functions/v1';

const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9leG50eG1lbHhnbnRydXh3dWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTEzMDQsImV4cCI6MjA5NTg4NzMwNH0.T4Z1GtjhV7xB5_Kf00ZGE3W-68483TCAQH3Gbv8bWNE';

// Supabase gateway requires a valid JWT in Authorization at all times.
// Our custom session tokens are hex strings (not JWTs), so they go in a
// separate X-Session-Token header which _shared/auth.ts reads instead.
export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
  timeout: 15000,
});

export function setAuthToken(token: string | null) {
  // Authorization always stays as the anon JWT so the gateway accepts the request.
  apiClient.defaults.headers.common.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  if (token) {
    apiClient.defaults.headers.common['X-Session-Token'] = token;
  } else {
    delete apiClient.defaults.headers.common['X-Session-Token'];
  }
}
