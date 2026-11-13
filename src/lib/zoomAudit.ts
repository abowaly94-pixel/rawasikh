import { supabase } from "@/integrations/supabase/client";

export type ZoomAuditAction =
  | "view_list"
  | "view_link"
  | "create"
  | "update"
  | "delete"
  | "toggle_active"
  | "copy_url"
  | "open_url";

export interface ZoomAuditPayload {
  action: ZoomAuditAction;
  zoom_link_id?: string | null;
  target_title?: string | null;
  target_url?: string | null;
  course_id?: string | null;
  lesson_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * سجل عملية على روابط Zoom في جدول zoom_audit_log.
 * fire-and-forget: ما بيرمي errors عشان ما يعطلش الـ UI.
 */
export async function logZoomAudit(payload: ZoomAuditPayload) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    let actor_role: string | null = null;
    try {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      actor_role = (roleRow as any)?.role ?? null;
    } catch {
      // ignore
    }

    await supabase.from("zoom_audit_log" as any).insert({
      actor_id: user.id,
      actor_role,
      action: payload.action,
      zoom_link_id: payload.zoom_link_id ?? null,
      target_title: payload.target_title ?? null,
      target_url: payload.target_url ?? null,
      course_id: payload.course_id ?? null,
      lesson_id: payload.lesson_id ?? null,
      metadata: payload.metadata ?? null,
    });
  } catch (e) {
    // silent fail
    console.warn("[zoomAudit] failed to log:", e);
  }
}
