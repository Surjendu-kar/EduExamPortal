import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get institution_id and department_id from query params
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get("institution_id");
    const departmentId = searchParams.get("department_id"); // Optional department filter

    if (!institutionId) {
      return NextResponse.json(
        { error: "Institution ID is required" },
        { status: 400 }
      );
    }

    // 1. Get overview metrics
    // Use supabaseServer to bypass RLS since we've already verified admin role
    let examSessionsQuery = supabaseServer
      .from("exam_sessions")
      .select(
        `
        id,
        total_score,
        max_score,
        status,
        start_time,
        end_time,
        exams!inner (
          id,
          institution_id,
          department_id,
          title
        )
      `
      )
      .eq("exams.institution_id", institutionId);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      examSessionsQuery = examSessionsQuery.eq(
        "exams.department_id",
        departmentId
      );
    }

    const { data: examSessions, error: sessionsError } = await examSessionsQuery;

    const completedSessions =
      examSessions?.filter((s) => s.status === "completed") || [];
    const totalSessions = examSessions?.length || 0;

    // Calculate average score
    const totalScore = completedSessions.reduce(
      (sum, s) => sum + (s.total_score || 0),
      0
    );
    const totalMaxScore = completedSessions.reduce(
      (sum, s) => sum + (s.max_score || 1),
      0
    );
    const averageScore =
      completedSessions.length > 0
        ? (totalScore / totalMaxScore) * 100
        : 0;

    // Calculate pass rate (assuming 50% is passing)
    const passedSessions = completedSessions.filter(
      (s) => (s.total_score / s.max_score) * 100 >= 50
    );
    const passRate =
      completedSessions.length > 0
        ? (passedSessions.length / completedSessions.length) * 100
        : 0;

    // Calculate completion rate
    const completionRate =
      totalSessions > 0 ? (completedSessions.length / totalSessions) * 100 : 0;

    // Calculate average time taken (in minutes)
    const sessionsWithTime = completedSessions.filter(
      (s) => s.start_time && s.end_time
    );
    const totalMinutes = sessionsWithTime.reduce((sum, s) => {
      const start = new Date(s.start_time).getTime();
      const end = new Date(s.end_time).getTime();
      return sum + (end - start) / (1000 * 60);
    }, 0);
    const averageTimeTaken =
      sessionsWithTime.length > 0 ? totalMinutes / sessionsWithTime.length : 0;

    // 2. Score Distribution
    const scoreRanges = [
      { range: "0-20%", min: 0, max: 20, count: 0 },
      { range: "21-40%", min: 21, max: 40, count: 0 },
      { range: "41-60%", min: 41, max: 60, count: 0 },
      { range: "61-80%", min: 61, max: 80, count: 0 },
      { range: "81-100%", min: 81, max: 100, count: 0 },
    ];

    completedSessions.forEach((session) => {
      const percentage = (session.total_score / session.max_score) * 100;
      const range = scoreRanges.find(
        (r) => percentage >= r.min && percentage <= r.max
      );
      if (range) range.count++;
    });

    const scoreDistribution = scoreRanges.map((r) => ({
      range: r.range,
      count: r.count,
    }));

    // 3. Exam Difficulty Analysis
    const examStats = new Map();

    completedSessions.forEach((session) => {
      const examId = session.exams.id;
      if (!examStats.has(examId)) {
        examStats.set(examId, {
          examId,
          title: session.exams.title,
          totalScore: 0,
          maxScore: 0,
          attempts: 0,
          completedAttempts: 0,
        });
      }

      const stats = examStats.get(examId);
      stats.totalScore += session.total_score || 0;
      stats.maxScore += session.max_score || 1;
      stats.attempts += 1;
      if (session.status === "completed") {
        stats.completedAttempts += 1;
      }
    });

    const examDifficulty = Array.from(examStats.values())
      .map((stats) => ({
        examTitle: stats.title,
        averageScore: ((stats.totalScore / stats.maxScore) * 100).toFixed(1),
        completionRate: (
          (stats.completedAttempts / stats.attempts) *
          100
        ).toFixed(1),
        totalAttempts: stats.attempts,
      }))
      .sort((a, b) => parseFloat(a.averageScore) - parseFloat(b.averageScore));

    // 4. Department Performance
    let departmentsQuery = supabaseServer
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId);

    // If a specific department is selected, only show that department
    if (departmentId && departmentId !== "all") {
      departmentsQuery = departmentsQuery.eq("id", departmentId);
    }

    const { data: departments } = await departmentsQuery;

    const departmentPerformance = await Promise.all(
      (departments || []).map(async (dept) => {
        const { data: deptSessions } = await supabaseServer
          .from("exam_sessions")
          .select(
            `
          total_score,
          max_score,
          status,
          exams!inner (
            department_id
          )
        `
          )
          .eq("exams.department_id", dept.id)
          .eq("status", "completed");

        const deptCompleted = deptSessions || [];
        const deptTotalScore = deptCompleted.reduce(
          (sum, s) => sum + (s.total_score || 0),
          0
        );
        const deptMaxScore = deptCompleted.reduce(
          (sum, s) => sum + (s.max_score || 1),
          0
        );
        const avgScore =
          deptCompleted.length > 0 ? (deptTotalScore / deptMaxScore) * 100 : 0;

        return {
          name: dept.name,
          averageScore: parseFloat(avgScore.toFixed(1)),
          totalAttempts: deptCompleted.length,
        };
      })
    );

    // 5. Question Type Performance
    // Get all questions for exams in this institution (and department if specified)
    let examsQuery = supabaseServer
      .from("exams")
      .select("id")
      .eq("institution_id", institutionId);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      examsQuery = examsQuery.eq("department_id", departmentId);
    }

    const { data: examsInInstitution } = await examsQuery;

    const examIds = examsInInstitution?.map((e) => e.id) || [];

    // MCQ performance
    const { data: mcqData } = await supabaseServer
      .from("mcq")
      .select("marks, marks_obtained")
      .in("exam_id", examIds)
      .not("user_id", "is", null);

    const mcqTotal = mcqData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
    const mcqObtained =
      mcqData?.reduce((sum, q) => sum + (q.marks_obtained || 0), 0) || 0;
    const mcqPercentage = mcqTotal > 0 ? (mcqObtained / mcqTotal) * 100 : 0;

    // SAQ performance
    const { data: saqData } = await supabaseServer
      .from("saq")
      .select("marks, marks_obtained")
      .in("exam_id", examIds)
      .not("user_id", "is", null);

    const saqTotal = saqData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
    const saqObtained =
      saqData?.reduce((sum, q) => sum + (q.marks_obtained || 0), 0) || 0;
    const saqPercentage = saqTotal > 0 ? (saqObtained / saqTotal) * 100 : 0;

    // Coding performance
    const { data: codingData } = await supabaseServer
      .from("coding")
      .select("marks, marks_obtained")
      .in("exam_id", examIds)
      .not("user_id", "is", null);

    const codingTotal =
      codingData?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
    const codingObtained =
      codingData?.reduce((sum, q) => sum + (q.marks_obtained || 0), 0) || 0;
    const codingPercentage =
      codingTotal > 0 ? (codingObtained / codingTotal) * 100 : 0;

    const questionTypePerformance = [
      {
        type: "MCQ",
        percentage: parseFloat(mcqPercentage.toFixed(1)),
        count: mcqData?.length || 0,
      },
      {
        type: "SAQ",
        percentage: parseFloat(saqPercentage.toFixed(1)),
        count: saqData?.length || 0,
      },
      {
        type: "Coding",
        percentage: parseFloat(codingPercentage.toFixed(1)),
        count: codingData?.length || 0,
      },
    ].filter((qt) => qt.count > 0);

    // 6. Grading Status
    let studentResponsesQuery = supabaseServer
      .from("student_responses")
      .select(
        `
        grading_status,
        exams!inner (
          institution_id,
          department_id
        )
      `
      )
      .eq("exams.institution_id", institutionId);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      studentResponsesQuery = studentResponsesQuery.eq(
        "exams.department_id",
        departmentId
      );
    }

    const { data: studentResponses } = await studentResponsesQuery;

    const gradingCounts = {
      pending: 0,
      partial: 0,
      completed: 0,
    };

    studentResponses?.forEach((sr) => {
      if (sr.grading_status === "pending") gradingCounts.pending++;
      else if (sr.grading_status === "partial") gradingCounts.partial++;
      else if (sr.grading_status === "completed") gradingCounts.completed++;
    });

    // 7. Top Performing Students
    let topStudentsQuery = supabaseServer
      .from("exam_sessions")
      .select(
        `
        user_id,
        total_score,
        max_score,
        user_profiles!inner (
          id,
          first_name,
          last_name,
          email
        ),
        exams!inner (
          institution_id,
          department_id
        )
      `
      )
      .eq("exams.institution_id", institutionId)
      .eq("status", "completed");

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      topStudentsQuery = topStudentsQuery.eq(
        "exams.department_id",
        departmentId
      );
    }

    const { data: topStudents } = await topStudentsQuery;

    // Group by student and calculate average
    const studentStats = new Map();

    topStudents?.forEach((session) => {
      const userId = session.user_id;
      if (!studentStats.has(userId)) {
        const fullName = `${session.user_profiles.first_name || ""} ${
          session.user_profiles.last_name || ""
        }`.trim() || "Unknown";
        studentStats.set(userId, {
          userId,
          name: fullName,
          email: session.user_profiles.email,
          totalScore: 0,
          maxScore: 0,
          examsTaken: 0,
        });
      }

      const stats = studentStats.get(userId);
      stats.totalScore += session.total_score || 0;
      stats.maxScore += session.max_score || 1;
      stats.examsTaken += 1;
    });

    const topPerformers = Array.from(studentStats.values())
      .map((stats) => ({
        name: stats.name,
        email: stats.email,
        averageScore: parseFloat(
          ((stats.totalScore / stats.maxScore) * 100).toFixed(1)
        ),
        examsTaken: stats.examsTaken,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    // Return all data
    return NextResponse.json({
      overview: {
        averageScore: parseFloat(averageScore.toFixed(1)),
        passRate: parseFloat(passRate.toFixed(1)),
        completionRate: parseFloat(completionRate.toFixed(1)),
        averageTimeTaken: parseFloat(averageTimeTaken.toFixed(0)),
      },
      scoreDistribution,
      examDifficulty,
      departmentPerformance,
      questionTypePerformance,
      gradingStatus: gradingCounts,
      topPerformers,
    });
  } catch (error) {
    console.error("Error fetching performance analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance analytics" },
      { status: 500 }
    );
  }
}
