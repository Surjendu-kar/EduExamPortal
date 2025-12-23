import { NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import nodemailer from 'nodemailer';
import { renderEmailTemplate, type EmailTemplate } from '@/lib/email/renderTemplate';

// Type definitions
interface ExamData {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface ExamAssignmentRaw {
  id: string;
  student_email: string;
  student_id: string | null;
  exam_id: string;
  assigned_at: string;
  status: string;
  exams: ExamData | ExamData[] | null;
}

interface AssignmentInfo {
  id: string;
  exam_id: string;
  exam_title: string;
  assigned_at: string;
  status: string;
  start_time?: string;
  end_time?: string;
  completion_status?: string; // 'completed', 'pending', 'expired'
}

// Generate a secure token for student invitations
function generateInvitationToken(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Send invitation email
async function sendStudentInvitationEmail(
  email: string,
  firstName: string,
  lastName: string,
  examTitle: string,
  token: string,
  expiresAt: Date,
  userId: string,
  hasExams: boolean = true
): Promise<void> {
  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/student-invitation/${token}`;

  // Format expiration date
  const expirationDate = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Create transporter using environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let subject = `You're Invited to Take: ${examTitle}`;
  let html = '';

  try {
    // Determine which template type to use based on whether exams are assigned
    const templateType = hasExams ? 'student_invitation_with_exam' : 'student_invitation_general';
    const activeTemplateColumn = hasExams
      ? 'active_student_invitation_with_exam_template_id'
      : 'active_student_invitation_general_template_id';

    // Fetch user's active email template for the appropriate type
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(activeTemplateColumn)
      .eq('id', userId)
      .single();

    let template: EmailTemplate | null = null;

    // Get the active template ID from the correct column
    const activeTemplateId = userProfile?.[activeTemplateColumn as keyof typeof userProfile];

    if (activeTemplateId) {
      // Fetch the active template
      const { data: templateData } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', activeTemplateId as string)
        .single();

      if (templateData) {
        template = templateData as EmailTemplate;
      }
    }

    // If no active template, try to fetch a default template for the appropriate type
    if (!template) {
      const { data: defaultTemplate } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_default', true)
        .eq('template_type', templateType)
        .single();

      if (defaultTemplate) {
        template = defaultTemplate as EmailTemplate;
      }
    }

    // If we have a template, use it
    if (template) {
      const rendered = renderEmailTemplate(template, {
        firstName,
        lastName,
        examTitle: hasExams ? examTitle : 'No exams assigned yet',
        institutionName: 'EduExamPortal',
        expirationDate,
        inviteUrl: signupUrl,
      });

      subject = rendered.subject;
      html = rendered.html;
    } else {
      // Fallback to hardcoded email
      html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .exam-info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px; font-weight: bold;">EduExamPortal</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">🎓 Exam Invitation</p>
              </div>
              <div class="content">
                <h2>Hello ${firstName} ${lastName}!</h2>
                <p>You've been invited to join <strong>EduExamPortal</strong> as a student.</p>

                ${hasExams ? `
                <div class="exam-info">
                  <h3>📝 ${examTitle}</h3>
                  <p style="margin: 0; color: #666; font-size: 14px;">Your teacher has assigned the above exam(s) to you.</p>
                </div>
                ` : `
                <div class="exam-info" style="background: #f0f9ff; border-left: 4px solid #3b82f6;">
                  <h3>📚 Getting Started</h3>
                  <p style="margin: 0; color: #666; font-size: 14px;">Your teacher will assign exams to you after you create your account. You'll be notified when exams become available.</p>
                </div>
                `}

                <p>To accept this invitation and create your student account, please click the button below:</p>

                <div style="text-align: center;">
                  <a href="${signupUrl}" class="button" style="color: #FFFFFF;">Accept Invitation & Create Account</a>
                </div>

                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${signupUrl}</p>

                <p><strong>Note:</strong> This invitation link will expire on ${expirationDate}.</p>
              </div>
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p style="margin-top: 10px;"><strong>EduExamPortal</strong> - Online Examination Platform</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }
  } catch (error) {
    console.error('Error fetching email template, using fallback:', error);
    // Fallback to hardcoded email
    html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .exam-info { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">EduExamPortal</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">🎓 Exam Invitation</p>
            </div>
            <div class="content">
              <h2>Hello ${firstName} ${lastName}!</h2>
              <p>You've been invited to join <strong>EduExamPortal</strong> as a student.</p>

              ${hasExams ? `
              <div class="exam-info">
                <h3>📝 ${examTitle}</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">Your teacher has assigned the above exam(s) to you.</p>
              </div>
              ` : `
              <div class="exam-info" style="background: #f0f9ff; border-left: 4px solid #3b82f6;">
                <h3>📚 Getting Started</h3>
                <p style="margin: 0; color: #666; font-size: 14px;">Your teacher will assign exams to you after you create your account. You'll be notified when exams become available.</p>
              </div>
              `}

              <p>To accept this invitation and create your student account, please click the button below:</p>

              <div style="text-align: center;">
                <a href="${signupUrl}" class="button" style="color: #FFFFFF;">Accept Invitation & Create Account</a>
              </div>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${signupUrl}</p>

              <p><strong>Note:</strong> This invitation link will expire on ${expirationDate}.</p>
            </div>
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              <p style="margin-top: 10px;"><strong>EduExamPortal</strong> - Online Examination Platform</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
}

export interface CreateStudentInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  examId?: string; // Optional - deprecated in favor of examIds
  examIds?: string[]; // Optional array of exam IDs
  teacherId: string;
  expiresAt?: Date;
}

export interface CreateStudentInvitationResult {
  success: boolean;
  invitation?: Record<string, unknown>;
  error?: string;
}

// Create student invitation
async function createStudentInvitation(
  supabaseClient: typeof supabase,
  {
    email,
    firstName,
    lastName,
    departmentId,
    examId,
    examIds,
    teacherId,
    expiresAt,
  }: CreateStudentInvitationData
): Promise<CreateStudentInvitationResult> {
  try {
    // Generate unique invitation token
    const token = generateInvitationToken();

    // Set expiration date (7 days from now if not provided)
    const expirationDate = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Determine which exams to assign
    const examsToAssign = examIds && examIds.length > 0 ? examIds : (examId ? [examId] : []);

    // Get exam title for email (use first exam if multiple)
    let examTitle = 'Exam(s)';
    let hasExams = false;
    if (examsToAssign.length > 0) {
      hasExams = true;
      const { data: firstExam } = await supabaseClient
        .from('exams')
        .select('title')
        .eq('id', examsToAssign[0])
        .single();

      if (firstExam) {
        examTitle = examsToAssign.length > 1
          ? `${firstExam.title} and ${examsToAssign.length - 1} more exam(s)`
          : firstExam.title;
      }
    }

    // Create invitation record (without exam_id - it's deprecated)
    const { data: invitation, error } = await supabaseClient
      .from('student_invitations')
      .insert({
        student_email: email,
        first_name: firstName,
        last_name: lastName,
        department_id: departmentId,
        exam_id: null, // No longer storing exam_id here
        teacher_id: teacherId,
        invitation_token: token,
        status: 'pending',
        expires_at: expirationDate.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating student invitation:', error);
      return { success: false, error: error.message };
    }

    // Create exam assignments in student_exam_assignments table
    if (examsToAssign.length > 0) {
      const assignments = examsToAssign.map(examId => ({
        student_email: email,
        student_id: null, // Will be filled when student accepts invitation
        exam_id: examId,
        assigned_by: teacherId,
        department_id: departmentId,
        status: 'active'
      }));

      const { error: assignmentError } = await supabaseClient
        .from('student_exam_assignments')
        .insert(assignments);

      if (assignmentError) {
        console.error('Error creating exam assignments:', assignmentError);
        // Don't fail the invitation if assignment fails, but log it
        // The teacher can assign exams later
      }
    }

    // Send invitation email
    try {
      await sendStudentInvitationEmail(email, firstName, lastName, examTitle, token, expirationDate, teacherId, hasExams);
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the invitation creation if email fails
    }

    return { success: true, invitation };
  } catch (error) {
    console.error('Unexpected error creating student invitation:', error);
    return { success: false, error: 'Failed to create invitation' };
  }
}

// GET - Fetch all student invitations
export async function GET(req: Request) {
  try {
    const routeClient = await createRouteClient();

    // Get user session
    const { data: { user }, error: authError } = await routeClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");
    const departmentId = searchParams.get("departmentId");

    // If institution filter is set but department is not, get all departments for that institution
    let departmentIds: string[] = [];
    if (institutionId && !departmentId) {
      const { data: depts } = await routeClient
        .from('departments')
        .select('id')
        .eq('institution_id', institutionId);

      departmentIds = depts?.map(d => d.id) || [];
    }

    // Use service role client to bypass RLS for the join query
    // This prevents infinite recursion in RLS policies
    let query = supabase
      .from('student_invitations')
      .select(`
        *,
        exams (
          id,
          title,
          start_time,
          end_time,
          duration,
          institution_id,
          department_id
        ),
        departments (
          id,
          name,
          code,
          institution_id
        )
      `);

    // Apply department filter
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else if (departmentIds.length > 0) {
      // Apply institution filter through department IDs
      query = query.in('department_id', departmentIds);
    }

    const { data: invitations, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student invitations:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    // Fetch teacher information from user_profiles for each unique teacher_id
    const teacherIds = [...new Set(invitations?.map(inv => inv.teacher_id).filter(Boolean))];
    const teachersMap: Record<string, { email: string }> = {};

    if (teacherIds.length > 0) {
      const { data: teachers, error: teachersError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', teacherIds);

      if (teachersError) {
        console.error('Error fetching teacher profiles:', teachersError);
      }

      teachers?.forEach(teacher => {
        teachersMap[teacher.id] = {
          email: teacher.email
        };
      });
    }

    // Fetch exam assignments for each student
    const studentEmails = [...new Set(invitations?.map(inv => inv.student_email).filter(Boolean))];
    const studentIds = [...new Set(invitations?.map(inv => inv.student_id).filter(Boolean))];
    const assignmentsMap: Record<string, AssignmentInfo[]> = {};

    // Fetch exam sessions to determine completion status
    const completedExamsMap: Record<string, Set<string>> = {};
    if (studentIds.length > 0) {
      const { data: sessions } = await supabase
        .from('exam_sessions')
        .select('user_id, exam_id, status')
        .in('user_id', studentIds)
        .eq('status', 'completed');

      sessions?.forEach(session => {
        if (!completedExamsMap[session.user_id]) {
          completedExamsMap[session.user_id] = new Set();
        }
        completedExamsMap[session.user_id].add(session.exam_id);
      });
    }

    if (studentEmails.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('student_exam_assignments')
        .select(`
          id,
          student_email,
          student_id,
          exam_id,
          assigned_at,
          status,
          exams (
            id,
            title,
            start_time,
            end_time
          )
        `)
        .in('student_email', studentEmails);

      if (assignmentsError) {
        console.error('Error fetching exam assignments:', assignmentsError);
      }

      // Group assignments by student email
      (assignments as ExamAssignmentRaw[])?.forEach(assignment => {
        if (!assignmentsMap[assignment.student_email]) {
          assignmentsMap[assignment.student_email] = [];
        }

        // Handle Supabase's joined data format (could be object or array)
        const examData = Array.isArray(assignment.exams)
          ? assignment.exams[0]
          : assignment.exams;

        // Check if this exam is completed by the student
        const studentId = assignment.student_id;
        const isCompleted = studentId && completedExamsMap[studentId]?.has(assignment.exam_id);

        // Determine completion status
        let completionStatus = 'pending';
        if (isCompleted) {
          completionStatus = 'completed';
        } else if (examData?.end_time && new Date(examData.end_time) < new Date()) {
          completionStatus = 'expired';
        }

        assignmentsMap[assignment.student_email].push({
          id: assignment.id,
          exam_id: assignment.exam_id,
          exam_title: examData?.title || 'Unknown Exam',
          assigned_at: assignment.assigned_at,
          status: assignment.status,
          start_time: examData?.start_time,
          end_time: examData?.end_time,
          completion_status: completionStatus
        });
      });
    }

    // Fetch student exam results to calculate average scores
    const resultsMap: Record<string, { averageScore: number; completedExams: number }> = {};

    if (studentEmails.length > 0) {
      const { data: results, error: resultsError } = await supabase
        .from('student_responses')
        .select('student_email, total_score, max_possible_score, grading_status')
        .in('student_email', studentEmails)
        .eq('grading_status', 'completed');

      if (resultsError) {
        console.error('Error fetching student results:', resultsError);
      }

      // Calculate average score for each student
      results?.forEach(result => {
        if (!resultsMap[result.student_email]) {
          resultsMap[result.student_email] = { averageScore: 0, completedExams: 0 };
        }

        // Calculate percentage for this exam
        const percentage = result.max_possible_score > 0
          ? (result.total_score / result.max_possible_score) * 100
          : 0;

        // Add to running total
        const current = resultsMap[result.student_email];
        const totalExams = current.completedExams + 1;
        const newAverage = ((current.averageScore * current.completedExams) + percentage) / totalExams;

        resultsMap[result.student_email] = {
          averageScore: Math.round(newAverage * 10) / 10, // Round to 1 decimal place
          completedExams: totalExams
        };
      });
    }

    // Enrich invitations with teacher data, exam assignments, and average scores
    const enrichedInvitations = invitations?.map(invitation => ({
      ...invitation,
      teacher: teachersMap[invitation.teacher_id] || null,
      assigned_exams: assignmentsMap[invitation.student_email] || [],
      average_score: resultsMap[invitation.student_email]?.averageScore || 0,
      completed_exams: resultsMap[invitation.student_email]?.completedExams || 0
    }));

    return NextResponse.json(enrichedInvitations);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new student invitation
export async function POST(request: Request) {
  try {
    const routeClient = await createRouteClient();

    // Get user session for authentication
    const { data: { user }, error: authError } = await routeClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, firstName, lastName, departmentId, examId, examIds, expirationDate } = body;

    // Validate required fields (examId and examIds are now optional)
    if (!email || !firstName || !lastName || !departmentId) {
      return NextResponse.json({
        error: 'Missing required fields: email, firstName, lastName, departmentId'
      }, { status: 400 });
    }

    // Check if student already has an invitation
    const { data: existing } = await supabase
      .from('student_invitations')
      .select('id')
      .eq('student_email', email)
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'Student already has an invitation'
      }, { status: 400 });
    }

    // Create invitation using service role client to bypass RLS and prevent infinite recursion
    const result = await createStudentInvitation(supabase, {
      email,
      firstName,
      lastName,
      departmentId,
      examId, // Keep for backward compatibility
      examIds, // New: array of exam IDs
      teacherId: user.id,
      expiresAt: expirationDate ? new Date(expirationDate) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      invitation: result.invitation
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete student invitation(s)
export async function DELETE(request: Request) {
  try {
    const routeClient = await createRouteClient();

    // Get user session for authentication
    const { data: { user }, error: authError } = await routeClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No invitation IDs provided' }, { status: 400 });
    }

    // Get invitations to check if any are accepted (using service role to avoid RLS issues)
    const { data: invitations, error: fetchError } = await supabase
      .from('student_invitations')
      .select('id, student_email, status, student_id')
      .in('id', ids);

    if (fetchError) {
      console.error('Error fetching invitations:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    // Extract student emails for cleanup
    const studentEmails = invitations?.map(inv => inv.student_email).filter(Boolean) || [];

    // Delete exam assignments for these students
    if (studentEmails.length > 0) {
      const { error: assignmentDeleteError } = await supabase
        .from('student_exam_assignments')
        .delete()
        .in('student_email', studentEmails);

      if (assignmentDeleteError) {
        console.error('Error deleting exam assignments:', assignmentDeleteError);
        // Don't fail the whole operation if this fails, but log it
      } else {
        console.log('Successfully deleted exam assignments for students:', studentEmails);
      }
    }

    // For accepted invitations, mark user profiles as deleted (soft delete)
    for (const invitation of invitations || []) {
      if (invitation.status === 'accepted' && invitation.student_id) {
        console.log('Marking student profile as deleted:', invitation.student_id);

        try {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              deleted: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', invitation.student_id);

          if (updateError) {
            console.error('Error marking student profile as deleted:', updateError);
          } else {
            console.log('Successfully marked student profile as deleted');
          }
        } catch (updateErr) {
          console.error('Error during soft delete:', updateErr);
        }
      }
    }

    // Delete invitations permanently (using service role to avoid RLS issues)
    const { error } = await supabase
      .from('student_invitations')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Error deleting invitations:', error);
      return NextResponse.json({ error: 'Failed to delete invitations' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update student invitation
export async function PUT(request: Request) {
  try {
    const routeClient = await createRouteClient();

    // Get user session for authorization
    const { data: { user }, error: authError } = await routeClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or teacher
    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, firstName, lastName, email, examIds, departmentId, expirationDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    // Validate required fields (examIds is now optional)
    if (!firstName || !lastName || !email || !departmentId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use server-side supabase for update to bypass RLS
    const { error: updateError } = await supabase
      .from('student_invitations')
      .update({
        first_name: firstName,
        last_name: lastName,
        student_email: email,
        department_id: departmentId,
        expires_at: expirationDate,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    // Update exam assignments if examIds is provided
    if (examIds !== undefined) {
      // Delete existing exam assignments for this student
      const { error: deleteError } = await supabase
        .from('student_exam_assignments')
        .delete()
        .eq('student_email', email);

      if (deleteError) {
        console.error('Error deleting old exam assignments:', deleteError);
        // Don't fail the whole update if this fails
      }

      // Create new exam assignments if examIds is not empty
      if (examIds && examIds.length > 0) {
        const assignments = examIds.map((examId: string) => ({
          student_email: email,
          student_id: null, // Will be filled when student accepts invitation
          exam_id: examId,
          assigned_by: user.id,
          department_id: departmentId,
          status: 'active'
        }));

        const { error: assignmentError } = await supabase
          .from('student_exam_assignments')
          .insert(assignments);

        if (assignmentError) {
          console.error('Error creating new exam assignments:', assignmentError);
          // Don't fail the update if assignment fails
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Student updated successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
