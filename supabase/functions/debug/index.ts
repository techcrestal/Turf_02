import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return new Response(JSON.stringify({
    href: req.url,
    pathname: url.pathname,
    parts,
    slice3: parts.slice(3),
    sub: parts.slice(3).join('/'),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
