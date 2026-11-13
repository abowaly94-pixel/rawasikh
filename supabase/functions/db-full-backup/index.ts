import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAGE_SIZE = 1000;
// Hard safety cap per table so a runaway/unexpectedly huge table can never
// turn a "quick manual backup" into a multi-minute function call that times
// out with nothing to show for it. 200 pages = up to 200,000 rows/table,
// far beyond anything this platform has today.
const MAX_PAGES_PER_TABLE = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "جلسة غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // A full database export is highly sensitive (payment records, phone
    // numbers, emails...) — deliberately admin-only, no staff-permission
    // bypass like other admin functions have.
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .maybeSingle();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "غير مصرح - النسخ الاحتياطي متاح لمدير النظام فقط" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Discover every real table in the public schema dynamically (via a
    // small SECURITY DEFINER SQL function — PostgREST doesn't expose
    // information_schema/pg_catalog directly), so newly added tables are
    // automatically included in future backups with no code change needed.
    const { data: tableRows, error: tablesError } = await adminClient.rpc("get_backup_table_list");
    if (tablesError) {
      return new Response(
        JSON.stringify({ error: `تعذّر قراءة قائمة الجداول: ${tablesError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const tableNames = ((tableRows as { table_name: string }[]) || []).map((t) => t.table_name).sort();

    const tables: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};
    const tableErrors: Record<string, string> = {};

    for (const table of tableNames) {
      try {
        const rows: unknown[] = [];
        for (let page = 0; page < MAX_PAGES_PER_TABLE; page++) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          const { data, error } = await adminClient.from(table).select("*").range(from, to);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < PAGE_SIZE) break;
        }
        tables[table] = rows;
        rowCounts[table] = rows.length;
      } catch (err) {
        tableErrors[table] = err instanceof Error ? err.message : String(err);
        tables[table] = [];
        rowCounts[table] = 0;
      }
    }

    // Also include the auth accounts list (id/email/phone/timestamps) —
    // never includes password hashes, Supabase's Admin API doesn't expose
    // those — so identities are covered even though restoring logins from
    // scratch would still need each user to reset their password.
    const authUsers: Record<string, unknown>[] = [];
    let authUsersError: string | null = null;
    try {
      let page = 1;
      while (page <= MAX_PAGES_PER_TABLE) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
        if (error) throw error;
        authUsers.push(...(data.users as unknown as Record<string, unknown>[]));
        if (!data.users || data.users.length < PAGE_SIZE) break;
        page++;
      }
    } catch (err) {
      authUsersError = err instanceof Error ? err.message : String(err);
    }

    const totalRows = Object.values(rowCounts).reduce((a, b) => a + b, 0);

    // Best-effort audit trail entry — never let a logging failure block the
    // admin from actually getting their backup.
    try {
      await adminClient.from("activity_logs").insert({
        user_id: requestingUser.id,
        action_type: "database_backup",
        description: `تم أخذ نسخة احتياطية كاملة من قاعدة البيانات (${tableNames.length} جدول، ${totalRows} صف)`,
        entity_type: "system",
        metadata: { table_count: tableNames.length, total_rows: totalRows },
      });
    } catch {
      // ignore — logging the backup must never block the backup itself
    }

    return new Response(
      JSON.stringify({
        generated_at: new Date().toISOString(),
        project: "rawasikh (w99)",
        table_count: tableNames.length,
        total_rows: totalRows,
        row_counts: rowCounts,
        table_errors: Object.keys(tableErrors).length > 0 ? tableErrors : undefined,
        auth_users: authUsers,
        auth_users_error: authUsersError || undefined,
        tables,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Backup error:", error);
    return new Response(
      JSON.stringify({ error: `فشل أخذ النسخة الاحتياطية: ${error instanceof Error ? error.message : "خطأ غير معروف"}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
