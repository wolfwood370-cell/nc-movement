// Server-side hardened admin endpoint for bug reports.
// Validates auth + staff role (admin|coach) before any data access.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type Action =
  | { type: 'list' }
  | { type: 'update'; id: string; status: 'new' | 'reported' | 'fixed' }
  | { type: 'delete'; id: string };

const ALLOWED_STATUS = new Set(['new', 'reported', 'fixed']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
  const userId = claims.claims.sub as string;

  // Server-side staff check (admin OR coach).
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: roles, error: rolesErr } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['admin', 'coach']);
  if (rolesErr) return json({ error: 'Role check failed' }, 500);
  if (!roles || roles.length === 0) return json({ error: 'Forbidden' }, 403);

  let body: Action;
  try {
    body = (await req.json()) as Action;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    if (body.type === 'list') {
      const { data, error } = await admin
        .from('bug_reports').select('*')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return json({ data });
    }
    if (body.type === 'update') {
      if (typeof body.id !== 'string' || !ALLOWED_STATUS.has(body.status)) {
        return json({ error: 'Invalid input' }, 400);
      }
      const { error } = await admin.from('bug_reports').update({ status: body.status }).eq('id', body.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.type === 'delete') {
      if (typeof body.id !== 'string') return json({ error: 'Invalid input' }, 400);
      const { error } = await admin.from('bug_reports').delete().eq('id', body.id);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
