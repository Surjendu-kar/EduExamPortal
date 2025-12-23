import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabaseRouteClient';
import { supabaseServer as supabase } from '@/lib/supabase/server';

// POST /api/email-templates/[id]/set-active - Set a template as user's active default
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const routeClient = await createRouteClient();

    // Authenticate user
    const { data: { user }, error: authError } = await routeClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: templateId } = await params;

    // Get user role
    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get template details
    const { data: template, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Role validation:
    // - Admins can activate ANY template (both admin and teacher templates)
    // - Non-admins can only activate templates matching their role
    if (profile.role !== 'admin' && template.role !== profile.role) {
      return NextResponse.json({
        error: `Cannot set this template as active. This template is for ${template.role} users only.`,
        code: 'ROLE_MISMATCH'
      }, { status: 403 });
    }

    // Check if user can access this template using the helper function
    // Skip this check for admins (they have access to all templates)
    if (profile.role !== 'admin') {
      const { data: canAccess } = await supabase.rpc('can_access_template', {
        p_template_id: templateId,
        p_user_id: user.id
      });

      if (!canAccess) {
        return NextResponse.json({
          error: 'You do not have permission to use this template'
        }, { status: 403 });
      }
    }

    // Map template type to the correct active template column
    const templateTypeToColumn: Record<string, string> = {
      'student_invitation_with_exam': 'active_student_invitation_with_exam_template_id',
      'student_invitation_general': 'active_student_invitation_general_template_id',
      'teacher_invitation': 'active_teacher_invitation_template_id',
      'exam_reminder': 'active_exam_reminder_template_id',
      'results_notification': 'active_results_notification_template_id',
    };

    const columnName = templateTypeToColumn[template.template_type];

    if (!columnName) {
      return NextResponse.json({
        error: `Unknown template type: ${template.template_type}`
      }, { status: 400 });
    }

    // Update user's active template for this specific type
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        [columnName]: templateId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error setting active template:', updateError);
      return NextResponse.json({ error: 'Failed to set active template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Active template updated successfully',
      template_id: templateId,
      template_name: template.template_name
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
