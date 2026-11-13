// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ZoomRow {
  id: string;
  title: string;
  url: string;
  scheduled_at: string;
  duration_minutes: number | null;
  course_id: string | null;
  lesson_id: string | null;
}

const WINDOWS = [
  { kind: "24h", minAhead: 23 * 60 + 55, maxAhead: 24 * 60 + 5 },  // ~24h ± 5m
  { kind: "30m", minAhead: 25,           maxAhead: 35 },           // ~30m ± 5m
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const summary: any = { checked: 0, notifications_created: 0, windows: [] };

  for (const w of WINDOWS) {
    const min = new Date(now.getTime() + w.minAhead * 60_000).toISOString();
    const max = new Date(now.getTime() + w.maxAhead * 60_000).toISOString();

    const { data: links, error: linksErr } = await supabase
      .from("zoom_links")
      .select("id, title, url, scheduled_at, duration_minutes, course_id, lesson_id")
      .eq("is_active", true)
      .gte("scheduled_at", min)
      .lte("scheduled_at", max);

    if (linksErr) {
      console.error("links error", linksErr);
      continue;
    }
    summary.checked += links?.length || 0;

    for (const link of (links as ZoomRow[]) || []) {
      // Resolve course_id from lesson if needed
      let courseId = link.course_id;
      if (!courseId && link.lesson_id) {
        const { data: cl } = await supabase
          .from("course_lessons")
          .select("section_id, course_sections!inner(course_id)")
          .eq("id", link.lesson_id)
          .maybeSingle();
        courseId = (cl as any)?.course_sections?.course_id ?? null;
      }
      if (!courseId) continue;

      // Enrolled students (direct + level purchases)
      const [directRes, levelRes] = await Promise.all([
        supabase.from("course_purchases").select("user_id").eq("course_id", courseId).eq("payment_status", "completed"),
        supabase.from("course_level_purchases").select("user_id").eq("course_id", courseId).eq("payment_status", "completed"),
      ]);
      const studentIds = new Set<string>();
      (directRes.data || []).forEach((r: any) => r.user_id && studentIds.add(r.user_id));
      (levelRes.data || []).forEach((r: any) => r.user_id && studentIds.add(r.user_id));

      // Parents of these students
      const parentIds = new Set<string>();
      if (studentIds.size > 0) {
        const { data: kids } = await supabase
          .from("students")
          .select("user_id, parent_id")
          .in("user_id", Array.from(studentIds));
        (kids || []).forEach((s: any) => { if (s.parent_id) parentIds.add(s.parent_id); });
      }

      const recipients = new Set<string>([...studentIds, ...parentIds]);
      if (recipients.size === 0) continue;

      // Filter out already-sent
      const { data: sent } = await supabase
        .from("zoom_reminders_sent")
        .select("user_id")
        .eq("zoom_link_id", link.id)
        .eq("kind", w.kind)
        .in("user_id", Array.from(recipients));
      const already = new Set((sent || []).map((r: any) => r.user_id));
      const toNotify = Array.from(recipients).filter((u) => !already.has(u));
      if (toNotify.length === 0) continue;

      const whenStr = new Date(link.scheduled_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
      const title = w.kind === "24h"
        ? `تذكير: جلسة Zoom خلال 24 ساعة`
        : `تذكير: جلسة Zoom خلال 30 دقيقة`;
      const body = `"${link.title}" — الموعد: ${whenStr}`;
      const linkPath = link.lesson_id ? `/lessons/${link.lesson_id}` : `/courses/${courseId}`;

      const notifRows = toNotify.map((uid) => ({
        user_id: uid,
        type: "zoom_reminder",
        title,
        body,
        link: linkPath,
        metadata: { zoom_link_id: link.id, kind: w.kind, url: link.url, scheduled_at: link.scheduled_at },
      }));
      const dedupeRows = toNotify.map((uid) => ({ zoom_link_id: link.id, user_id: uid, kind: w.kind }));

      const { error: nErr } = await supabase.from("notifications").insert(notifRows);
      if (nErr) { console.error("notif insert error", nErr); continue; }
      const { error: dErr } = await supabase.from("zoom_reminders_sent").insert(dedupeRows);
      if (dErr) console.error("dedupe insert error", dErr);

      summary.notifications_created += toNotify.length;
    }
    summary.windows.push({ kind: w.kind, min, max });
  }

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
