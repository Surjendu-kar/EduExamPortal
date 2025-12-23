"use client";

import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "motion/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { WarningDialog } from "@/components/WarningDialog";
import { ViewStudentDialog } from "@/components/ViewStudentDialog";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  ArrowUpDown,
  Users,
  UserCheck,
  UserX,
  Trash2,
  User,
} from "lucide-react";

import StudentTableSkeleton from "@/components/skeleton/StudentTableSkeleton";

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
  }>;
}

type SortField =
  | "name"
  | "email"
  | "status"
  | "department"
  | "assignedExam"
  | "averageScore";
type SortOrder = "asc" | "desc";

interface StatsCardProps {
  title: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="gap-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold py-2">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <User className="h-8 w-8 text-muted-foreground mb-2" />
      <h3 className="text-lg font-semibold mb-2">No students found</h3>
      <p className="text-muted-foreground mb-4">
        No students match your current search and filter criteria. Try adjusting
        your filters or search terms.
      </p>
      <Button variant="outline" onClick={onReset}>
        Reset Filters
      </Button>
    </div>
  );
}

interface Exam {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  institution_id: string;
}

interface ExamAssignment {
  id: string;
  exam_id: string;
  exam_title: string;
  assigned_at: string;
  status: string;
  start_time?: string;
  end_time?: string;
  completion_status?: string; // 'completed', 'pending', 'expired'
}

interface StudentInvitation {
  id: string;
  student_email: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
  expires_at: string;
  teacher_id: string;
  exams: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    duration: number;
  };
  departments: {
    id: string;
    name: string;
    code: string;
  };
  teacher?: {
    email: string;
  };
  assigned_exams?: ExamAssignment[];
  average_score?: number;
  completed_exams?: number;
}

