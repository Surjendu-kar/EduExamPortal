import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabaseRouteClient';
import { supabaseServer as supabase } from '@/lib/supabase/server';

// PUT /api/email-templates/[id] - Update existing email template
export async function PUT(
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

    // Get user role
    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { id: templateId } = await params;

    // Get existing template
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if it's a default template - only admins can edit defaults
    if (existingTemplate.is_default && profile.role !== 'admin') {
      return NextResponse.json({
        error: 'Cannot edit system default templates. Please create a copy instead.'
      }, { status: 403 });
    }

    // Verify ownership (creator or admin)
    if (existingTemplate.created_by !== user.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'You do not have permission to edit this template' }, { status: 403 });
    }

    const body = await request.json();
    const {
      template_name,
      template_type,
      description,
      subject,
      main_message,
      visibility,
      allowed_user_ids,
    } = body;

    // Validate required fields
    if (!template_name || !template_type || !subject || !main_message) {
      return NextResponse.json({
        error: 'Missing required fields: template_name, template_type, subject, main_message'
      }, { status: 400 });
    }

    // Validate visibility
    if (!['public', 'private', 'custom'].includes(visibility)) {
      return NextResponse.json({
        error: 'Invalid visibility. Must be: public, private, or custom'
      }, { status: 400 });
    }

    // If visibility is 'custom', ensure allowed_user_ids is provided
    if (visibility === 'custom') {
      if (!allowed_user_ids || !Array.isArray(allowed_user_ids) || allowed_user_ids.length === 0) {
        return NextResponse.json({
          error: 'For custom visibility, at least one user must be selected'
        }, { status: 400 });
      }
    }

    // If changing to 'public', check if template name already exists (exclude current template)
    if (visibility === 'public') {
      const { data: existingPublic } = await supabase
        .from('email_templates')
        .select('id')
        .eq('template_name', template_name)
        .eq('visibility', 'public')
        .neq('id', templateId)
        .single();

      if (existingPublic) {
        return NextResponse.json({
          error: 'A public template with this name already exists. Please choose a different name.'
        }, { status: 400 });
      }
    }

    // Update template record
    const { data: updatedTemplate, error: updateError } = await supabase
      .from('email_templates')
      .update({
        template_name,
        template_type,
        description: description || null,
        subject,
        main_message,
        visibility: visibility || 'private',
        allowed_user_ids: visibility === 'custom' ? allowed_user_ids : [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: updatedTemplate,
      message: 'Email template updated successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/email-templates/[id] - Delete (soft delete) email template
export async function DELETE(
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

    // Get user role
    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { id: templateId } = await params;

    // Get existing template
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if it's a default template
    if (existingTemplate.is_default) {
      return NextResponse.json({
        error: 'Cannot delete system default templates'
      }, { status: 403 });
    }

    // Authorization check based on role
    if (profile.role === 'admin') {
      // Admin can delete any non-default template
    } else if (profile.role === 'teacher') {
      // Teacher can only delete their own templates
      if (existingTemplate.created_by !== user.id) {
        return NextResponse.json({
          error: 'Unauthorized - You can only delete templates you created'
        }, { status: 403 });
      }
    } else {
      // Other roles cannot delete templates
      return NextResponse.json({
        error: 'Insufficient permissions'
      }, { status: 403 });
    }

    // Cleanup: If any users have this as their active template, set to NULL
    const { error: cleanupError } = await supabase
      .from('user_profiles')
      .update({ active_invitation_template_id: null })
      .eq('active_invitation_template_id', templateId);

    if (cleanupError) {
      console.error('Error cleaning up active templates:', cleanupError);
      // Continue with deletion anyway
    }

    // HARD DELETE - Permanently remove from database
    const { error: deleteError } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Email template deleted successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
