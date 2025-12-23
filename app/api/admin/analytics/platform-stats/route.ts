import { NextRequest, NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";

interface UserGrowthRecord {
  created_at: string;
  role: string;
}

interface ExamWithDepartment {
  id: string;
  department_id: string;
  departments: {
    id: string;
    name: string;
  }[] | null;
}

interface Department {
  id: string;
  name: string;
}

// Helper function to group users by day or month based on granularity
function processUserGrowth(
  users: UserGrowthRecord[],
  granularity: "daily" | "monthly" = "monthly"
) {
  const data: { [key: string]: { students: number; teachers: number } } = {};

  users.forEach((user) => {
    const date = new Date(user.created_at);
    let key: string;

    if (granularity === "daily") {
      // Format: YYYY-MM-DD
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    } else {
      // Format: YYYY-MM
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    }

    if (!data[key]) {
      data[key] = { students: 0, teachers: 0 };
    }

    if (user.role === "student") {
      data[key].students++;
    } else if (user.role === "teacher") {
      data[key].teachers++;
    }
  });

  // Convert to array and sort by date
  return Object.entries(data)
    .map(([dateKey, counts]) => ({
      month: dateKey, // Keep key as "month" for backwards compatibility
      students: counts.students,
      teachers: counts.teachers,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function GET(request: NextRequest) {
  const supabase = await createRouteClient();

  try {
    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile to verify role and get institution
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

    // Only admins can access this endpoint
    if (profile.role.toLowerCase() !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admins only" },
        { status: 403 }
      );
    }

    // Get institution_id, department_id, and time_range from query params
    const { searchParams } = new URL(request.url);
    const institutionId =
      searchParams.get("institution_id") || profile.institution_id;
    const departmentId = searchParams.get("department_id"); // Optional department filter
    const timeRange = searchParams.get("time_range") || "12"; // Default to 12 months

    if (!institutionId) {
      return NextResponse.json(
        { error: "Institution ID is required" },
        { status: 400 }
      );
    }

    // Determine granularity and date range based on time_range
    let granularity: "daily" | "monthly" = "monthly";
    let daysAgo = 365; // Default to 1 year

    switch (timeRange) {
      case "7":
        granularity = "daily";
        daysAgo = 7;
        break;
      case "30":
        granularity = "daily";
        daysAgo = 30;
        break;
      case "3":
        granularity = "monthly";
        daysAgo = 90; // ~3 months
        break;
      case "6":
        granularity = "monthly";
        daysAgo = 180; // ~6 months
        break;
      case "12":
        granularity = "monthly";
        daysAgo = 365; // ~12 months
        break;
      case "all":
        granularity = "monthly";
        daysAgo = 3650; // ~10 years (effectively all time)
        break;
      default:
        granularity = "monthly";
        daysAgo = 365;
    }

    // Fetch total students count
    let studentQuery = supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")
      .eq("institution_id", institutionId)
      .eq("deleted", false);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      studentQuery = studentQuery.eq("department_id", departmentId);
    }

    const { count: studentCount, error: studentError } = await studentQuery;

    if (studentError) {
      console.error("Error fetching student count:", studentError);
    }

    // Fetch total teachers count
    let teacherQuery = supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("institution_id", institutionId)
      .eq("deleted", false);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      teacherQuery = teacherQuery.eq("department_id", departmentId);
    }

    const { count: teacherCount, error: teacherError } = await teacherQuery;

    if (teacherError) {
      console.error("Error fetching teacher count:", teacherError);
    }

    // Fetch total exams count
    let examQuery = supabase
      .from("exams")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      examQuery = examQuery.eq("department_id", departmentId);
    }

    const { count: examCount, error: examError } = await examQuery;

    if (examError) {
      console.error("Error fetching exam count:", examError);
    }

    // Fetch active exams count (start_time <= now AND end_time >= now)
    const now = new Date().toISOString();
    let activeExamQuery = supabase
      .from("exams")
      .select("*", { count: "exact", head: true })
      .eq("institution_id", institutionId)
      .lte("start_time", now)
      .gte("end_time", now);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      activeExamQuery = activeExamQuery.eq("department_id", departmentId);
    }

    const { count: activeExamCount, error: activeExamError } =
      await activeExamQuery;

    if (activeExamError) {
      console.error("Error fetching active exam count:", activeExamError);
    }

    // Fetch user growth data based on selected time range
    const dateAgo = new Date();
    dateAgo.setDate(dateAgo.getDate() - daysAgo);

    let userGrowthQuery = supabase
      .from("user_profiles")
      .select("created_at, role")
      .eq("institution_id", institutionId)
      .eq("deleted", false)
      .in("role", ["student", "teacher"])
      .gte("created_at", dateAgo.toISOString())
      .order("created_at", { ascending: true });

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      userGrowthQuery = userGrowthQuery.eq("department_id", departmentId);
    }

    const { data: userGrowthData, error: userGrowthError } =
      await userGrowthQuery;

    if (userGrowthError) {
      console.error("Error fetching user growth:", userGrowthError);
    }

    // Fetch exams by department
    let examsByDeptQuery = supabase
      .from("exams")
      .select(
        `
        id,
        department_id,
        departments (
          id,
          name
        )
      `
      )
      .eq("institution_id", institutionId);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      examsByDeptQuery = examsByDeptQuery.eq("department_id", departmentId);
    }

    const { data: examsByDept, error: examsByDeptError } =
      await examsByDeptQuery;

    if (examsByDeptError) {
      console.error("Error fetching exams by department:", examsByDeptError);
    }

    // Group exams by department
    const departmentCounts: { [key: string]: { name: string; count: number } } =
      {};

    (examsByDept || []).forEach((exam: ExamWithDepartment) => {
      const deptId = exam.department_id;
      const deptName = exam.departments?.[0]?.name || "Unknown";

      if (!departmentCounts[deptId]) {
        departmentCounts[deptId] = { name: deptName, count: 0 };
      }
      departmentCounts[deptId].count++;
    });

    const examsByDepartment = Object.values(departmentCounts);

    // Fetch exam status distribution
    let allExamsQuery = supabase
      .from("exams")
      .select("id, start_time, end_time")
      .eq("institution_id", institutionId);

    // Add department filter if specified
    if (departmentId && departmentId !== "all") {
      allExamsQuery = allExamsQuery.eq("department_id", departmentId);
    }

    const { data: allExams, error: allExamsError } = await allExamsQuery;

    if (allExamsError) {
      console.error("Error fetching all exams:", allExamsError);
    }

    let upcomingCount = 0;
    let activeCount = 0;
    let completedCount = 0;

    (allExams || []).forEach((exam) => {
      const startTime = new Date(exam.start_time);
      const endTime = new Date(exam.end_time);
      const currentTime = new Date();

      if (currentTime < startTime) {
        upcomingCount++;
      } else if (currentTime >= startTime && currentTime <= endTime) {
        activeCount++;
      } else {
        completedCount++;
      }
    });

    const examStatusDistribution = [
      { status: "Upcoming", count: upcomingCount },
      { status: "Active", count: activeCount },
      { status: "Completed", count: completedCount },
    ];

    // Fetch institution details for overview
    let departmentsQuery = supabase
      .from("departments")
      .select("id, name")
      .eq("institution_id", institutionId);

    // If a specific department is selected, only show that department
    if (departmentId && departmentId !== "all") {
      departmentsQuery = departmentsQuery.eq("id", departmentId);
    }

    const { data: departments, error: deptError } = await departmentsQuery;

    if (deptError) {
      console.error("Error fetching departments:", deptError);
    }

    // Get student and teacher counts per department
    const departmentOverview = await Promise.all(
      (departments || []).map(async (dept: Department) => {
        const { count: deptStudents } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "student")
          .eq("department_id", dept.id)
          .eq("deleted", false);

        const { count: deptTeachers } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "teacher")
          .eq("department_id", dept.id)
          .eq("deleted", false);

        const { count: deptExams } = await supabase
          .from("exams")
          .select("*", { count: "exact", head: true })
          .eq("department_id", dept.id);

        return {
          id: dept.id,
          name: dept.name,
          studentCount: deptStudents || 0,
          teacherCount: deptTeachers || 0,
          examCount: deptExams || 0,
        };
      })
    );

    return NextResponse.json({
      overview: {
        studentCount: studentCount || 0,
        teacherCount: teacherCount || 0,
        examCount: examCount || 0,
        activeExamCount: activeExamCount || 0,
      },
      userGrowth: processUserGrowth(userGrowthData || [], granularity),
      examsByDepartment,
      examStatusDistribution,
      departmentOverview,
      granularity, // Include granularity in response so frontend knows the format
    });
  } catch (error) {
    console.error("Error in platform stats API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
