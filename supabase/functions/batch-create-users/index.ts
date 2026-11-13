import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== `Bearer ${supabaseAnonKey}`) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: reqUser } } = await userClient.auth.getUser();
      if (reqUser) {
        const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: roleData } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", reqUser.id)
          .single();
        if (roleData?.role !== "admin") {
          return new Response(JSON.stringify({ error: "Not admin" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { users } = await req.json();
    const results: any[] = [];

    for (const u of users) {
      try {
        // Try to create user
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.fullName, role: u.role },
        });

        if (createError) {
          if (createError.message.includes("already been registered") || createError.message.includes("already registered")) {
            // User exists, find and update
            const { data: listData } = await supabaseClient.auth.admin.listUsers({ perPage: 1000 });
            const existing = listData?.users?.find((eu: any) => eu.email?.toLowerCase() === u.email.toLowerCase());
            if (existing) {
              await supabaseClient.auth.admin.updateUserById(existing.id, { password: u.password });
              await supabaseClient.from("user_roles").upsert({ user_id: existing.id, role: u.role }, { onConflict: "user_id" });
              results.push({ email: u.email, status: "updated" });
            } else {
              results.push({ email: u.email, status: "error", error: "exists but not found" });
            }
          } else {
            results.push({ email: u.email, status: "error", error: createError.message });
          }
          continue;
        }

        if (!newUser.user) {
          results.push({ email: u.email, status: "error", error: "no user" });
          continue;
        }

        // Profile + role
        await supabaseClient.from("profiles").upsert({
          id: newUser.user.id, full_name: u.fullName, email: u.email,
        }, { onConflict: "id" });

        await supabaseClient.from("user_roles").upsert({
          user_id: newUser.user.id, role: u.role,
        }, { onConflict: "user_id" });

        if (u.role === "student") {
          const { error: stErr } = await supabaseClient.from("students").insert({
            user_id: newUser.user.id, status: "active",
          });
          if (stErr && !stErr.message.includes("duplicate")) {
            console.log("Student insert note:", stErr.message);
          }
        }

        results.push({ email: u.email, status: "created" });
      } catch (err) {
        results.push({ email: u.email, status: "error", error: String(err) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
