import { supabase } from "@/integrations/supabase/client";

export type ActivityActionType =
  | "exam_created"
  | "exam_submitted"
  | "quiz_created"
  | "quiz_submitted"
  | "course_created"
  | "lesson_created"
  | "material_uploaded"
  | "user_login"
  | "student_enrolled"
  | "assessment_created"
  | "assessment_submitted"
  | "attendance_recorded"
  | "grade_recorded";

interface LogActivityParams {
  actionType: ActivityActionType;
  description: string;
  entityType?: string;
  entityId?: string;
  schoolId?: string;
  metadata?: Record<string, any>;
}

export const logActivity = async ({
  actionType,
  description,
  entityType,
  entityId,
  schoolId,
  metadata,
}: LogActivityParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action_type: actionType,
      description,
      entity_type: entityType || null,
      entity_id: entityId || null,
      school_id: schoolId || null,
      metadata: metadata || {},
    });
  } catch (error) {
    // Silent fail - logging should not break main flow
    console.error("Activity log error:", error);
  }
};

export const getActionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    exam_created: "إنشاء اختبار",
    exam_submitted: "تسليم اختبار",
    quiz_created: "إنشاء كويز",
    quiz_submitted: "تسليم كويز",
    course_created: "إنشاء دورة",
    lesson_created: "إنشاء حصة",
    material_uploaded: "رفع مادة تعليمية",
    user_login: "تسجيل دخول",
    student_enrolled: "تسجيل طالب",
    assessment_created: "إنشاء تقييم",
    assessment_submitted: "تسليم تقييم",
    attendance_recorded: "تسجيل حضور",
    grade_recorded: "تسجيل درجة",
  };
  return labels[type] || type;
};

export const getActionTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    exam_created: "📝",
    exam_submitted: "✅",
    quiz_created: "📋",
    quiz_submitted: "✅",
    course_created: "📚",
    lesson_created: "🎓",
    material_uploaded: "📤",
    user_login: "🔑",
    student_enrolled: "👤",
    assessment_created: "📊",
    assessment_submitted: "✅",
    attendance_recorded: "📋",
    grade_recorded: "💯",
  };
  return icons[type] || "📌";
};
