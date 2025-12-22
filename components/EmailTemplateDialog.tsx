"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/animate-ui/components/radix/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Info, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { UserSelectorDialog } from "./UserSelectorDialog";
import { SimpleRichTextEditor } from "./SimpleRichTextEditor";
import { EmailTemplate } from "@/types/email-template";

interface EmailTemplateDialogProps {
  trigger?: React.ReactNode;
  editTemplate?: EmailTemplate | null;
  userRole: "admin" | "teacher";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave?: (
    template: EmailTemplate
  ) => Promise<{ success: boolean; error?: string }>;
}

// Default template content based on template type (moved outside component)
const getDefaultTemplateContent = (
  templateType: string
): { subject: string; main_message: string } => {
  switch (templateType) {
    case "student_invitation":
      return {
        subject: "You're Invited: {examTitle} at {institutionName}",
        main_message: `<p>Dear {firstName} {lastName},</p>
<p>You have been invited to take the exam: <strong>{examTitle}</strong></p>
<p><strong>Exam Details:</strong></p>
<ul>
<li>Institution: {institutionName}</li>
<li>Access link will be available on the exam start date</li>
<li>Invitation expires: {expirationDate}</li>
</ul>
<p>Please make sure you have a stable internet connection and a quiet environment for the exam.</p>
<p>Good luck!</p>`,
      };
    case "teacher_invitation":
      return {
        subject: "Welcome to {institutionName} - Teacher Account Created",
        main_message: `<p>Hello {firstName} {lastName},</p>
<p>Welcome to {institutionName}! Your teacher account has been created.</p>
<p><strong>Get Started:</strong></p>
<ul>
<li>Click the link below to set up your account</li>
<li>Create and manage exams</li>
<li>Invite and manage students</li>
<li>Grade submissions and view analytics</li>
</ul>
<p>Your invitation link: {inviteUrl}</p>
<p>This link expires on: {expirationDate}</p>
<p>We're excited to have you on board!</p>`,
      };
    case "exam_reminder":
      return {
        subject: "Reminder: {examTitle} - Upcoming Deadline",
        main_message: `<p>Hi {firstName},</p>
<p>This is a friendly reminder about your upcoming exam: <strong>{examTitle}</strong></p>
<p><strong>Important Information:</strong></p>
<ul>
<li>Institution: {institutionName}</li>
<li>Exam access expires: {expirationDate}</li>
<li>Make sure to complete the exam before the deadline</li>
</ul>
<p>If you have any questions, please contact your instructor.</p>
<p>Best regards,<br>{institutionName} Team</p>`,
      };
    case "results_notification":
      return {
        subject: "Exam Results Available: {examTitle}",
        main_message: `<p>Dear {firstName} {lastName},</p>
<p>Your results for <strong>{examTitle}</strong> are now available!</p>
<p><strong>Exam Information:</strong></p>
<ul>
<li>Institution: {institutionName}</li>
<li>Exam: {examTitle}</li>
<li>Results have been reviewed and finalized</li>
</ul>
<p>Log in to your account to view your detailed results and feedback.</p>
<p>If you have any questions about your results, please contact your instructor.</p>`,
      };
    default:
      return {
        subject: "",
        main_message: "",
      };
  }
};

