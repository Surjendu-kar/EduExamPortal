import { createRouteClient } from "@/lib/supabaseRouteClient";
import { supabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteClient();
    const { id: examId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a student
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, email")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "student") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if student has access to this exam via student_exam_assignments table
    // This supports the new multi-exam assignment system
    const { data: assignment, error: assignmentError } = await supabaseServer
      .from("student_exam_assignments")
      .select("id, status, exam_id")
      .eq("exam_id", examId)
      .or(`student_id.eq.${user.id},student_email.eq.${profile.email}`)
      .eq("status", "active")
      .maybeSingle();

    if (assignmentError) {
      return NextResponse.json(
        { error: "Failed to verify exam access" },
        { status: 500 }
      );
    }

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this exam" },
        { status: 403 }
      );
    }

    // Get exam details (use service role to bypass RLS)
    const { data: exam, error: examError } = await supabaseServer
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Get teacher information separately using service role to bypass RLS
    let teacherName = "Unknown Teacher";
    if (exam.created_by) {
      const { data: teacher } = await supabaseServer
        .from("user_profiles")
        .select("first_name, last_name")
        .eq("id", exam.created_by)
        .maybeSingle();

      if (teacher?.first_name || teacher?.last_name) {
        teacherName = `${teacher.first_name || ""} ${
          teacher.last_name || ""
        }`.trim();
      }
    }

    // Check if exam is within time window
    const now = new Date();
    const startTime = exam.start_time ? new Date(exam.start_time) : null;
    const endTime = exam.end_time ? new Date(exam.end_time) : null;

    if (startTime && now < startTime) {
      return NextResponse.json(
        {
          error: "Exam has not started yet",
          startTime: exam.start_time,
        },
        { status: 403 }
      );
    }

    if (endTime && now > endTime) {
      return NextResponse.json(
        {
          error: "Exam has expired",
          endTime: exam.end_time,
        },
        { status: 403 }
      );
    }

    // Get existing exam session (don't create) - use service role after authentication
    const { data: session } = await supabaseServer
      .from("exam_sessions")
      .select("*")
      .eq("exam_id", examId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch exam questions (use service role to ensure access after authentication)
    const { data: mcqQuestions } = await supabaseServer
      .from("mcq")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true });

    const { data: saqQuestions } = await supabaseServer
      .from("saq")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true });

    const { data: codingQuestions } = await supabaseServer
      .from("coding")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true });

    // Combine all questions
    const questions = [
      ...(mcqQuestions || []).map((q) => ({ ...q, type: "mcq" })),
      ...(saqQuestions || []).map((q) => ({ ...q, type: "saq" })),
      ...(codingQuestions || []).map((q) => ({ ...q, type: "coding" })),
    ].sort((a, b) => (a.question_order || 0) - (b.question_order || 0));

    const examDuration = exam.duration || 60;

    if (!session) {
      return NextResponse.json({
        exam: {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          duration: examDuration,
          startTime: exam.start_time,
          endTime: exam.end_time,
          requireWebcam: exam.require_webcam,
          maxViolations: exam.max_violations,
          showResultsImmediately: exam.show_results_immediately,
          teacherName,
        },
        session: null,
        questions,
        savedAnswers: {},
      });
    }

    // Check if student has already saved answers in student_responses
    const { data: existingResponse } = await supabaseServer
      .from("student_responses")
      .select("answers")
      .eq("exam_session_id", session.id)
      .eq("student_id", user.id)
      .maybeSingle();

    // Calculate remaining time based on server time
    const sessionStartTime = new Date(session.start_time);
    const examDurationMs = examDuration * 60 * 1000; // Convert minutes to milliseconds
    const elapsedMs = now.getTime() - sessionStartTime.getTime();
    const remainingMs = examDurationMs - elapsedMs;
    const remainingTime = Math.max(0, Math.floor(remainingMs / 1000)); // Convert to seconds

    // Auto-submit if time has expired and session is still in progress
    let currentStatus = session.status;
    if (remainingTime === 0 && session.status === "in_progress") {
      const { error: updateError } = await supabaseServer
        .from("exam_sessions")
        .update({
          status: "completed",
          end_time: now.toISOString(),
        })
        .eq("id", session.id);

      if (!updateError) {
        currentStatus = "completed";
      }
    }

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: examDuration,
        startTime: exam.start_time,
        endTime: exam.end_time,
        requireWebcam: exam.require_webcam,
        maxViolations: exam.max_violations,
        showResultsImmediately: exam.show_results_immediately,
        teacherName,
      },
      session: {
        id: session.id,
        status: currentStatus,
        startTime: session.start_time,
        remainingTime,
        violationsCount: session.violations_count,
      },
      questions,
      savedAnswers: existingResponse?.answers || {},
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
