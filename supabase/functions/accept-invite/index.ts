// Accepts an organization invitation for the signed-in user.
// Validates JWT server-side, verifies email match, and inserts membership
// using the service role — replaces the previously public RPC.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
  const user = userData.user;

  let body: { token?: string };
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const inviteToken = body.token;
  if (!inviteToken || typeof inviteToken !== 'string' || !UUID_RE.test(inviteToken)) {
    return json({ error: 'Invalid token' }, 400);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: inv, error: invErr } = await admin
    .from('organization_invitations')
    .select('id, organization_id, email, role, accepted_at')
    .eq('token', inviteToken)
    .maybeSingle();
  if (invErr) return json({ error: 'Lookup failed' }, 500);
  if (!inv) return json({ error: 'Invitation not found' }, 404);
  if (inv.accepted_at) return json({ error: 'Invitation already accepted' }, 409);
  if ((user.email ?? '').toLowerCase() !== String(inv.email).toLowerCase()) {
    return json({ error: 'Invitation email does not match signed-in user' }, 403);
  }

  const { error: memErr } = await admin
    .from('organization_members')
    .upsert(
      { organization_id: inv.organization_id, user_id: user.id, role: inv.role },
      { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
    );
  if (memErr) return json({ error: 'Membership failed' }, 500);

  const { error: updErr } = await admin
    .from('organization_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id);
  if (updErr) return json({ error: 'Update failed' }, 500);

  return json({ ok: true, organization_id: inv.organization_id });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
