import { NextResponse } from "next/server";
import { supabaseServer as supabase } from "@/lib/supabase/server";
import { createRouteClient } from "@/lib/supabaseRouteClient";
import nodemailer from 'nodemailer';
import { renderEmailTemplate, type EmailTemplate } from '@/lib/email/renderTemplate';

// Generate a secure token for teacher invitations
function generateInvitationToken(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Send invitation email
async function sendTeacherInvitationEmail(
  email: string,
  firstName: string,
  token: string
): Promise<void> {
  const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teacher-invitation/${token}`;
  
  // Create transporter using environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Complete Your Teacher Account Setup - Online Exam Platform",
    text: `Hi ${firstName},

You've been invited to join our Online Exam Platform as a teacher.

To complete your registration, please click on the link below:
${signupUrl}

This invitation expires in 7 days. If you did not request this invitation, please ignore this email.

Best regards,
The Exam Platform Team`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Teacher Account Invitation</h2>
      <p>Hi <strong>${firstName}</strong>,</p>
      
      <p>You've been invited to join our <strong>Online Exam Platform</strong> as a teacher.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${signupUrl}" 
           style="background-color: #0070f3; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Complete Your Registration
        </a>
      </div>
      
      <p><strong>Important:</strong> This invitation expires in 7 days.</p>
      
      <p>If you did not request this invitation, please ignore this email.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      
      <p style="font-size: 12px; color: #666;">
        If the button above doesn't work, please copy and paste the following link into your browser:<br>
        <a href="${signupUrl}" style="color: #0070f3; word-break: break-all;">${signupUrl}</a>
      </p>
      
      <p>Best regards,<br><strong>The Exam Platform Team</strong></p>
    </div>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent successfully to ${email}`);
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
}

export interface CreateTeacherInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  institution?: string;
  createdBy: string;
  expiresAt?: Date;
}

export interface CreateTeacherInvitationResult {
  success: boolean;
  invitation?: Record<string, unknown>;
  error?: string;
}

