import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) throw new Error("Unauthorized");

    // Case-insensitive check to match your ADMIN/admin role
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role.toLowerCase() !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Match your frontend payload: { userId, banUntil }
    const { userId, banUntil } = await req.json();

    let duration = "none";
    if (banUntil) {
      // Calculate hours from ISO string for Supabase ban_duration
      const diffMs = new Date(banUntil).getTime() - new Date().getTime();
      const hours = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
      duration = `${hours}h`;
    }

    // 1. Apply ban to Auth User (Forces logout and blocks login)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: duration }
    );
    if (authError) throw authError;

    // 2. Sync Profile Table status (matches your 'active' | 'banned' check constraint)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        status: banUntil ? "banned" : "active"
      })
      .eq("id", userId);
    
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
