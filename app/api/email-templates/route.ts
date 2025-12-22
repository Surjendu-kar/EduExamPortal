import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabaseRouteClient';
import { supabaseServer as supabase } from '@/lib/supabase/server';

// GET /api/email-templates - Fetch templates based on user permissions
export async function GET(request: NextRequest) {
  try {
    const routeClient = await createRouteClient();

    const { data: { user }, error: authError } = await routeClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const templateType = searchParams.get('templateType');
    const includeDefaults = searchParams.get('includeDefaults') !== 'false';

    let query = supabase
      .from('email_templates')
      .select('*');

    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    const { data: allTemplates, error: templatesError } = await query.order('created_at', { ascending: false });

    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    // Fetch creator information separately
    const creatorIds = [...new Set(allTemplates?.map(t => t.created_by).filter(Boolean))];
    const creatorsMap: Record<string, { first_name: string; last_name: string; email: string; deleted: boolean }> = {};

    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, deleted')
        .in('id', creatorIds);

      creators?.forEach(creator => {
        creatorsMap[creator.id] = {
          first_name: creator.first_name,
          last_name: creator.last_name,
          email: creator.email,
          deleted: creator.deleted
        };
      });
    }

    // Filter templates based on visibility and role
    const accessibleTemplates = (allTemplates || []).filter(template => {
      // Own templates
      if (template.created_by === user.id) return true;

      // Default templates - role-based filtering
      if (template.is_default && includeDefaults) {
        // Teachers can only see teacher default templates
        if (profile.role === 'teacher' && template.role === 'teacher') return true;
        // Admins can see all default templates
        if (profile.role === 'admin') return true;
        return false;
      }

      // Public templates (non-default)
      if (template.visibility === 'public' && !template.is_default) return true;

      // Custom visibility templates
      if (template.visibility === 'custom') {
        const allowedUserIds = template.allowed_user_ids as string[];
        return allowedUserIds.includes(user.id);
      }

      // Admins can see all templates
      if (profile.role === 'admin') return true;

      return false;
    });

    const enrichedTemplates = accessibleTemplates.map(template => ({
      ...template,
      creator: creatorsMap[template.created_by] || null
    }));

    return NextResponse.json({ templates: enrichedTemplates });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/email-templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const routeClient = await createRouteClient();

    const { data: { user }, error: authError } = await routeClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await routeClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.role !== 'admin' && profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
      is_active: setAsActive,
    } = body;

    if (!template_name || !template_type || !subject || !main_message) {
      return NextResponse.json({
        error: 'Missing required fields: template_name, template_type, subject, main_message'
      }, { status: 400 });
    }

    if (!['public', 'private', 'custom'].includes(visibility)) {
      return NextResponse.json({
        error: 'Invalid visibility. Must be: public, private, or custom'
      }, { status: 400 });
    }

    if (visibility === 'custom') {
      if (!allowed_user_ids || !Array.isArray(allowed_user_ids) || allowed_user_ids.length === 0) {
        return NextResponse.json({
          error: 'For custom visibility, at least one user must be selected'
        }, { status: 400 });
      }
    }

    if (visibility === 'public') {
      const { data: existingPublic } = await supabase
        .from('email_templates')
        .select('id')
        .eq('template_name', template_name)
        .eq('visibility', 'public')
        .single();

      if (existingPublic) {
        return NextResponse.json({
          error: 'A public template with this name already exists. Please choose a different name.'
        }, { status: 400 });
      }
    }

    const { data: template, error: createError } = await supabase
      .from('email_templates')
      .insert({
        template_name,
        template_type,
        description: description || null,
        subject,
        main_message,
        created_by: user.id,
        role: profile.role,
        visibility: visibility || 'private',
        allowed_user_ids: visibility === 'custom' ? allowed_user_ids : [],
        is_default: false,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating template:', createError);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    if (setAsActive && template) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ active_invitation_template_id: template.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error setting active template:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      template,
      message: 'Email template created successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
