import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 8);

    console.log(`[${now.toISOString()}] Starting absence marking process...`);
    console.log(`Today: ${today}, Current Time: ${currentTime}`);

    // ============ MARK ABSENT STUDENTS FOR SCHEDULED LESSONS ============
    // Get lessons that have ended today
    const { data: endedLessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("id, class_id, day_of_week, end_time, subject")
      .eq("day_of_week", now.getDay())
      .lt("end_time", currentTime);

    if (lessonsError) {
      console.error("Error fetching ended lessons:", lessonsError);
    } else {
      console.log(`Found ${endedLessons?.length || 0} ended lessons today`);

      for (const lesson of endedLessons || []) {
        // Get students in this class
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id")
          .eq("class_id", lesson.class_id)
          .eq("status", "active");

        if (studentsError) {
          console.error(`Error fetching students for class ${lesson.class_id}:`, studentsError);
          continue;
        }

        console.log(`Lesson "${lesson.subject}" has ${students?.length || 0} students`);

        for (const student of students || []) {
          // Check if attendance already recorded
          const { data: existingAttendance } = await supabase
            .from("attendance")
            .select("id")
            .eq("student_id", student.id)
            .eq("lesson_id", lesson.id)
            .eq("date", today)
            .single();

          if (!existingAttendance) {
            // Mark as absent
            const { error: insertError } = await supabase
              .from("attendance")
              .insert({
                student_id: student.id,
                class_id: lesson.class_id,
                lesson_id: lesson.id,
                date: today,
                status: "absent",
                notes: "تم تسجيل الغياب تلقائياً - لم ينضم للحصة",
              });

            if (insertError) {
              console.error(`Error marking student ${student.id} absent:`, insertError);
            } else {
              console.log(`Marked student ${student.id} absent for lesson ${lesson.id}`);
            }
          }
        }
      }
    }

    // ============ MARK ABSENT STUDENTS FOR ONLINE SESSIONS ============
    // Get online sessions that have ended today
    const { data: endedSessions, error: sessionsError } = await supabase
      .from("online_sessions")
      .select("id, title, end_time")
      .eq("session_date", today)
      .lt("end_time", currentTime)
      .eq("is_active", true);

    if (sessionsError) {
      console.error("Error fetching ended sessions:", sessionsError);
    } else {
      console.log(`Found ${endedSessions?.length || 0} ended online sessions today`);

      for (const session of endedSessions || []) {
        // Get enrollments that are still "enrolled" (not "attended")
        const { data: absentEnrollments, error: enrollmentsError } = await supabase
          .from("session_enrollments")
          .select("id, user_id")
          .eq("session_id", session.id)
          .eq("status", "enrolled");

        if (enrollmentsError) {
          console.error(`Error fetching enrollments for session ${session.id}:`, enrollmentsError);
          continue;
        }

        console.log(`Session "${session.title}" has ${absentEnrollments?.length || 0} absent students`);

        // Update enrollments to "absent"
        for (const enrollment of absentEnrollments || []) {
          const { error: updateError } = await supabase
            .from("session_enrollments")
            .update({ status: "absent" })
            .eq("id", enrollment.id);

          if (updateError) {
            console.error(`Error marking enrollment ${enrollment.id} absent:`, updateError);
          } else {
            console.log(`Marked enrollment ${enrollment.id} as absent for session ${session.id}`);
          }
        }
      }
    }

    // ============ MARK ABSENT TEACHERS FOR SCHEDULED LESSONS ============
    const { data: teacherLessons, error: teacherLessonsError } = await supabase
      .from("lessons")
      .select("id, teacher_id, subject, end_time")
      .eq("day_of_week", now.getDay())
      .lt("end_time", currentTime)
      .not("teacher_id", "is", null);

    if (teacherLessonsError) {
      console.error("Error fetching teacher lessons:", teacherLessonsError);
    } else {
      console.log(`Found ${teacherLessons?.length || 0} teacher lessons to check`);

      for (const lesson of teacherLessons || []) {
        // Check if teacher attendance already recorded
        const { data: existingAttendance } = await supabase
          .from("teacher_attendance")
          .select("id")
          .eq("teacher_id", lesson.teacher_id)
          .eq("lesson_id", lesson.id)
          .eq("date", today)
          .single();

        if (!existingAttendance) {
          // Mark teacher as absent
          const { error: insertError } = await supabase
            .from("teacher_attendance")
            .insert({
              teacher_id: lesson.teacher_id,
              lesson_id: lesson.id,
              attendance_type: "lesson",
              date: today,
              status: "absent",
            });

          if (insertError) {
            console.error(`Error marking teacher ${lesson.teacher_id} absent:`, insertError);
          } else {
            console.log(`Marked teacher ${lesson.teacher_id} absent for lesson ${lesson.id}`);
          }
        }
      }
    }

    // ============ MARK ABSENT TEACHERS FOR ONLINE SESSIONS ============
    const { data: teacherSessions, error: teacherSessionsError } = await supabase
      .from("online_sessions")
      .select("id, teacher_id, title, end_time")
      .eq("session_date", today)
      .lt("end_time", currentTime)
      .eq("is_active", true);

    if (teacherSessionsError) {
      console.error("Error fetching teacher sessions:", teacherSessionsError);
    } else {
      console.log(`Found ${teacherSessions?.length || 0} teacher sessions to check`);

      for (const session of teacherSessions || []) {
        // Check if teacher attendance already recorded
        const { data: existingAttendance } = await supabase
          .from("teacher_attendance")
          .select("id")
          .eq("teacher_id", session.teacher_id)
          .eq("session_id", session.id)
          .eq("date", today)
          .single();

        if (!existingAttendance) {
          // Mark teacher as absent
          const { error: insertError } = await supabase
            .from("teacher_attendance")
            .insert({
              teacher_id: session.teacher_id,
              session_id: session.id,
              attendance_type: "session",
              date: today,
              status: "absent",
            });

          if (insertError) {
            console.error(`Error marking teacher ${session.teacher_id} absent for session:`, insertError);
          } else {
            console.log(`Marked teacher ${session.teacher_id} absent for session ${session.id}`);
          }
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Absence marking process completed!`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم تسجيل الغياب التلقائي بنجاح",
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in mark-absent-students function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
