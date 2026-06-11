import { corsHeaders } from './cors.ts';

export function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function err(message: string, status = 400, code = 'ERROR'): Response {
  return new Response(JSON.stringify({ data: null, error: { code, message } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function unauthorized(msg = 'Unauthorized'): Response {
  return err(msg, 401, 'UNAUTHORIZED');
}

export function notFound(msg = 'Not found'): Response {
  return err(msg, 404, 'NOT_FOUND');
}

export function forbidden(msg = 'Forbidden'): Response {
  return err(msg, 403, 'FORBIDDEN');
}

export function conflict(msg: string): Response {
  return err(msg, 409, 'CONFLICT');
}

export function preflight(corsHeaders: Record<string, string>): Response {
  return new Response('ok', { headers: corsHeaders });
}
