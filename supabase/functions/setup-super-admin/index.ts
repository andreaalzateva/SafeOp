import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if a super admin already exists
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id")
      .eq("is_super_admin", true)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "Ya existe un super administrador" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "Se requieren email, password y name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign supervisor role
    await adminClient.from("user_roles").insert({
      user_id: newUser.user.id,
      role: "supervisor",
    });

    // Mark as super admin
    await adminClient.from("profiles").update({ is_super_admin: true }).eq("id", newUser.user.id);

    return new Response(
      JSON.stringify({ success: true, user: { id: newUser.user.id, email, name } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
