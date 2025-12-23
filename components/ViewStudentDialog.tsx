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
  DialogClose,
  DialogFooter,
} from "@/components/animate-ui/components/radix/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Trash, BookOpen, Calendar } from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  status: "active" | "pending" | "suspended";
  assignedExams: number;
  completedExams: number;
  averageScore: number;
  dateJoined: Date;
  invitedBy?: string;
  profileImage?: string;
  studentId?: string;
  department?: string;
  assignedExam?: string;
  departmentId?: string;
  examId?: string;
  assignedExamsList?: Array<{
    id: string;
    exam_id: string;
    exam_title: string;
    assigned_at: string;
    status: string;
    start_time?: string;
    end_time?: string;
    completion_status?: string; // 'completed', 'pending', 'expired'
  }>;
}

interface ViewStudentDialogProps {
  trigger?: React.ReactNode;
  student: Student | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEdit?: (student: Student) => void;
  onSendEmail?: (student: Student) => void;
  onDelete?: (student: Student) => void;
}

export const ViewStudentDialog = ({
  trigger,
  student,
  open,
  onOpenChange,
  onEdit,
  onSendEmail,
  onDelete,
}: ViewStudentDialogProps) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOpenChange = (openState: boolean) => {
    if (onOpenChange) {
      onOpenChange(openState);
    } else {
      setIsOpen(openState);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const dialogOpen = open !== undefined ? open : isOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        from="bottom"
        showCloseButton={true}
        className="sm:max-w-[500px]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            Student Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this student
          </DialogDescription>
        </DialogHeader>

        {student && (
          <div className="space-y-6 py-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={student.profileImage} alt={student.name} />
                <AvatarFallback className="text-lg">
                  {student.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{student.name}</h3>
                <p className="text-muted-foreground">{student.email}</p>
                <Badge
                  variant={
                    student.status === "active" ? "default" : "secondary"
                  }
                  className={
                    student.status === "active"
                      ? "bg-green-100 text-green-800 mt-1"
                      : student.status === "suspended"
                      ? "bg-red-100 text-red-800 mt-1"
                      : "bg-yellow-100 text-yellow-800 mt-1"
                  }
                >
                  {student.status.charAt(0).toUpperCase() +
                    student.status.slice(1)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Student ID
                </label>
                <p className="font-medium">
                  {student.studentId || "Not provided"}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Department
                </label>
                <p className="font-medium">
                  {student.department || "Not assigned"}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Average Score
                </label>
                <p className="font-medium">{student.averageScore}%</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Completed Exams
                </label>
                <p className="font-medium">{student.completedExams}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Date Joined
                </label>
                <p className="font-medium">{formatDate(student.dateJoined)}</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  Invited By
                </label>
                <p className="font-medium">{student.invitedBy || "Unknown"}</p>
              </div>
            </div>

            {/* Assigned Exams Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <label className="text-sm font-semibold">
                    Assigned Exams ({student.assignedExamsList?.length || 0})
                  </label>
                </div>
              </div>

              {!student.assignedExamsList || student.assignedExamsList.length === 0 ? (
                <div className="text-center py-6 bg-muted/30 rounded-md">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No exams assigned yet
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {student.assignedExamsList.map((exam) => {
                    // Determine badge styling based on completion status
                    const completionStatus = exam.completion_status || 'pending';
                    const badgeConfig = {
                      completed: {
                        variant: 'default' as const,
                        className: 'bg-green-100 text-green-800 border-green-200',
                        text: 'Completed'
                      },
                      pending: {
                        variant: 'secondary' as const,
                        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        text: 'Pending'
                      },
                      expired: {
                        variant: 'destructive' as const,
                        className: 'bg-red-100 text-red-100 border-red-200',
                        text: 'Expired'
                      }
                    };

                    const config = badgeConfig[completionStatus as keyof typeof badgeConfig] || badgeConfig.pending;

                    return (
                      <div
                        key={exam.id}
                        className="flex flex-col p-3 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-sm line-clamp-1 flex-1" title={exam.exam_title}>
                            {exam.exam_title}
                          </p>
                          <Badge
                            variant={config.variant}
                            className={`text-xs shrink-0 ${config.className}`}
                          >
                            {config.text}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {exam.start_time
                            ? new Date(exam.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : new Date(exam.assigned_at).toLocaleDateString()
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            {student && onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(student)}
                className="flex-1 sm:flex-none"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {student && onSendEmail && (
              <Button
                variant="outline"
                onClick={() => onSendEmail(student)}
                className="flex-1 sm:flex-none"
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
            )}
            {student && onDelete && (
              <Button
                variant="destructive"
                onClick={() => onDelete(student)}
                className="flex-1 sm:flex-none"
              >
                <Trash className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
          <DialogClose asChild>
            <Button variant="default" type="button">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