// Create teacher invitation
async function createTeacherInvitation(
  supabase: Awaited<ReturnType<typeof createRouteClient>>,
  {
    email,
    firstName,
    lastName,
    department,
    institution,
    createdBy,
    expiresAt,
  }: CreateTeacherInvitationData
): Promise<CreateTeacherInvitationResult> {
  try {
    // Check if user already exists and is not deleted
    const { data: existingUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, deleted')
      .eq('email', email)
      .single();

    if (existingUsers && !usersError) {
      // If user exists but is marked as deleted, we can invite them again
      if (!existingUsers.deleted) {
        return {
          success: false,
          error: "A user with this email already exists",
        };
      }
    }

    // Check if invitation already exists and is pending
    const { data: existingInvitation } = await supabase
      .from("teacher_invitations")
      .select("*")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (existingInvitation) {
      return {
        success: false,
        error: "An invitation for this email is already pending",
      };
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const invitationExpiresAt =
      expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    // Get active institution from user profile
    const { data: adminProfile } = await supabase
      .from("user_profiles")
      .select("institution_id, department_id")
      .eq("id", createdBy)
      .single();

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from("teacher_invitations")
      .insert({
        email,
        token,
        admin_id: createdBy,
        first_name: firstName,
        last_name: lastName,
        institution: institution || adminProfile?.institution_id,
        department: department || adminProfile?.department_id,
        status: "pending",
        expires_at: invitationExpiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError || !invitation) {
      return {
        success: false,
        error: invitationError?.message || "Failed to create invitation",
      };
    }

    // Send invitation email
    await sendTeacherInvitationEmail(email, firstName, token);

    return {
      success: true,
      invitation: invitation,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || String(err),
    };
  }
}

export async function POST(req: Request) {
  // Use the imported supabase client directly

  try {
    const { email, firstName, lastName, department, institution, expiresAt } =
      await req.json();

    // Validate input
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      );
    }

    // Get current logged-in user using route client for authentication
    const routeClient = await createRouteClient();
    const { data: { user }, error: userError } = await routeClient.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Create teacher invitation using server client (admin privileges needed)
    const result = await createTeacherInvitation(supabase, {
      email,
      firstName,
      lastName,
      department,
      institution,
      createdBy: user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      message: `Teacher invitation sent successfully to ${email}`,
      invitation: {
        id: result.invitation?.id,
        email: result.invitation?.email,
        expires_at: result.invitation?.expires_at,
        created_at: result.invitation?.created_at,
      },
    });
  } catch (error) {
    console.error("Error in teachers API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// GET method to fetch teacher invitations for admin
export async function GET(req: Request) {
  try {
    const routeClient = await createRouteClient();
    const { data: { user }, error: userError } = await routeClient.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const institutionId = searchParams.get("institutionId");
    const departmentId = searchParams.get("departmentId");

    // Build query with filters
    let query = routeClient
      .from("teacher_invitations")
      .select("*")
      .eq("admin_id", user.id);

    // Apply institution filter
    if (institutionId) {
      query = query.eq("institution", institutionId);
    }

    // Apply department filter
    if (departmentId) {
      query = query.eq("department", departmentId);
    }

    // Get teacher invitations
    const { data: invitations, error: invitationsError } = await query.order("created_at", { ascending: false });

    if (invitationsError) {
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    // Fetch admin information from user_profiles for each unique admin_id
    const adminIds = [...new Set(invitations?.map(inv => inv.admin_id).filter(Boolean))];
    const adminsMap: Record<string, { email: string }> = {};

    if (adminIds.length > 0) {
      const { data: admins, error: adminsError } = await supabase
        .from('user_profiles')
        .select('id, email')
        .in('id', adminIds);

      if (adminsError) {
        console.error('Error fetching admin profiles:', adminsError);
      }

      admins?.forEach(admin => {
        adminsMap[admin.id] = {
          email: admin.email
        };
      });
    }

    // Get existing teachers created by this admin
    const { data: teachers, error: teachersError } = await routeClient
      .from("user_profiles")
      .select("*")
      .eq("role", "teacher")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (teachersError) {
      return NextResponse.json(
        { error: "Failed to fetch teachers" },
        { status: 500 }
      );
    }

    // Enrich invitations with stats for accepted teachers and admin data
    const enrichedInvitations = await Promise.all(
      (invitations || []).map(async (invitation) => {
        // Add admin data to invitation
        const baseInvitation = {
          ...invitation,
          admin: adminsMap[invitation.admin_id] || null
        };

        // Only fetch stats for accepted invitations
        if (invitation.status !== "accepted") {
          return {
            ...baseInvitation,
            createdExams: 0,
            invitedStudents: 0,
          };
        }

        // Find the teacher's user profile by email
        const { data: teacherProfile } = await routeClient
          .from("user_profiles")
          .select("id")
          .eq("email", invitation.email)
          .eq("role", "teacher")
          .single();

        if (!teacherProfile) {
          return {
            ...baseInvitation,
            createdExams: 0,
            invitedStudents: 0,
          };
        }

        // Count exams created by this teacher
        const { count: examsCount } = await routeClient
          .from("exams")
          .select("*", { count: "exact", head: true })
          .eq("created_by", teacherProfile.id);

        // Count students invited by this teacher
        const { count: studentsCount } = await routeClient
          .from("student_invitations")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", teacherProfile.id);

        return {
          ...baseInvitation,
          createdExams: examsCount || 0,
          invitedStudents: studentsCount || 0,
        };
      })
    );

    return NextResponse.json({
      invitations: enrichedInvitations,
      teachers: teachers || [],
    });
  } catch (error) {
    console.error("Error fetching teachers data:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// DELETE method to delete teacher invitations
// PUT method to update teacher invitations
export async function PUT(req: Request) {
  try {
    const { id, firstName, lastName, email, department, institution, expiresAt } = await req.json();

    // Validate input
    if (!id) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Get current logged-in user using route client for authentication
    const routeClient = await createRouteClient();
    const { data: { user }, error: userError } = await routeClient.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get the existing invitation
    const { data: existingInvitation, error: fetchError } = await supabase
      .from("teacher_invitations")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingInvitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Partial<{
      first_name: string;
      last_name: string;
      email: string;
      department: string;
      institution: string;
      expires_at: string;
    }> = {};

    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email;
    if (department) updateData.department = department;
    if (institution) updateData.institution = institution;
    if (expiresAt) updateData.expires_at = new Date(expiresAt).toISOString();

    // Update the invitation
    const { error: updateError } = await supabase
      .from("teacher_invitations")
      .update(updateData)
      .eq("id", id)
      .eq("admin_id", user.id); // Ensure admin can only update their own invitations

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update invitation" },
        { status: 500 }
      );
    }

    // If the invitation has been accepted, also update the user profile
    if (existingInvitation.status === "accepted") {
      const profileUpdateData: Partial<{
        first_name: string;
        last_name: string;
        email: string;
        department_id: string;
        institution_id: string;
        updated_at: string;
      }> = {};

      if (firstName) profileUpdateData.first_name = firstName;
      if (lastName) profileUpdateData.last_name = lastName;
      if (email) profileUpdateData.email = email;
      if (department) profileUpdateData.department_id = department;
      if (institution) profileUpdateData.institution_id = institution;
      profileUpdateData.updated_at = new Date().toISOString();

      // Update user profile
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update(profileUpdateData)
        .eq("email", existingInvitation.email)
        .eq("role", "teacher");

      if (profileError) {
        console.error("Error updating user profile:", profileError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      message: "Teacher invitation updated successfully",
    });
  } catch (error) {
    console.error("Error updating teacher invitation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  // Use the imported supabase client directly

  try {
    const { invitationId } = await req.json();

    // Validate input
    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Get current logged-in user using route client for authentication
    const routeClient = await createRouteClient();
    const { data: { user }, error: userError } = await routeClient.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await routeClient
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // First, get the invitation to check its status
    const { data: invitation, error: invitationError } = await routeClient
      .from("teacher_invitations")
      .select("id, email, status, used_at")
      .eq("id", invitationId)
      .eq("admin_id", user.id)
      .single();

    console.log("Invitation lookup result:", { invitation, invitationError });

    if (invitationError || !invitation) {
      console.log("Invitation not found or error occurred");
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // If the invitation has been accepted, we need to mark the user profile as deleted
    if (invitation.status === "accepted" && invitation.used_at) {
      console.log("Invitation is accepted, looking for user profile with email:", invitation.email);
      
      // Find the user profile by email
      const { data: userProfile, error: profileError } = await routeClient
        .from("user_profiles")
        .select("id")
        .eq("email", invitation.email)
        .eq("role", "teacher")
        .single();

      console.log("User profile lookup result:", { userProfile, profileError });

      if (!profileError && userProfile) {
        console.log("Found user profile, marking as deleted with ID:", userProfile.id);
        
        // Try to mark the user profile as deleted
        // First check if the deleted column exists by trying to update it
        try {
          const { error: updateProfileError } = await routeClient
            .from("user_profiles")
            .update({ 
              deleted: true,
              updated_at: new Date().toISOString()
            })
            .eq("id", userProfile.id);

          if (updateProfileError) {
            console.error("Error marking user profile as deleted:", updateProfileError);
            // If the deleted column doesn't exist, we'll fall back to deleting the profile
            if (updateProfileError.message && updateProfileError.message.includes("deleted")) {
              console.log("Deleted column doesn't exist, falling back to actual deletion");
              const { error: deleteProfileError } = await routeClient
                .from("user_profiles")
                .delete()
                .eq("id", userProfile.id);
              
              if (deleteProfileError) {
                console.error("Error deleting user profile:", deleteProfileError);
              } else {
                console.log("Successfully deleted user profile");
              }
            }
          } else {
            console.log("Successfully marked user profile as deleted");
          }
        } catch (updateError) {
          console.error("Error during update operation:", updateError);
          // Fall back to actual deletion
          const { error: deleteProfileError } = await routeClient
            .from("user_profiles")
            .delete()
            .eq("id", userProfile.id);
          
          if (deleteProfileError) {
            console.error("Error deleting user profile:", deleteProfileError);
          } else {
            console.log("Successfully deleted user profile");
          }
        }
      } else {
        console.log("User profile not found or error occurred while looking for it");
      }
    }

    // Delete the teacher invitation
    console.log("Deleting teacher invitation with ID:", invitationId);
    const { error: deleteError } = await routeClient
      .from("teacher_invitations")
      .delete()
      .eq("id", invitationId)
      .eq("admin_id", user.id); // Ensure admin can only delete their own invitations

    if (deleteError) {
      console.error("Error deleting invitation:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete invitation" },
        { status: 500 }
      );
    }

    console.log("Successfully deleted invitation");
    return NextResponse.json({
      message: "Invitation deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting teacher invitation:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
