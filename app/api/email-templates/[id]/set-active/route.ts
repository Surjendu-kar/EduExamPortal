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

    // Role validation: user can only activate templates matching their role
    if (template.role !== profile.role) {
      return NextResponse.json({
        error: `Cannot set this template as active. This template is for ${template.role} users only.`,
        code: 'ROLE_MISMATCH'
      }, { status: 403 });
    }

    // Check if user can access this template using the helper function
    const { data: canAccess } = await supabase.rpc('can_access_template', {
      p_template_id: templateId,
      p_user_id: user.id
    });

    if (!canAccess) {
      return NextResponse.json({
        error: 'You do not have permission to use this template'
      }, { status: 403 });
    }

    // Update user's active template
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        active_invitation_template_id: templateId,
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