export default function StudentsPage() {
  const [invitations, setInvitations] = useState<StudentInvitation[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    selectedExam: string;
    selectedExams?: string[]; // Array of currently assigned exam IDs
    completedExams?: string[]; // Array of completed exam IDs (cannot be unassigned)
    expirationDate: string;
  } | null>(null);

  const itemsPerPage = 5;

  // Fetch exams and invitations with proper filtering
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get session
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          toast.error("You must be logged in");
          return;
        }

        // Get institution and department from localStorage for filtering
        const institutionId = localStorage.getItem("activeInstitutionId");
        const departmentId = localStorage.getItem("activeDepartmentId");

        // Build query params
        const params = new URLSearchParams();
        if (institutionId) {
          params.append("institutionId", institutionId);
        }
        if (departmentId && departmentId !== "all") {
          params.append("departmentId", departmentId);
        }

        const queryString = params.toString();

        // Fetch exams with filters
        const examsUrl = `/api/exams${queryString ? `?${queryString}` : ""}`;
        const examsResponse = await fetch(examsUrl, {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (examsResponse.ok) {
          const examsData = await examsResponse.json();
          setExams(examsData);
        }

        // Fetch departments filtered by active institution
        const departmentsResponse = await fetch("/api/departments", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (departmentsResponse.ok) {
          const departmentsData = await departmentsResponse.json();
          // Filter departments by active institution
          if (institutionId) {
            const filteredDepartments = departmentsData.filter(
              (dept: Department) => dept.institution_id === institutionId
            );
            setDepartments(filteredDepartments);
          } else {
            setDepartments(departmentsData);
          }
        }

        // Fetch student invitations with filters
        const studentsUrl = `/api/students${queryString ? `?${queryString}` : ""}`;
        const invitationsResponse = await fetch(studentsUrl, {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          setInvitations(invitationsData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    const handleDepartmentChange = () => {
      fetchData();
    };

    fetchData(); // Initial load

    // Listen ONLY for department changes (not institution changes)
    // Institution change is followed by department selection, so we wait for that
    window.addEventListener("departmentChanged", handleDepartmentChange);

    return () => {
      window.removeEventListener("departmentChanged", handleDepartmentChange);
    };
  }, []);

  // Transform invitations to Student format for display
  const processedStudents = useMemo(() => {
    return invitations.map((invitation) => {
      // Map database status to display status
      let displayStatus: "active" | "pending" | "suspended" = "pending";
      if (invitation.status === "accepted") {
        displayStatus = "active";
      } else if (invitation.status === "suspended") {
        displayStatus = "suspended";
      }

      // Get assigned exams list from the new assigned_exams array
      const assignedExamsList = invitation.assigned_exams || [];
      const assignedExamsCount = assignedExamsList.length;

      // Count completed exams from completion_status
      const completedFromAssignments = assignedExamsList.filter(
        exam => exam.completion_status === 'completed'
      ).length;

      // Build display string for assigned exams - always show X/Y format
      let assignedExamDisplay = "0/0";
      if (assignedExamsCount > 0) {
        assignedExamDisplay = `${completedFromAssignments}/${assignedExamsCount}`;
      }

      return {
        id: invitation.id,
        name: `${invitation.first_name} ${invitation.last_name}`,
        email: invitation.student_email,
        status: displayStatus,
        assignedExams: assignedExamsCount,
        completedExams: invitation.completed_exams || 0,
        averageScore: invitation.average_score || 0,
        dateJoined: new Date(invitation.created_at),
        invitedBy: invitation.teacher?.email || "Unknown",
        profileImage: undefined,
        studentId: invitation.id.slice(0, 8).toUpperCase(),
        department: invitation.departments?.name || "Not assigned",
        assignedExam: assignedExamDisplay,
        departmentId: invitation.departments?.id || "",
        examId: assignedExamsList.length > 0 ? assignedExamsList[0].exam_id : "",
        assignedExamsList: assignedExamsList,
      };
    });
  }, [invitations]);

  const filteredAndSortedStudents = useMemo(() => {
    const filtered = processedStudents.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.studentId &&
          student.studentId.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || student.status === statusFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const now = new Date();
        const studentDate = student.dateJoined;

        switch (dateFilter) {
          case "week":
            matchesDate =
              now.getTime() - studentDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
            break;
          case "month":
            matchesDate =
              now.getTime() - studentDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
            break;
          case "year":
            matchesDate =
              now.getTime() - studentDate.getTime() <=
              365 * 24 * 60 * 60 * 1000;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });

    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sortField) {
        case "name":
        case "email":
        case "status":
        case "department":
        case "assignedExam":
          aValue = a[sortField] || "";
          bValue = b[sortField] || "";
          break;
        case "averageScore":
          aValue = a[sortField];
          bValue = b[sortField];
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [
    processedStudents,
    searchTerm,
    statusFilter,
    dateFilter,
    sortField,
    sortOrder,
  ]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredAndSortedStudents.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const stats = useMemo(() => {
    const total = processedStudents.length;
    const active = processedStudents.filter(
      (s) => s.status === "active"
    ).length;
    const pending = processedStudents.filter(
      (s) => s.status === "pending"
    ).length;
    const suspended = processedStudents.filter(
      (s) => s.status === "suspended"
    ).length;

    return { total, active, pending, suspended };
  }, [processedStudents]);

  const resetAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
    setSortField("name");
    setSortOrder("asc");
    setSelectedRows(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    const [firstName, lastName] = student.name.split(" ");
    // Extract exam IDs from assignedExamsList
    const assignedExamIds = student.assignedExamsList?.map(exam => exam.exam_id) || [];
    const completedExamIds = student.assignedExamsList?.filter(exam => exam.status === 'completed').map(exam => exam.exam_id) || [];

    setEditingStudent({
      id: student.id,
      firstName: firstName || "",
      lastName: lastName || "",
      email: student.email,
      department: student.departmentId || "",
      selectedExam: student.examId || "",
      selectedExams: assignedExamIds, // Pass the array of assigned exam IDs
      completedExams: completedExamIds, // Pass the array of completed exam IDs
      expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    });
    setIsAddStudentOpen(true);
    setIsViewModalOpen(false);
  };

  const handleSendEmail = (student: Student) => {
    console.log("Send email to:", student.email);
    setIsViewModalOpen(false);
  };

  const handleDeleteFromView = (student: Student) => {
    setSelectedStudent(null);
    setIsViewModalOpen(false);
    handleDeleteSingle(student);
  };

  const handleSendStudentInvitation = async (studentData: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    examId?: string;
    examIds?: string[];
    expirationDate: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const isEditing = !!studentData.id;
    const loadingToast = toast.loading(
      isEditing ? "Updating student..." : "Sending invitation...",
      {
        duration: Infinity,
      }
    );

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("You must be logged in", { id: loadingToast, duration: 4000 });
        return { success: false, error: "Not authenticated" };
      }

      const response = await fetch("/api/students", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(studentData),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(
          result.error ||
            (isEditing
              ? "Failed to update student"
              : "Failed to send invitation"),
          { id: loadingToast, duration: 4000 }
        );
        return { success: false, error: result.error || "Operation failed" };
      }

      // Refresh invitations list with filters
      const institutionId = localStorage.getItem("activeInstitutionId");
      const departmentId = localStorage.getItem("activeDepartmentId");

      const params = new URLSearchParams();
      if (institutionId) {
        params.append("institutionId", institutionId);
      }
      if (departmentId && departmentId !== "all") {
        params.append("departmentId", departmentId);
      }

      const queryString = params.toString();
      const studentsUrl = `/api/students${queryString ? `?${queryString}` : ""}`;

      const invitationsResponse = await fetch(studentsUrl, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData);
      }

      toast.success(
        isEditing
          ? "Student updated successfully"
          : `Student invitation sent successfully to ${studentData.email}`,
        { id: loadingToast, duration: 4000 }
      );

      return { success: true };
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        isEditing ? "Failed to update student" : "Failed to send invitation",
        { id: loadingToast, duration: 4000 }
      );
      return { success: false, error: "Operation failed" };
    }
  };

  const toggleRowSelection = (studentId: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedRows(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedStudents.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedStudents.map((s) => s.id)));
    }
  };

  const handleDeleteSelected = () => {
    setStudentToDelete(null); // Clear single delete state
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSelected = async () => {
    const selectedIds = Array.from(selectedRows);
    const loadingToast = toast.loading("Deleting student invitations...", {
      duration: Infinity,
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("You must be logged in", { id: loadingToast, duration: 4000 });
        return;
      }

      // Delete selected invitations
      const response = await fetch("/api/students", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete invitations");
      }

      // Refresh invitations list with filters
      const institutionId = localStorage.getItem("activeInstitutionId");
      const departmentId = localStorage.getItem("activeDepartmentId");

      const params = new URLSearchParams();
      if (institutionId) {
        params.append("institutionId", institutionId);
      }
      if (departmentId && departmentId !== "all") {
        params.append("departmentId", departmentId);
      }

      const queryString = params.toString();
      const studentsUrl = `/api/students${queryString ? `?${queryString}` : ""}`;

      const invitationsResponse = await fetch(studentsUrl, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData);
      }

      setSelectedRows(new Set());
      setStudentToDelete(null);
      setIsDeleteModalOpen(false);

      toast.success(
        `${selectedIds.length} student invitation(s) deleted successfully`,
        { id: loadingToast, duration: 4000 }
      );
    } catch (error) {
      console.error("Error deleting invitations:", error);
      toast.error("Failed to delete invitations", {
        id: loadingToast,
        duration: 4000,
      });
    }
  };

  const handleDeleteSingle = (student: Student) => {
    setSelectedRows(new Set()); // Clear bulk selection state
    setStudentToDelete(student);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSingle = async () => {
    if (!studentToDelete) return;

    const loadingToast = toast.loading("Deleting student invitation...", {
      duration: Infinity,
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("You must be logged in", { id: loadingToast, duration: 4000 });
        return;
      }

      // Delete the invitation
      const response = await fetch("/api/students", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ ids: [studentToDelete.id] }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete invitation");
      }

      // Refresh invitations list with filters
      const institutionId = localStorage.getItem("activeInstitutionId");
      const departmentId = localStorage.getItem("activeDepartmentId");

      const params = new URLSearchParams();
      if (institutionId) {
        params.append("institutionId", institutionId);
      }
      if (departmentId && departmentId !== "all") {
        params.append("departmentId", departmentId);
      }

      const queryString = params.toString();
      const studentsUrl = `/api/students${queryString ? `?${queryString}` : ""}`;

      const invitationsResponse = await fetch(studentsUrl, {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData);
      }

      setStudentToDelete(null);
      setIsDeleteModalOpen(false);

      toast.success("Student invitation deleted successfully", {
        id: loadingToast,
        duration: 4000,
      });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      toast.error("Failed to delete invitation", {
        id: loadingToast,
        duration: 4000,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <StatsCard
          title="Total Students"
          value={stats.total}
          description="All registered students"
          icon={Users}
        />
        <StatsCard
          title="Active Students"
          value={stats.active}
          description="Currently active"
          icon={UserCheck}
        />
        <StatsCard
          title="Pending Students"
          value={stats.pending}
          description="Awaiting approval"
          icon={UserX}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-1">
                <CardTitle>Students List</CardTitle>
                <CardDescription>
                  A list of all students in your institution
                </CardDescription>
              </div>
              <Button onClick={() => setIsAddStudentOpen(true)}>
                <Plus className="h-4 w-4" />
                Add New Student
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {selectedRows.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md"
                >
                  <span className="text-sm font-medium">
                    {selectedRows.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleDeleteSelected}
                    className="h-7"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedRows(new Set())}
                    className="h-7"
                  >
                    Clear
                  </Button>
                </motion.div>
              )}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students by name, email or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]" size="lg">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-[180px]" size="lg">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedRows.size === paginatedStudents.length &&
                            paginatedStudents.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 resize-x overflow-hidden min-w-[150px] border-r"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Name</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 resize-x overflow-hidden min-w-[200px] border-r"
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Email</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 resize-x overflow-hidden min-w-[100px] border-r"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Status</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 resize-x overflow-hidden min-w-[120px] border-r"
                        onClick={() => handleSort("department")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Department</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 resize-x overflow-hidden min-w-[150px] border-r"
                        onClick={() => handleSort("assignedExam")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Exam Progress</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 resize-x overflow-hidden min-w-[120px]"
                        onClick={() => handleSort("averageScore")}
                      >
                        <div className="flex items-center space-x-2">
                          <span>Average Score</span>
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <StudentTableSkeleton />
                    ) : paginatedStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <EmptyState onReset={resetAllFilters} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {paginatedStudents.map((student, index) => (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{
                              opacity: 0,
                              x: 100,
                              transition: { duration: 0.3 },
                            }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            layout
                            className="border-b transition-all duration-200 hover:bg-muted/30 hover:shadow-sm data-[state=selected]:bg-muted group cursor-pointer"
                            onClick={() => handleViewStudent(student)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedRows.has(student.id)}
                                onCheckedChange={() =>
                                  toggleRowSelection(student.id)
                                }
                                aria-label={`Select ${student.name}`}
                              />
                            </TableCell>
                            <TableCell className="border-r">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={student.profileImage}
                                    alt={student.name}
                                  />
                                  <AvatarFallback>
                                    {student.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {student.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="border-r">
                              {student.email}
                            </TableCell>
                            <TableCell className="border-r">
                              <Badge
                                variant={
                                  student.status === "active"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  student.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : student.status === "suspended"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {student.status.charAt(0).toUpperCase() +
                                  student.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="border-r">
                              {student.department || "Not assigned"}
                            </TableCell>
                            <TableCell className="border-r">
                              {student.assignedExam || "No exam assigned"}
                            </TableCell>
                            <TableCell>{student.averageScore}%</TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to{" "}
                {Math.min(
                  startIndex + itemsPerPage,
                  filteredAndSortedStudents.length
                )}{" "}
                of {filteredAndSortedStudents.length} students
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Student Dialog */}
      <AddStudentDialog
        isOpen={isAddStudentOpen}
        exams={exams}
        departments={departments}
        onOpenChange={(open) => {
          setIsAddStudentOpen(open);
          if (!open) {
            setEditingStudent(null);
          }
        }}
        onSendInvitation={handleSendStudentInvitation}
        editStudent={editingStudent}
      />

      <ViewStudentDialog
        student={selectedStudent}
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        onEdit={handleEditStudent}
        onSendEmail={handleSendEmail}
        onDelete={handleDeleteFromView}
      />

      <WarningDialog
        open={isDeleteModalOpen && selectedRows.size > 0}
        onOpenChange={setIsDeleteModalOpen}
        title={
          selectedRows.size > 1 ? "Confirm Bulk Deletion" : "Confirm Deletion"
        }
        description={`Are you sure you want to delete ${
          selectedRows.size
        } selected student${
          selectedRows.size > 1 ? "s" : ""
        }? This action cannot be undone.`}
        confirmText={`Delete ${selectedRows.size} Student${
          selectedRows.size > 1 ? "s" : ""
        }`}
        onConfirm={confirmDeleteSelected}
        onCancel={() => {
          setIsDeleteModalOpen(false);
        }}
      >
        <div className="bg-muted p-3 rounded-md">
          <p className="text-sm font-medium mb-2">Students to be deleted:</p>
          <div className="space-y-1">
            {Array.from(selectedRows).map((studentId) => {
              const student = processedStudents.find((s) => s.id === studentId);
              return student ? (
                <div key={studentId} className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src={student.profileImage}
                      alt={student.name}
                    />
                    <AvatarFallback className="text-xs">
                      {student.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{student.name}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      </WarningDialog>

      <WarningDialog
        open={isDeleteModalOpen && studentToDelete !== null}
        onOpenChange={setIsDeleteModalOpen}
        title="Confirm Deletion"
        description={`Are you sure you want to delete ${studentToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete Student"
        onConfirm={confirmDeleteSingle}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setStudentToDelete(null);
        }}
      >
        {studentToDelete && (
          <div className="bg-muted p-3 rounded-md">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={studentToDelete.profileImage}
                  alt={studentToDelete.name}
                />
                <AvatarFallback>
                  {studentToDelete.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{studentToDelete.name}</p>
                <p className="text-sm text-muted-foreground">
                  {studentToDelete.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </WarningDialog>
    </motion.div>
  );
}
