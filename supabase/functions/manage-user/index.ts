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
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleRow || roleRow.role !== "supervisor") {
      return new Response(JSON.stringify({ error: "Solo los supervisores pueden gestionar usuarios" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "update" or "delete"

    if (action === "delete") {
      const { userId } = await req.json();
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId requerido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "No puedes eliminarte a ti mismo" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent deleting super admin
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("is_super_admin")
        .eq("id", userId)
        .single();

      if (targetProfile?.is_super_admin) {
        return new Response(JSON.stringify({ error: "No se puede eliminar al super administrador" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: surgeriesError } = await adminClient
        .from("surgeries")
        .update({ created_by: null })
        .eq("created_by", userId);

      if (surgeriesError) {
        return new Response(JSON.stringify({ error: "Error limpiando cirugías del usuario: " + surgeriesError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: phasesError } = await adminClient
        .from("checklist_phases")
        .update({ completed_by: null })
        .eq("completed_by", userId);

      if (phasesError) {
        return new Response(JSON.stringify({ error: "Error limpiando fases del checklist: " + phasesError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: rolesError } = await adminClient.from("user_roles").delete().eq("user_id", userId);
      if (rolesError) {
        return new Response(JSON.stringify({ error: "Error borrando roles del usuario: " + rolesError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: profileError } = await adminClient.from("profiles").delete().eq("id", userId);
      if (profileError) {
        return new Response(JSON.stringify({ error: "Error borrando perfil del usuario: " + profileError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: delError } = await adminClient.auth.admin.deleteUser(userId);
      if (delError) {
        return new Response(JSON.stringify({ error: delError.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { userId, name, role, specialty, clinicId } = await req.json();
      if (!userId || !name || !role) {
        return new Response(JSON.stringify({ error: "Faltan campos requeridos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!["supervisor", "coordinador", "encargado", "consulta"].includes(role)) {
        return new Response(JSON.stringify({ error: "Rol inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if caller is super admin
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("is_super_admin")
        .eq("id", caller.id)
        .single();

      // Prevent editing super admin's role
      const { data: targetProfile } = await adminClient
        .from("profiles")
        .select("is_super_admin")
        .eq("id", userId)
        .single();

      // Build profile update
      const profileUpdate: Record<string, unknown> = {
        name,
        specialty: role === "consulta" ? (specialty || null) : null,
      };

      // Only super admin can change clinic_id
      if (callerProfile?.is_super_admin && clinicId !== undefined) {
        profileUpdate.clinic_id = clinicId || null;
      }

      await adminClient.from("profiles").update(profileUpdate).eq("id", userId);

      // Update role - delete old and insert new (skip if target is super admin)
      if (!targetProfile?.is_super_admin) {
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        await adminClient.from("user_roles").insert({ user_id: userId, role });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no válida. Usa ?action=update o ?action=delete" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