export const EmailTemplateDialog = ({
  trigger,
  editTemplate,
  userRole,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  onSave,
}: EmailTemplateDialogProps) => {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  const isEditing = !!editTemplate;
  const [currentStep, setCurrentStep] = React.useState(1);

  // Initialize form data with defaults for new templates
  const [formData, setFormData] = React.useState<EmailTemplate>(() => {
    if (editTemplate) {
      return {
        template_name: editTemplate.template_name,
        template_type: editTemplate.template_type,
        description: editTemplate.description || "",
        subject: editTemplate.subject,
        main_message: editTemplate.main_message,
        visibility: editTemplate.visibility,
        allowed_user_ids: editTemplate.allowed_user_ids || [],
      };
    } else {
      // For new templates, populate with defaults
      const defaultContent = getDefaultTemplateContent("student_invitation");
      return {
        template_name: "",
        template_type: "student_invitation",
        description: "",
        subject: defaultContent.subject,
        main_message: defaultContent.main_message,
        visibility: "private",
        allowed_user_ids: [],
      };
    }
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [userSelectorOpen, setUserSelectorOpen] = React.useState(false);

  // Track the previous template type to detect changes
  const prevTemplateTypeRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (editTemplate) {
      setFormData({
        template_name: editTemplate.template_name,
        template_type: editTemplate.template_type,
        description: editTemplate.description || "",
        subject: editTemplate.subject,
        main_message: editTemplate.main_message,
        visibility: editTemplate.visibility,
        allowed_user_ids: editTemplate.allowed_user_ids || [],
      });
    }
  }, [editTemplate]);

  // Update default content when template type changes (only for new templates)
  React.useEffect(() => {
    if (
      !isEditing &&
      prevTemplateTypeRef.current !== null &&
      prevTemplateTypeRef.current !== formData.template_type
    ) {
      const defaultContent = getDefaultTemplateContent(formData.template_type);
      setFormData((prev) => ({
        ...prev,
        subject: defaultContent.subject,
        main_message: defaultContent.main_message,
      }));
    }
    prevTemplateTypeRef.current = formData.template_type;
  }, [formData.template_type, isEditing]);

  const getAvailableVariables = (): string[] => {
    const commonVars = [
      "{firstName}",
      "{lastName}",
      "{institutionName}",
      "{expirationDate}",
      "{inviteUrl}",
    ];

    if (
      formData.template_type === "student_invitation" ||
      formData.template_type === "exam_reminder" ||
      formData.template_type === "results_notification"
    ) {
      return [...commonVars, "{examTitle}"];
    }

    return commonVars;
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.template_name.trim()) {
      newErrors.template_name = "Template name is required";
    }

    if (!formData.template_type) {
      newErrors.template_type = "Template type is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    }

    if (!formData.main_message.trim()) {
      newErrors.main_message = "Main message is required";
    }

    if (
      formData.visibility === "custom" &&
      (!formData.allowed_user_ids || formData.allowed_user_ids.length === 0)
    ) {
      newErrors.visibility =
        "At least one user must be selected for custom visibility";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBackStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSave) {
        const result = await onSave({
          ...formData,
          id: editTemplate?.id,
        });

        if (result.success) {
          setIsOpen(false);
          resetForm();
        }
        // If failed, parent will show toast error, just keep dialog open
      }
    } catch (error) {
      console.error("❌ [Dialog] Error saving template:", error);
      // Parent will handle error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    const defaultContent = getDefaultTemplateContent("student_invitation");
    setFormData({
      template_name: "",
      template_type: "student_invitation",
      description: "",
      subject: defaultContent.subject,
      main_message: defaultContent.main_message,
      visibility: "private",
      allowed_user_ids: [],
    });
    setErrors({});
    setCurrentStep(1);
    prevTemplateTypeRef.current = null; // Reset ref when form is reset
  };

  const handleCancel = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetForm();
    }
    // Don't reset form when opening for creation - let useEffect populate defaults
  };

  const handleUserSelect = (selectedUserIds: string[]) => {
    setFormData((prev) => ({ ...prev, allowed_user_ids: selectedUserIds }));
  };

  return (
    <>
      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #374151;
          border-radius: 3px;
          margin: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 3px;
          margin: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        .scrollbar-thin {
          scrollbar-gutter: stable;
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent
          from="bottom"
          showCloseButton={true}
          layoutId="email-template-dialog"
          className={
            currentStep === 1
              ? "min-w-[700px] max-h-[60vh]"
              : "min-w-[850px] max-h-[85vh]"
          }
        >
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Email Template" : "Create Email Template"} -
              Step {currentStep} of 2
            </DialogTitle>
            <DialogDescription>
              {currentStep === 1
                ? "Set up basic template information"
                : "Customize your email content and settings"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-0">
            {currentStep === 1 ? (
              // STEP 1: Template Info
              <div className="space-y-4">
                {/* First Row: Template Name and Type */}
                <div className="grid grid-cols-10 gap-4">
                  <div className="space-y-2 col-span-7">
                    <Label htmlFor="template_name">
                      Template Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="template_name"
                      placeholder="e.g., Friendly Student Invitation"
                      value={formData.template_name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          template_name: e.target.value,
                        }))
                      }
                      className={errors.template_name ? "border-red-500" : ""}
                    />
                    {errors.template_name && (
                      <p className="text-sm text-red-500">
                        {errors.template_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-3">
                    <Label htmlFor="template_type">
                      Template Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.template_type}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          template_type: value,
                        }))
                      }
                    >
                      <SelectTrigger
                        id="template_type"
                        className={errors.template_type ? "border-red-500" : ""}
                        size="lg"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student_invitation">
                          Student Invitation
                        </SelectItem>
                        <SelectItem value="teacher_invitation">
                          Teacher Invitation
                        </SelectItem>
                        <SelectItem value="exam_reminder">
                          Exam Reminder
                        </SelectItem>
                        <SelectItem value="results_notification">
                          Results Notification
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.template_type && (
                      <p className="text-sm text-red-500">
                        {errors.template_type}
                      </p>
                    )}
                  </div>
                </div>

                {/* Second Row: Description (Full Width) */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this template"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            ) : (
              // STEP 2: Email Content & Settings
              <div className="space-y-4 max-h-[500px]  scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                {/* Available Variables Info */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Available Variables
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getAvailableVariables().map((variable) => (
                          <code
                            key={variable}
                            className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                          >
                            {variable}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subject & Email Body Section */}
                <div className="border rounded-lg overflow-hidden bg-background">
                  <div className="border-b px-4 py-3 bg-muted/20">
                    <input
                      id="subject"
                      placeholder="Subject"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      className={`w-full border-0 bg-transparent outline-none focus:outline-none text-sm placeholder:text-muted-foreground ${
                        errors.subject ? "placeholder:text-red-500" : ""
                      }`}
                    />
                    {errors.subject && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.subject}
                      </p>
                    )}
                  </div>

                  {/* Main Message Compose Area */}
                  <SimpleRichTextEditor
                    value={formData.main_message}
                    onChange={(value) => {
                      setFormData((prev) => ({
                        ...prev,
                        main_message: value,
                      }));
                    }}
                    placeholder="Compose your email message here. You can use variables like {firstName}, {lastName}, {examTitle}, etc."
                    className="border-0"
                  />

                  {errors.main_message && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.main_message}
                    </p>
                  )}
                </div>

                {/* Visibility Section */}
                <div className="pt-4 space-y-4">
                  <div className="space-y-2">
                    {userRole === "admin" && (
                      <Label htmlFor="visibility">
                        Who can use this template?{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                    )}

                    {userRole === "teacher" ? (
                      // Simple checkbox for teachers
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="share_public"
                          checked={formData.visibility === "public"}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              visibility: checked ? "public" : "private",
                            }))
                          }
                        />
                        <label
                          htmlFor="share_public"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Share with other teachers (make public)
                        </label>
                      </div>
                    ) : (
                      // Dropdown for admins
                      <div>
                        <Select
                          value={formData.visibility}
                          onValueChange={(
                            value: "public" | "private" | "custom"
                          ) =>
                            setFormData((prev) => ({
                              ...prev,
                              visibility: value,
                            }))
                          }
                        >
                          <SelectTrigger id="visibility">
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              Public (Everyone can use)
                            </SelectItem>
                            <SelectItem value="private">
                              Private (Only me)
                            </SelectItem>
                            <SelectItem value="custom">
                              Custom (Selected users)
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Custom user selector */}
                        {formData.visibility === "custom" && (
                          <div className="mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setUserSelectorOpen(true)}
                            >
                              Select Users (
                              {formData.allowed_user_ids?.length || 0} selected)
                            </Button>
                            {errors.visibility && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors.visibility}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            {currentStep === 1 ? (
              <div className="flex gap-2 justify-end w-full">
                <Button
                  variant="outline"
                  className="py-4"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={
                    !formData.template_name.trim() || !formData.template_type
                  }
                  className="px-3"
                >
                  <span className="flex items-center gap-1">
                    Next <ChevronRight className="h-10 w-10 relative top-0.5" />
                  </span>
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 justify-end w-full">
                <Button onClick={handleBackStep} variant="outline">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? "Updating..." : "Creating..."}
                    </>
                  ) : isEditing ? (
                    "Update Template"
                  ) : (
                    "Save Template"
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>

        {/* User Selector Dialog for Custom Visibility */}
        {userRole === "admin" && (
          <UserSelectorDialog
            isOpen={userSelectorOpen}
            onOpenChange={setUserSelectorOpen}
            selectedUserIds={formData.allowed_user_ids || []}
            onConfirm={handleUserSelect}
          />
        )}
      </Dialog>
    </>
  );
};
