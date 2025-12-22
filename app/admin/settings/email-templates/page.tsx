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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WarningDialog } from "@/components/WarningDialog";
import { EmailTemplateDialog } from "@/components/EmailTemplateDialog";
import {
  Plus,
  Search,
  Mail,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Globe,
  Lock,
  Users,
  Loader2,
  UserX,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  template_name: string;
  template_type: string;
  description?: string;
  subject: string;
  header_text: string;
  header_subtitle?: string;
  greeting: string;
  main_message: string;
  exam_info_text?: string;
  button_text: string;
  footer_note?: string;
  visibility: "public" | "private" | "custom";
  allowed_user_ids?: string[];
  is_default: boolean;
  role: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    deleted: boolean;
  };
}

export default function AdminEmailTemplatesPage() {
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
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
          .select('active_invitation_template_id')
          .eq('id', user.id)
          .single();

        setActiveTemplateId(profile?.active_invitation_template_id || null);
      }
    } catch (error) {
      console.error("Error fetching active template:", error);
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
    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Email template created successfully");
        fetchTemplates();
        return { success: true };
      } else {
        return { success: false, error: data.error || "Failed to create template" };
      }
    } catch (error) {
      console.error("Error creating template:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const handleEditTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch(`/api/email-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Email template updated successfully");
        fetchTemplates();
        setEditTemplate(null);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Failed to update template" };
      }
    } catch (error) {
      console.error("Error updating template:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

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

  const handleSetActiveTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/email-templates/${templateId}/set-active`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Active template updated successfully");
        setActiveTemplateId(templateId);
        fetchActiveTemplate();
      } else {
        toast.error(data.error || "Failed to set active template");
      }
    } catch (error) {
      console.error("Error setting active template:", error);
      toast.error("An error occurred while setting active template");
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-3 w-3" />;
      case "custom":
        return <Users className="h-3 w-3" />;
      case "private":
      default:
        return <Lock className="h-3 w-3" />;
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "Public";
      case "custom":
        return "Custom";
      case "private":
      default:
        return "Private";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      student_invitation: "Student Invitation",
      teacher_invitation: "Teacher Invitation",
      exam_reminder: "Exam Reminder",
      results_notification: "Results Notification",
    };
    return labels[type] || type;
  };

  const canEditTemplate = (template: EmailTemplate) => {
    // Admins can edit any template except defaults
    if (template.is_default) return false;
    return true;
  };

  const canDeleteTemplate = (template: EmailTemplate) => {
    // Admins can delete any template except defaults
    if (template.is_default) return false;
    return true;
  };

  const canSetActiveTemplate = (template: EmailTemplate) => {
    // Get user role from localStorage
    const userRole = localStorage.getItem('userRole')?.toLowerCase();

    // User can only set templates as active if template role matches user role
    return template.role.toLowerCase() === userRole;
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Filters and Create Button in Single Row */}
      <Card className="p-0 bg-transparent border-none">
        <CardContent className="p-0">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]" size="lg">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="student_invitation">Student Invitation</SelectItem>
                <SelectItem value="teacher_invitation">Teacher Invitation</SelectItem>
                <SelectItem value="exam_reminder">Exam Reminder</SelectItem>
                <SelectItem value="results_notification">Results Notification</SelectItem>
              </SelectContent>
            </Select>

            {/* Visibility Filter */}
            <Select value={filterVisibility} onValueChange={setFilterVisibility}>
              <SelectTrigger className="w-[180px]" size="lg">
                <SelectValue placeholder="Filter by visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Visibility</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {/* Create Button */}
            <Button onClick={() => setCreateDialogOpen(true)} className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
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
                  className="relative h-full flex flex-col group hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                  onClick={() => {
                    if (template.is_default) {
                      const { id, ...rest } = template;
                      const templateCopy = {
                        ...rest,
                        template_name: template.template_name,
                        is_default: false,
                      };
                      setEditTemplate(templateCopy as any);
                    } else {
                      setEditTemplate(template);
                    }
                  }}
                >
                  {/* Hover Edit Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (template.is_default) {
                        const { id, ...rest } = template;
                        const templateCopy = {
                          ...rest,
                          template_name: template.template_name,
                          is_default: false,
                        };
                        setEditTemplate(templateCopy as any);
                      } else {
                        setEditTemplate(template);
                      }
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 hover:bg-primary/10 rounded-full z-10"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </button>

                  {/* Active Badge */}
                  {activeTemplateId === template.id && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3 fill-current" />
                        Active
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-10">
                        <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        {template.is_default && (
                          <Badge variant="secondary" className="mt-2">
                            System Default
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    {/* Type Badge */}
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{getTypeLabel(template.template_type)}</span>
                    </div>

                    {/* Visibility Badge */}
                    <div className="flex items-center gap-2">
                      {getVisibilityIcon(template.visibility)}
                      <span className="text-sm capitalize">
                        {getVisibilityLabel(template.visibility)}
                        {template.visibility === "custom" &&
                          ` (${template.allowed_user_ids?.length || 0} users)`}
                      </span>
                    </div>

                    {/* Creator Info */}
                    <div className="text-sm text-muted-foreground">
                      {template.is_default ? (
                        <span>System Template</span>
                      ) : template.creator ? (
                        <div className="flex items-center gap-1">
                          <span>
                            By {template.creator.first_name} {template.creator.last_name}
                          </span>
                          {template.creator.deleted && (
                            <UserX className="h-3 w-3 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      ) : (
                        <span>Unknown creator</span>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    {/* Set Active Button - only show if template role matches user role */}
                    {activeTemplateId !== template.id && canSetActiveTemplate(template) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetActiveTemplate(template.id);
                        }}
                        className="flex-1"
                      >
                        <StarOff className="mr-2 h-4 w-4" />
                        Set Active
                      </Button>
                    )}

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
                      >
                        <Trash2 className="h-4 w-4" />
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
        userRole="admin"
        onSave={handleCreateTemplate}
      />

      {/* Edit Dialog */}
      {editTemplate && (
        <EmailTemplateDialog
          isOpen={!!editTemplate}
          onOpenChange={(open) => !open && setEditTemplate(null)}
          editTemplate={editTemplate}
          userRole="admin"
          onSave={handleEditTemplate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <WarningDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={handleDeleteTemplate}
        title="Delete Email Template"
        description={`Are you sure you want to delete "${templateToDelete?.template_name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="destructive"
      />
    </div>
  );
}
