const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: { method: string; url: string | URL; headers: { get: (arg0: string) => any; }; json: () => any; }) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "No autorizado" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ success: false, error: "Solo super administradores pueden gestionar clínicas" }),
        {
          status: 403,
          headers: corsHeaders,
        }
      );
    }

    const body = await req.json();

    if (action === "create") {
      const { name, nit, address, num_operating_rooms } = body;
      const { error } = await supabaseAdmin.from("clinics").insert({
        name,
        nit,
        address,
        num_operating_rooms: Number(num_operating_rooms) || 4,
      });

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (action === "update") {
      const { clinicId, name, nit, address, num_operating_rooms } = body;
      const { error } = await supabaseAdmin
        .from("clinics")
        .update({
          name,
          nit,
          address,
          num_operating_rooms: Number(num_operating_rooms) || 4,
        })
        .eq("id", clinicId);

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (action === "delete") {
      const { clinicId } = body;
      const { error } = await supabaseAdmin.from("clinics").delete().eq("id", clinicId);

      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Acción no válida" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Error inesperado",
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});
