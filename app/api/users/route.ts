import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabaseRouteClient';
import { supabaseServer as supabase } from '@/lib/supabase/server';

// GET /api/users - Fetch users based on roles
export async function GET(request: NextRequest) {
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

    // Only admins and teachers can fetch user lists
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const rolesParam = searchParams.get('roles');

    // Build query
    let query = supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, role, deleted')
      .order('first_name', { ascending: true });

    // Filter by roles if specified (e.g., "teacher,admin")
    if (rolesParam) {
      const roles = rolesParam.split(',').map(r => r.trim());
      query = query.in('role', roles);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
