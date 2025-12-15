// app/api/exams/route.ts
import { createRouteClient } from '@/lib/supabaseRouteClient';
import { supabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const convertLocalToUTCISO = (localDatetimeString: string): string | null => {
  if (!localDatetimeString) return null;
  try {
    const date = new Date(localDatetimeString); // Parses as local time
    if (isNaN(date.getTime())) {
      console.warn(`[API Helper] Invalid local datetime string for conversion: ${localDatetimeString}`);
      return null;
    }
    const utcISOString = date.toISOString(); // Converts to UTC ISO string
    console.log(`[API Helper] Converted local (${localDatetimeString}) to UTC ISO: ${utcISOString}`);
    return utcISOString;
  } catch (e) {
    console.error(`[API Helper] Error processing local datetime string: ${localDatetimeString}`, e);
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteClient();

    // Get query parameters for admin filtering
    const { searchParams } = new URL(request.url);
    const institutionId = searchParams.get('institutionId');
    const departmentId = searchParams.get('departmentId');

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, department_id, institution_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch exams based on role
    let query = supabase.from('exams').select('*');

    if (profile.role === 'teacher') {
      // Teachers see only exams from their department
      query = query
        .eq('department_id', profile.department_id)
        .eq('institution_id', profile.institution_id);
    } else if (profile.role === 'admin') {
      // Admins can filter by institution/department from query params
      if (institutionId) {
        query = query.eq('institution_id', institutionId);

        // If department is specified and not "all", filter by department
        if (departmentId && departmentId !== 'all') {
          query = query.eq('department_id', departmentId);
        }
      }
      // If no filters provided, admins see all exams
    } else if (profile.role === 'student') {
      // Students see only exams they're invited to
      const { data: invitations } = await supabase
        .from('student_invitations')
        .select('exam_id')
        .eq('student_id', user.id)
        .eq('status', 'accepted');

      if (invitations && invitations.length > 0) {
        const examIds = invitations.map(inv => inv.exam_id);
        query = query.in('id', examIds);
      } else {
        // No invitations, return empty
        return NextResponse.json([]);
      }
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }

    const { data: exams, error: examsError } = await query.order('created_at', { ascending: false });

    if (examsError) {
      console.error('Error fetching exams:', examsError);
      return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
    }

    // For each exam, get question counts
    const examsWithCounts = await Promise.all(
      exams.map(async (exam) => {
        const [mcqCount, saqCount, codingCount] = await Promise.all([
          supabase.from('mcq').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id),
          supabase.from('saq').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id),
          supabase.from('coding').select('id', { count: 'exact', head: true }).eq('exam_id', exam.id)
        ]);

        const totalQuestions = (mcqCount.count || 0) + (saqCount.count || 0) + (codingCount.count || 0);

        // Get assigned students count from student_exam_assignments table
        // Use service role client to bypass RLS after authentication
        const { data: assignmentData } = await supabaseServer
          .from('student_exam_assignments')
          .select('id, status')
          .eq('exam_id', exam.id)
          .eq('status', 'active');

        const activeCount = assignmentData?.length || 0;

        return {
          ...exam,
          totalQuestions,
          assignedStudents: activeCount || 0,
          status: exam.status || (
            exam.end_time && new Date(exam.end_time) < new Date() 
              ? 'archived' 
              : exam.start_time && new Date(exam.start_time) <= new Date() 
                ? 'active' 
                : 'draft'
          )
        };
      })
    );

    return NextResponse.json(examsWithCounts);
  } catch (error) {
    console.error('Error in GET /api/exams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteClient();
    const body = await req.json();
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, department_id, institution_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only admins and teachers can create exams
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

const { name, startDate, endDate, duration, questions, status, departmentId, institutionId } = body;
const utcStartDate = convertLocalToUTCISO(startDate);
const utcEndDate = convertLocalToUTCISO(endDate);

    console.log('[API /exams POST] Request body:', { name, startDate, endDate, duration, status, departmentId, institutionId });
    console.log('[API /exams POST] User profile:', profile);

    // Determine department_id and institution_id
    // Admins can specify, teachers use their assigned department/institution
    const finalDepartmentId = profile.role === 'admin' && departmentId
      ? departmentId
      : profile.department_id;

    const finalInstitutionId = profile.role === 'admin' && institutionId
      ? institutionId
      : profile.institution_id;

    console.log('[API /exams POST] Final IDs:', { finalDepartmentId, finalInstitutionId });

    // Validate that we have both IDs
    if (!finalDepartmentId || !finalInstitutionId) {
      console.error('[API /exams POST] Missing IDs - Validation failed');
      return NextResponse.json({
        error: 'Department and institution are required'
      }, { status: 400 });
    }

    // Generate unique exam code
    const uniqueCode = `EXAM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();

    // Create exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        title: name,
        description: '',
        department_id: finalDepartmentId,
        institution_id: finalInstitutionId,
        start_time: utcStartDate,
        end_time: utcEndDate,
        unique_code: uniqueCode,
        created_by: user.id,
        access_type: 'invitation',
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
        require_webcam: true,
        max_violations: 3,
        duration: duration,
        status: status || 'draft',
      })
      .select()
      .single();

    if (examError) {
      console.error('Error creating exam:', examError);
      return NextResponse.json({ error: 'Failed to create exam' }, { status: 500 });
    }

    // Add questions if provided
    if (questions && questions.length > 0) {
      for (const question of questions) {
        if (question.type === 'mcq') {
          await supabase.from('mcq').insert({
            exam_id: exam.id,
            question_text: question.question,
            options: question.options,
            correct_option: question.correctAnswer,
            marks: question.points,
            question_order: question.order || questions.indexOf(question) + 1
          });
        } else if (question.type === 'saq') {
          await supabase.from('saq').insert({
            exam_id: exam.id,
            question_text: question.question,
            grading_guidelines: question.gradingGuidelines,
            marks: question.points,
            question_order: question.order || questions.indexOf(question) + 1
          });
        } else if (question.type === 'coding') {
          await supabase.from('coding').insert({
            exam_id: exam.id,
            question_text: question.question,
            starter_code: question.codeTemplate,
            expected_output: '',
            test_cases: question.testCases,
            language: question.programmingLanguage,
            marks: question.points,
            question_order: question.order || questions.indexOf(question) + 1
          });
        }
      }
    }

    return NextResponse.json({ success: true, exam });
  } catch (error) {
    console.error('Error in POST /api/exams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}