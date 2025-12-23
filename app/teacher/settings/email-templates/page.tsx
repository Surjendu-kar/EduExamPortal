"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WarningDialog } from "@/components/WarningDialog";
import { EmailTemplateDialog } from "@/components/EmailTemplateDialog";
import { EmailTemplateFilters } from "@/components/email-temp/EmailTemplateFilters";
import {
  Mail,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Globe,
  Lock,
  Loader2,
  UserX,
  Users,
} from "lucide-react";
import { EmailTemplate } from "@/types/email-template";

export default function TeacherEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterVisibility, setFilterVisibility] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<EmailTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [activeTemplateIds, setActiveTemplateIds] = useState<Record<string, string | null>>({
    'student_invitation_with_exam': null,
    'student_invitation_general': null,
    'teacher_invitation': null,
    'exam_reminder': null,
    'results_notification': null,
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [settingActiveId, setSettingActiveId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchActiveTemplate();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, filterType, filterVisibility]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/email-templates?includeDefaults=true");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        toast.error("Failed to fetch email templates");
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("An error occurred while fetching templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select(`
            active_student_invitation_with_exam_template_id,
            active_student_invitation_general_template_id,
            active_teacher_invitation_template_id,
            active_exam_reminder_template_id,
            active_results_notification_template_id
          `)
          .eq('id', user.id)
          .single();

        if (profile) {
          setActiveTemplateIds({
            'student_invitation_with_exam': profile.active_student_invitation_with_exam_template_id || null,
            'student_invitation_general': profile.active_student_invitation_general_template_id || null,
            'teacher_invitation': profile.active_teacher_invitation_template_id || null,
            'exam_reminder': profile.active_exam_reminder_template_id || null,
            'results_notification': profile.active_results_notification_template_id || null,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching active templates:", error);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (template) =>
          template.template_name.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query) ||
          template.template_type.toLowerCase().includes(query) ||
          template.creator?.first_name?.toLowerCase().includes(query) ||
          template.creator?.last_name?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((template) => template.template_type === filterType);
    }

    // Filter by visibility
    if (filterVisibility !== "all") {
      filtered = filtered.filter((template) => template.visibility === filterVisibility);
    }

    setFilteredTemplates(filtered);
  };

  const handleCreateTemplate = async (template: EmailTemplate) => {
    const loadingToast = toast.loading("Creating email template...", {
      duration: Infinity,
    });

    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Email template created successfully", {
          id: loadingToast,
          duration: 4000,
        });
        fetchTemplates();
        return { success: true };
      } else {
        toast.error(data.error || "Failed to create template", {
          id: loadingToast,
          duration: 4000,
        });
        return { success: false, error: data.error || "Failed to create template" };
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("An unexpected error occurred", {
        id: loadingToast,
        duration: 4000,
      });
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const handleEditTemplate = async (template: EmailTemplate) => {
    const loadingToast = toast.loading("Updating email template...", {
      duration: Infinity,
    });

    try {
      const response = await fetch(`/api/email-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Email template updated successfully", {
          id: loadingToast,
          duration: 4000,
        });
        fetchTemplates();
        setEditTemplate(null);
        return { success: true };
      } else {
        // Show specific error message if it's a permission issue with default templates
        const errorMessage = response.status === 403 && data.error?.includes('default')
          ? "Only admins have permission to edit system default templates."
          : data.error || "Failed to update template";

        toast.error(errorMessage, {
          id: loadingToast,
          duration: 4000,
        });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("An unexpected error occurred", {
        id: loadingToast,
        duration: 4000,
      });
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete || !templateToDelete.id) return;

    try {
      const response = await fetch(`/api/email-templates/${templateToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Email template deleted successfully");
        fetchTemplates();
        setDeleteDialogOpen(false);
        setTemplateToDelete(null);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("An error occurred while deleting the template");
    }
  };

  const handleSetActiveTemplate = async (templateId: string, templateType: string) => {
    setSettingActiveId(templateId);
    const loadingToast = toast.loading("Setting as active template...", {
      duration: Infinity,
    });

    try {
      const response = await fetch(`/api/email-templates/${templateId}/set-active`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Active template updated successfully", {
          id: loadingToast,
          duration: 4000,
        });
        // Update the active template ID for this specific type
        setActiveTemplateIds(prev => ({
          ...prev,
          [templateType]: templateId
        }));
        fetchActiveTemplate();
      } else {
        toast.error(data.error || "Failed to set active template", {
          id: loadingToast,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error("Error setting active template:", error);
      toast.error("An error occurred while setting active template", {
        id: loadingToast,
        duration: 4000,
      });
    } finally {
      setSettingActiveId(null);
    }
  };

  const isTemplateActive = (template: EmailTemplate) => {
    return activeTemplateIds[template.template_type] === template.id;
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "custom":
        return <Users className="h-4 w-4" />;
      case "private":
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "Public";
      case "private":
      default:
        return "Private";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      student_invitation_with_exam: "Student Invitation (With Exam)",
      student_invitation_general: "Student Invitation (General)",
      teacher_invitation: "Teacher Invitation",
      exam_reminder: "Exam Reminder",
      results_notification: "Results Notification",
    };
    return labels[type] || type;
  };

  const canEditTemplate = (template: EmailTemplate) => {
    // Teachers can only edit their own templates (not defaults)
    if (template.is_default) return false;
    return template.created_by === currentUserId;
  };

  const canDeleteTemplate = (template: EmailTemplate) => {
    // Teachers can only delete their own templates (not defaults)
    if (template.is_default) return false;
    return template.created_by === currentUserId;
  };

  const canSetActiveTemplate = (template: EmailTemplate) => {
    // Get user role from localStorage
    const userRole = localStorage.getItem('userRole')?.toLowerCase();

    // Admins can set ANY template as active (both admin and teacher templates)
    // Teachers can only set templates with role = 'teacher' as active
    if (userRole === 'admin') {
      return true; // Admins can use any template
    }

    // For non-admins, template role must match user role
    return template.role?.toLowerCase() === userRole;
  };

  return (
    <div className="bg-background p-6 space-y-6 flex flex-col flex-1">
      {/* Filters and Create Button in Single Row */}
      <EmailTemplateFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        filterVisibility={filterVisibility}
        onFilterVisibilityChange={setFilterVisibility}
        onCreateClick={() => setCreateDialogOpen(true)}
      />

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="h-full bg-transparent border-none">
          <CardContent className="flex h-full flex-col items-center justify-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery || filterType !== "all" || filterVisibility !== "all"
                ? "No templates match your filters"
                : "No email templates found. Create your first template to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredTemplates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className="relative h-full flex flex-col group hover:shadow-lg transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{template.template_name}</CardTitle>
                      </div>
                      {/* Visibility Icon */}
                      <div className="flex-shrink-0">
                        {getVisibilityIcon(template.visibility)}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-1">
                    {/* Type Badge and System Default/Custom Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{getTypeLabel(template.template_type)}</span>
                      </div>
                      {template.is_default ? (
                        <Badge variant="secondary" className="text-xs">
                          System Default
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          Custom
                        </Badge>
                      )}
                    </div>

                    {/* Creator Info */}
                    {template.creator && (
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span>
                            By {template.creator.first_name} {template.creator.last_name}
                          </span>
                          {template.creator.deleted && (
                            <UserX className="h-3 w-3 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex gap-3">
                    {/* Set Active Button - shows active state or allows setting active */}
                    {canSetActiveTemplate(template) && template.id && (
                      <Button
                        variant={isTemplateActive(template) ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isTemplateActive(template) && !settingActiveId) {
                            handleSetActiveTemplate(template.id!, template.template_type);
                          }
                        }}
                        disabled={settingActiveId === template.id}
                        className={
                          isTemplateActive(template)
                            ? "flex-1 cursor-default"
                            : "flex-1 cursor-pointer hover:bg-primary hover:text-white transition-all duration-200 hover:scale-105"
                        }
                      >
                        {settingActiveId === template.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Setting...
                          </>
                        ) : isTemplateActive(template) ? (
                          <>
                            <Star className="mr-2 h-4 w-4 fill-current" />
                            Active
                          </>
                        ) : (
                          <>
                            <StarOff className="h-4 w-4" />
                            Set Active
                          </>
                        )}
                      </Button>
                    )}

                    {/* Edit Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTemplate(template);
                      }}
                      className="flex-1 cursor-pointer hover:bg-blue-600 hover:text-white transition-all duration-200 hover:scale-105"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>

                    {/* Delete Button */}
                    {canDeleteTemplate(template) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template);
                          setDeleteDialogOpen(true);
                        }}
                        className="flex-1 cursor-pointer hover:bg-destructive hover:text-white transition-all duration-200 hover:scale-105"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <EmailTemplateDialog
        isOpen={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        userRole="teacher"
        onSave={handleCreateTemplate}
      />

      {/* Edit Dialog */}
      {editTemplate && (
        <EmailTemplateDialog
          isOpen={!!editTemplate}
          onOpenChange={(open) => !open && setEditTemplate(null)}
          editTemplate={editTemplate}
          userRole="teacher"
          onSave={handleEditTemplate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <WarningDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) {
            setTemplateToDelete(null);
          }
        }}
        onConfirm={handleDeleteTemplate}
        title="Delete Email Template"
        description={`Are you sure you want to delete "${templateToDelete?.template_name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
