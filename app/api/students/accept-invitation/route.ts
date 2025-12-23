import { NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabase/server';

type InvitationWithRelations = {
  id: string;
  student_email: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
  exam_id: string | null;
  status: string;
  expires_at: string;
  invitation_token: string;
  exams: {
    institution_id: string;
    department_id: string;
  } | null;
  departments: {
    institution_id: string;
  } | null;
};

// POST - Accept student invitation and create account
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ 
        error: 'Token and password are required' 
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters' 
      }, { status: 400 });
    }

    // Fetch invitation by token with exam and department info
    const { data: invitation, error: invError } = await supabase
      .from('student_invitations')
      .select(`
        *,
        exams (
          institution_id,
          department_id
        ),
        departments (
          institution_id
        )
      `)
      .eq('invitation_token', token)
      .single() as { data: InvitationWithRelations | null; error: unknown };

    if (invError || !invitation) {
      return NextResponse.json({
        error: 'Invalid or expired invitation token'
      }, { status: 404 });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }

    // Check if invitation is already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json({ 
        error: 'This invitation has already been accepted' 
      }, { status: 400 });
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.student_email,
      password: password,
      email_confirm: true, // Auto-confirm email for invited students
    });

    if (authError || !authData.user) {
      console.error('Error creating user:', authError);
      return NextResponse.json({ 
        error: authError?.message || 'Failed to create user account' 
      }, { status: 500 });
    }

    // Get institution_id from exam or department
    const institutionId =
      invitation.exams?.institution_id ||
      invitation.departments?.institution_id ||
      null;

    // Fetch default email templates for student role
    const { data: defaultTemplates } = await supabase
      .from('email_templates')
      .select('id, template_type')
      .eq('is_default', true)
      .in('template_type', [
        'student_invitation_with_exam',
        'student_invitation_general',
        'exam_reminder',
        'results_notification'
      ]);

    // Map default templates to their respective column names
    const templateMapping: Record<string, string | null> = {
      active_student_invitation_with_exam_template_id: null,
      active_student_invitation_general_template_id: null,
      active_exam_reminder_template_id: null,
      active_results_notification_template_id: null,
    };

    if (defaultTemplates) {
      defaultTemplates.forEach(template => {
        switch (template.template_type) {
          case 'student_invitation_with_exam':
            templateMapping.active_student_invitation_with_exam_template_id = template.id;
            break;
          case 'student_invitation_general':
            templateMapping.active_student_invitation_general_template_id = template.id;
            break;
          case 'exam_reminder':
            templateMapping.active_exam_reminder_template_id = template.id;
            break;
          case 'results_notification':
            templateMapping.active_results_notification_template_id = template.id;
            break;
        }
      });
    }

    // Create user profile with default templates
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: invitation.student_email,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        role: 'student',
        institution_id: institutionId,
        department_id: invitation.department_id,
        profile_completed: true,
        created_at: new Date().toISOString(),
        ...templateMapping,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Try to clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ 
        error: 'Failed to create user profile' 
      }, { status: 500 });
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('student_invitations')
      .update({
        status: 'accepted',
        student_id: authData.user.id,
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail the request if this fails, account is already created
    }

    // IMPORTANT: Also update student_exam_assignments table to populate student_id
    // This allows students to see their assigned exams immediately after accepting invitation
    const { error: assignmentsError } = await supabase
      .from('student_exam_assignments')
      .update({
        student_id: authData.user.id,
      })
      .eq('student_email', invitation.student_email)
      .is('student_id', null); // Only update rows where student_id is null

    if (assignmentsError) {
      console.error('Error updating exam assignments:', assignmentsError);
      // Don't fail the request if this fails, we can rely on email matching
    }

    return NextResponse.json({
      success: true,
      examId: invitation.exam_id,
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
