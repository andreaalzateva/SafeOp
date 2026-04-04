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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get caller profile (role + clinic + super admin status)
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("clinic_id, is_super_admin")
      .eq("id", caller.id)
      .single();

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleRow || roleRow.role !== "supervisor") {
      return new Response(JSON.stringify({ error: "Solo los supervisores pueden crear usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, role, specialty, clinicId } = await req.json();

    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["supervisor", "coordinador", "encargado", "consulta"].includes(role)) {
      return new Response(JSON.stringify({ error: "Rol inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only super admin can create supervisors
    if (role === "supervisor" && !callerProfile?.is_super_admin) {
      return new Response(JSON.stringify({ error: "Solo el super administrador puede crear supervisores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine clinic_id for the new user
    let assignedClinicId: string | null = null;
    if (callerProfile?.is_super_admin) {
      // Super admin must specify clinic for all users
      if (!clinicId) {
        return new Response(JSON.stringify({ error: "Debe asignar una clínica al usuario" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      assignedClinicId = clinicId;
    } else {
      // Regular supervisor assigns their own clinic
      assignedClinicId = callerProfile?.clinic_id || null;
    }

    if (role === "consulta" && !specialty) {
      return new Response(JSON.stringify({ error: "La especialidad es requerida para usuarios de consulta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user
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

    // Assign role
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: newUser.user.id,
      role,
    });

    if (roleError) {
      return new Response(JSON.stringify({ error: "Usuario creado pero error al asignar rol: " + roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile with clinic_id and specialty
    const profileUpdate: Record<string, unknown> = {};
    if (assignedClinicId) profileUpdate.clinic_id = assignedClinicId;
    if (role === "consulta" && specialty) profileUpdate.specialty = specialty;

    if (Object.keys(profileUpdate).length > 0) {
      await adminClient.from("profiles").update(profileUpdate).eq("id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUser.user.id, email, name, role },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
