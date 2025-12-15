import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { supabaseServer } from "@/lib/supabase/server";

// Type definitions
interface StudentAnswer {
  answer: string | number | null;
  marksObtained?: number | null;
  teacher_feedback?: string | null;
  isCorrect?: boolean;
  type?: "mcq" | "saq" | "coding";
  graded_by?: string;
  graded_at?: string;
  gradingStatus?: "pending" | "partial" | "completed";
  execution_results?: unknown;
}

interface AnswersObject {
  [questionId: string]: StudentAnswer;
}

interface MCQQuestion {
  id: string;
  question_text: string;
  marks: number;
  options: string[];
  correct_option: number;
  question_order: number;
}

interface SAQQuestion {
  id: string;
  question_text: string;
  marks: number;
  grading_guidelines: string | null;
  question_order: number;
}

interface CodingQuestion {
  id: string;
  question_text: string;
  marks: number;
  language: string;
  starter_code: string | null;
  test_cases: unknown;
  question_order: number;
}

interface GradingUpdate {
  response_id: string;
  marks_obtained: number | null;
  teacher_feedback: string | null;
  is_graded: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createRouteClient();
  const { sessionId } = await params;

  try {
    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to verify role
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role, institution_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only teachers and admins can access this endpoint
    if (!["teacher", "admin"].includes(profile.role.toLowerCase())) {
      return NextResponse.json(
        { error: "Forbidden - Teachers only" },
        { status: 403 }
      );
    }

    // First, try to get basic info from student_responses
    // This helps us verify the session exists and get exam/student IDs
    const { data: studentResponse, error: responseError } = await supabase
      .from("student_responses")
      .select("exam_id, student_id, exam_session_id, answers")
      .eq("exam_session_id", sessionId)
      .single();

    if (responseError || !studentResponse) {
      return NextResponse.json(
        {
          error: "Submission not found",
          details:
            responseError?.message ||
            "No student response found for this session",
        },
        { status: 404 }
      );
    }

    const examId = studentResponse.exam_id;
    const studentId = studentResponse.student_id;

    // Verify teacher has access to this exam
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select(
        "id, title, created_by, institution_id, department_id, duration, departments(name)"
      )
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if teacher has access (either created the exam or same institution)
    const hasAccess =
      exam.created_by === user.id ||
      (profile.institution_id &&
        exam.institution_id === profile.institution_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Access denied - You don't have permission to grade this exam",
        },
        { status: 403 }
      );
    }

    // Get student profile info (using service role to bypass RLS)
    const { data: studentProfile } = await supabaseServer
      .from("user_profiles")
      .select("first_name, last_name, email")
      .eq("id", studentId)
      .single();

    // Try to fetch exam session for timing info
    const { data: examSession } = await supabaseServer
      .from("exam_sessions")
      .select("start_time, end_time, created_at")
      .eq("id", sessionId)
      .single();

    // Get student answers from student_responses JSONB field
    const answersObj: AnswersObject = studentResponse.answers || {};

    // Fetch template questions to get question details
    const { data: templateMcqs } = await supabaseServer
      .from("mcq")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true });

    const { data: templateSaqs } = await supabaseServer
      .from("saq")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true });

    const { data: templateCodings } = await supabaseServer
      .from("coding")
      .select("*")
      .eq("exam_id", examId)
      .order("question_order", { ascending: true });

    // Transform template questions + student answers into unified response format
    const detailedResponses = [
      ...((templateMcqs as MCQQuestion[]) || []).map((q) => {
        const answer: StudentAnswer = answersObj[q.id] || {};
        return {
          id: q.id,
          question_id: q.id,
          question_type: "mcq" as const,
          question_text: q.question_text,
          question_marks: q.marks,
          student_answer: answer.answer,
          marks_obtained: answer.marksObtained,
          is_graded:
            answer.marksObtained !== null && answer.marksObtained !== undefined,
          teacher_feedback: answer.teacher_feedback || null,
          // MCQ specific
          options: q.options,
          selected_option: answer.answer,
          correct_option: q.correct_option,
          is_correct: answer.isCorrect,
        };
      }),
      ...((templateSaqs as SAQQuestion[]) || []).map((q) => {
        const answer: StudentAnswer = answersObj[q.id] || {};
        return {
          id: q.id,
          question_id: q.id,
          question_type: "saq" as const,
          question_text: q.question_text,
          question_marks: q.marks,
          student_answer: answer.answer,
          marks_obtained: answer.marksObtained,
          is_graded:
            answer.marksObtained !== null && answer.marksObtained !== undefined,
          teacher_feedback: answer.teacher_feedback || null,
          grading_guidelines: q.grading_guidelines,
        };
      }),
      ...((templateCodings as CodingQuestion[]) || []).map((q) => {
        const answer: StudentAnswer = answersObj[q.id] || {};
        return {
          id: q.id,
          question_id: q.id,
          question_type: "coding" as const,
          question_text: q.question_text,
          question_marks: q.marks,
          student_answer: answer.answer,
          marks_obtained: answer.marksObtained,
          is_graded:
            answer.marksObtained !== null && answer.marksObtained !== undefined,
          teacher_feedback: answer.teacher_feedback || null,
          // Coding specific
          language: q.language,
          submitted_code: answer.answer,
          test_cases: q.test_cases,
          execution_results: answer.execution_results,
          starter_code: q.starter_code,
        };
      }),
    ];

    // Calculate scores
    const maxPossibleScore = detailedResponses.reduce(
      (sum, r) => sum + r.question_marks,
      0
    );
    const totalScore = detailedResponses.reduce(
      (sum, r) => sum + (r.marks_obtained || 0),
      0
    );

    // Get department name
    let departmentName = "Unknown";
    if (exam.departments) {
      if (Array.isArray(exam.departments) && exam.departments.length > 0) {
        departmentName = exam.departments[0]?.name || "Unknown";
      } else if (
        typeof exam.departments === "object" &&
        "name" in exam.departments
      ) {
        departmentName =
          (exam.departments as { name: string }).name || "Unknown";
      }
    }

    const submission = {
      session_id: sessionId,
      exam_id: examId,
      exam_title: exam.title || "Unknown Exam",
      student_id: studentId,
      student_name:
        `${studentProfile?.first_name || ""} ${
          studentProfile?.last_name || ""
        }`.trim() || "Unknown Student",
      student_email: studentProfile?.email || "",
      department: departmentName,
      submitted_at:
        examSession?.end_time ||
        examSession?.created_at ||
        new Date().toISOString(),
      total_score: totalScore,
      max_possible_score: maxPossibleScore,
      start_time: examSession?.start_time || null,
      end_time: examSession?.end_time || null,
      duration: exam.duration || null,
      responses: detailedResponses,
    };

    return NextResponse.json({
      submission,
      message: "Submission details fetched successfully",
    });
  } catch (error) {
    console.error("Error in grading detail API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createRouteClient();
  const { sessionId } = await params;

  try {
    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to verify role
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Only teachers and admins can access this endpoint
    if (!["teacher", "admin"].includes(profile.role.toLowerCase())) {
      return NextResponse.json(
        { error: "Forbidden - Teachers only" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { updates }: { updates: GradingUpdate[] } = body;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Fetch student_responses to get current answers
    const { data: studentResponse, error: responseError } = await supabaseServer
      .from("student_responses")
      .select("answers, exam_id, student_id")
      .eq("exam_session_id", sessionId)
      .single();

    if (responseError || !studentResponse) {
      return NextResponse.json(
        { error: "Student response not found" },
        { status: 404 }
      );
    }

    const answersObj: AnswersObject = studentResponse.answers || {};
    const gradedAt = new Date().toISOString();

    // Update answers JSONB with grading information
    for (const update of updates) {
      const questionId = update.response_id;
      const marksObtained = update.marks_obtained;
      const teacherFeedback = update.teacher_feedback;

      if (answersObj[questionId]) {
        answersObj[questionId].marksObtained = marksObtained;
        answersObj[questionId].teacher_feedback = teacherFeedback;
        answersObj[questionId].graded_by = user.id;
        answersObj[questionId].graded_at = gradedAt;
        answersObj[questionId].gradingStatus = "completed";
      }
    }

    // Calculate total score from updated answers
    let totalScore = 0;
    Object.values(answersObj).forEach((answer: StudentAnswer) => {
      if (answer.marksObtained !== null && answer.marksObtained !== undefined) {
        totalScore += answer.marksObtained;
      }
    });

    // Check grading status: count MCQs as graded automatically, and check SAQ/Coding for marksObtained
    const totalQuestions = Object.keys(answersObj).length;
    let gradedQuestions = 0;

    Object.values(answersObj).forEach((answer: StudentAnswer) => {
      if (answer.type === "mcq") {
        // MCQs are always auto-graded
        gradedQuestions++;
      } else if (answer.type === "saq" || answer.type === "coding") {
        // SAQ and Coding need manual grading
        if (
          answer.gradingStatus === "completed" ||
          (answer.marksObtained !== null && answer.marksObtained !== undefined)
        ) {
          gradedQuestions++;
        }
      }
    });

    const gradingStatus =
      gradedQuestions === totalQuestions
        ? "completed"
        : gradedQuestions > 0
        ? "partial"
        : "pending";

    // Calculate max possible score
    const { data: templateQuestions } = await supabaseServer
      .from("student_responses")
      .select("max_possible_score")
      .eq("exam_session_id", sessionId)
      .single();

    const maxScore = templateQuestions?.max_possible_score || 0;

    // Update student_responses with graded answers
    await supabaseServer
      .from("student_responses")
      .update({
        answers: answersObj,
        total_score: totalScore,
        grading_status: gradingStatus,
      })
      .eq("exam_session_id", sessionId);

    // Update exam_sessions with total score, max score, and completion status
    const examSessionUpdate: {
      total_score: number;
      max_score?: number;
      status?: string;
    } = {
      total_score: totalScore,
    };

    // Only update max_score if we have a valid value
    if (maxScore > 0) {
      examSessionUpdate.max_score = maxScore;
    }

    // Update status to completed only when grading is fully completed
    if (gradingStatus === "completed") {
      examSessionUpdate.status = "completed";
    }

    await supabase
      .from("exam_sessions")
      .update(examSessionUpdate)
      .eq("id", sessionId);

    return NextResponse.json({
      message: "Grades updated successfully",
      total_score: totalScore,
    });
  } catch (error) {
    console.error("Error updating grades:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
