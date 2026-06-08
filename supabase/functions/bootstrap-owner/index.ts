// One-shot admin function to create the single allowed practitioner account.
// Protected by a shared secret; intended to be invoked once and then ignored.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("BOOTSTRAP_TOKEN");
  const provided = req.headers.get("x-bootstrap-token");
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email, password, display_name } = await req.json();
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "missing email or password" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Independent allowlist: this function holds the service-role key, so it must
  // refuse any non-owner email itself rather than relying solely on the DB
  // trigger (defense-in-depth in case the token leaks).
  const ALLOWED_EMAIL = "nctrainingsystems@gmail.com";
  if (String(email).toLowerCase().trim() !== ALLOWED_EMAIL) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: display_name ?? email.split("@")[0] },
  });

  if (error) {
    // Don't echo the DB error verbatim (it confirms the enforced allowlist).
    console.error("bootstrap-owner createUser failed:", error.message);
    return new Response(JSON.stringify({ error: "could not create user" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, user_id: data.user?.id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
