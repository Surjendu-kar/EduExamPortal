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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

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
  institution_id?: string;
}

interface AddStudentDialogProps {
  trigger?: React.ReactNode;
  exams?: Exam[];
  departments?: Department[];
  onSaveStudent?: (student: {
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    selectedExam: string;
    expirationDate: string;
  }) => void;
  onSendInvitation?: (student: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    examId?: string; // Optional - for edit mode
    examIds?: string[]; // Optional - array for new invitations
    expirationDate: string;
  }) => Promise<{ success: boolean; error?: string }>;
  editStudent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    selectedExam: string;
    selectedExams?: string[]; // Array of currently assigned exam IDs
    completedExams?: string[]; // Array of completed exam IDs (cannot be unassigned)
    expirationDate: string;
  } | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const AddStudentDialog = ({
  trigger,
  exams = [],
  departments = [],
  onSaveStudent,
  onSendInvitation,
  editStudent,
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
}: AddStudentDialogProps) => {
  const getDefaultExpirationDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toISOString().split("T")[0];
  };

  const [formData, setFormData] = React.useState({
    firstName: editStudent?.firstName || "",
    lastName: editStudent?.lastName || "",
    email: editStudent?.email || "",
    department: editStudent?.department || "",
    selectedExam: editStudent?.selectedExam || "", // Keep for backward compatibility in edit mode
    selectedExams: [] as string[], // NEW: Array of selected exam IDs
    expirationDate: editStudent?.expirationDate || getDefaultExpirationDate(),
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [activeDepartmentId, setActiveDepartmentId] = React.useState<
    string | null
  >(null);
  const [loadingDepartments, setLoadingDepartments] = React.useState(false);
  const [fetchedDepartments, setFetchedDepartments] = React.useState<
    Department[]
  >([]);
  const [loadingExams, setLoadingExams] = React.useState(false);
  const [filteredExams, setFilteredExams] = React.useState<Exam[]>([]);
  const [originalEditData, setOriginalEditData] = React.useState<{
    department: string;
    selectedExams: string[];
  } | null>(null);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  const isEditing = !!editStudent;

  // Determine which departments to use: fetched or provided via props
  const departmentsToUse =
    fetchedDepartments.length > 0 ? fetchedDepartments : departments;

  // Determine which exams to use: filtered or provided via props
  const examsToUse = filteredExams.length > 0 ? filteredExams : exams;

  // Fetch active department and departments when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      const deptId = localStorage.getItem("activeDepartmentId");
      setActiveDepartmentId(deptId);

      // Reset form data when opening in add mode
      if (!isEditing) {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          department: "",
          selectedExam: "",
          selectedExams: [],
          expirationDate: getDefaultExpirationDate(),
        });
        setErrors({});
        setFilteredExams([]);
        setFetchedDepartments([]);
      }

      // Store original edit data to restore later if department is changed and changed back
      if (isEditing && editStudent) {
        setOriginalEditData({
          department: editStudent.department,
          selectedExams: editStudent.selectedExams || [],
        });
      }

      // Only fetch departments if "All Departments" is selected or in edit mode
      if (deptId === "all" || isEditing) {
        fetchDepartments();
      }

      // Initialize exams based on active department or edit student's department
      if (isEditing && editStudent?.department) {
        // EDIT MODE: Fetch exams for the student's assigned department (HIGHEST PRIORITY)
        fetchExamsForDepartment(editStudent.department);
      } else if (deptId && deptId !== "all") {
        // If a specific department is active in sidebar, fetch its exams
        fetchExamsForDepartment(deptId);
      } else {
        // Otherwise, use exams from props (all departments)
        setFilteredExams(exams);
      }
    } else {
      // Clear original edit data when dialog closes
      setOriginalEditData(null);
    }
  }, [isOpen, isEditing, exams, editStudent?.department]);

  const fetchDepartments = async () => {
    try {
      setLoadingDepartments(true);
      // Get active institution from localStorage
      const activeInstitutionId = localStorage.getItem("activeInstitutionId");

      // Fetch departments from API
      const response = await fetch("/api/departments");
      const departmentsData: Department[] = await response.json();

      if (response.ok) {
        // Filter departments by institution if institution is selected
        let filteredDepartments: Department[] = [];
        if (activeInstitutionId) {
          filteredDepartments = departmentsData
            .filter(
              (dept) =>
                dept.institution_id === activeInstitutionId && dept.id !== "all"
            )
            .map((dept) => ({
              id: dept.id,
              name: dept.name,
              code: dept.code,
            }));
        } else {
          // If no institution selected, show all departments except "all"
          filteredDepartments = departmentsData
            .filter((dept) => dept.id !== "all")
            .map((dept) => ({
              id: dept.id,
              name: dept.name,
              code: dept.code,
            }));
        }
        setFetchedDepartments(filteredDepartments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      setFetchedDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchExamsForDepartment = async (departmentId: string) => {
    try {
      setLoadingExams(true);
      // Get active institution from localStorage
      const activeInstitutionId = localStorage.getItem("activeInstitutionId");

      // Build query params
      const params = new URLSearchParams();
      if (activeInstitutionId) {
        params.append("institutionId", activeInstitutionId);
      }
      if (departmentId && departmentId !== "all") {
        params.append("departmentId", departmentId);
      }

      const queryString = params.toString();
      const examsUrl = `/api/exams${queryString ? `?${queryString}` : ""}`;

      const response = await fetch(examsUrl);
      const examsData: Exam[] = await response.json();

      if (response.ok) {
        setFilteredExams(examsData);
      } else {
        setFilteredExams([]);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
      setFilteredExams([]);
    } finally {
      setLoadingExams(false);
    }
  };

  React.useEffect(() => {
    if (editStudent) {
      setFormData({
        firstName: editStudent.firstName,
        lastName: editStudent.lastName,
        email: editStudent.email,
        department: editStudent.department,
        selectedExam: editStudent.selectedExam,
        selectedExams: editStudent.selectedExams || [], // Use assigned exams if available
        expirationDate: editStudent.expirationDate,
      });
    }
  }, [editStudent]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Only require department selection if "All Departments" is selected or in edit mode
    if ((activeDepartmentId === "all" || isEditing) && !formData.department) {
      newErrors.department = "Department is required";
    }

    // Exam selection is now optional (removed validation)
    // if (!formData.selectedExam && !formData.selectedExams.length) {
    //   newErrors.selectedExam = "Exam selection is required";
    // }

    if (!formData.expirationDate) {
      newErrors.expirationDate = "Expiration date is required";
    } else {
      const selectedDate = new Date(formData.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.expirationDate = "Expiration date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Use activeDepartmentId if a specific department is selected (not "all")
      const departmentToUse =
        activeDepartmentId && activeDepartmentId !== "all" && !isEditing
          ? activeDepartmentId
          : formData.department;

      if (onSendInvitation) {
        // Use the new invitation API
        const result = await onSendInvitation({
          id: editStudent?.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          departmentId: departmentToUse,
          examIds: formData.selectedExams, // Send array for both create and edit
          expirationDate: formData.expirationDate,
        });

        if (result.success) {
          if (!isEditing) {
            setFormData({
              firstName: "",
              lastName: "",
              email: "",
              department: "",
              selectedExam: "",
              selectedExams: [],
              expirationDate: getDefaultExpirationDate(),
            });
          }
          setIsOpen(false);
        }
      } else {
        // Fallback to old method
        const submissionData = {
          ...formData,
          department: departmentToUse,
        };
        onSaveStudent?.(submissionData);
        if (!isEditing) {
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            department: "",
            selectedExam: "",
            selectedExams: [],
            expirationDate: getDefaultExpirationDate(),
          });
        }
        setIsOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // When department changes, fetch exams for that department
    if (field === "department" && value) {
      fetchExamsForDepartment(value);

      // Check if we're in edit mode and switching back to original department
      if (isEditing && originalEditData && value === originalEditData.department) {
        // Restore original selected exams
        setFormData((prev) => ({
          ...prev,
          selectedExams: originalEditData.selectedExams,
        }));
      } else {
        // Clear the selected exams since department changed
        setFormData((prev) => ({ ...prev, selectedExam: "", selectedExams: [] }));
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    // Reset when closing the dialog (for add mode)
    if (!open && !isEditing) {
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        department: "",
        selectedExam: "",
        selectedExams: [],
        expirationDate: getDefaultExpirationDate(),
      });
      setErrors({});
      setFilteredExams([]); // Clear previously fetched exams
      setFetchedDepartments([]); // Clear previously fetched departments
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        from="bottom"
        showCloseButton={true}
        className="sm:max-w-[655px]"
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Student" : "Add New Student"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the student details below."
                : "Add a new student to your institution. Fill in the details below."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* First row: firstName, lastName */}
            <div className="grid grid-cols-3 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First Name *</Label>
                <Input
                  id="first-name"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  placeholder="John"
                  className={errors.firstName ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <span className="text-sm text-red-500">
                    {errors.firstName}
                  </span>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="last-name">Last Name *</Label>
                <Input
                  id="last-name"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  placeholder="Doe"
                  className={errors.lastName ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <span className="text-sm text-red-500">
                    {errors.lastName}
                  </span>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiration-date">Expiration Date *</Label>
                <Input
                  id="expiration-date"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) =>
                    handleInputChange("expirationDate", e.target.value)
                  }
                  className={errors.expirationDate ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.expirationDate && (
                  <span className="text-sm text-red-500">
                    {errors.expirationDate}
                  </span>
                )}
              </div>
            </div>

            {/* Second row: email, department (conditional) */}
            <div
              className={`grid ${
                activeDepartmentId === "all" || isEditing
                  ? "grid-cols-2"
                  : "grid-cols-1"
              } gap-2`}
            >
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="john.doe@university.edu"
                  className={errors.email ? "border-red-500" : ""}
                  disabled={isSubmitting}
                />
                {errors.email && (
                  <span className="text-sm text-red-500">{errors.email}</span>
                )}
              </div>

              {(activeDepartmentId === "all" || isEditing) && (
                <div className="grid gap-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) =>
                      handleInputChange("department", value)
                    }
                    disabled={loadingDepartments || isSubmitting}
                  >
                    <SelectTrigger
                      className={`!w-full ${
                        errors.department ? "border-red-500" : ""
                      }`}
                      size="lg"
                    >
                      <SelectValue
                        placeholder={
                          loadingDepartments
                            ? "Loading departments..."
                            : "Select department"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingDepartments ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Loading departments...
                        </div>
                      ) : departmentsToUse.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No departments available
                        </div>
                      ) : (
                        departmentsToUse.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name} {dept.code ? `(${dept.code})` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <span className="text-sm text-red-500">
                      {errors.department}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Third row: Assign Exams (Optional) section */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="exams">
                  Assign Exams{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    (Optional)
                  </span>
                </Label>
                {formData.selectedExams.length > 0 && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                    {formData.selectedExams.length} selected
                  </span>
                )}
              </div>
              {loadingExams ? (
                <div className="p-4 border rounded-md text-center text-sm text-muted-foreground">
                  Loading exams...
                </div>
              ) : (activeDepartmentId === "all" || isEditing) &&
                !formData.department ? (
                <div className="p-4 border rounded-md text-center text-sm text-muted-foreground">
                  Please select a department first
                </div>
              ) : examsToUse.length === 0 ? (
                <div className="p-4 border rounded-md text-center text-sm text-muted-foreground">
                  No exams available for this department
                </div>
              ) : (
                <div className=" rounded-md max-h-[240px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    {examsToUse.map((exam) => (
                      <label
                        key={exam.id}
                        htmlFor={`exam-${exam.id}`}
                        className={`flex items-start space-x-2 p-2.5 border rounded-md transition-all ${
                          editStudent?.completedExams?.includes(exam.id)
                            ? 'opacity-60 cursor-not-allowed bg-muted/30'
                            : 'hover:bg-muted/50 hover:border-primary/50 cursor-pointer'
                        }`}
                      >
                        <Checkbox
                          id={`exam-${exam.id}`}
                          checked={formData.selectedExams.includes(exam.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData((prev) => ({
                                ...prev,
                                selectedExams: [...prev.selectedExams, exam.id],
                              }));
                            } else {
                              setFormData((prev) => ({
                                ...prev,
                                selectedExams: prev.selectedExams.filter(
                                  (id) => id !== exam.id
                                ),
                              }));
                            }
                          }}
                          disabled={isSubmitting || editStudent?.completedExams?.includes(exam.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 leading-tight">
                          <div className="flex items-center gap-2">
                            <div
                              className="text-sm font-medium line-clamp-2"
                              title={exam.title}
                            >
                              {exam.title}
                            </div>
                            {editStudent?.completedExams?.includes(exam.id) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium shrink-0">
                                Completed
                              </span>
                            )}
                          </div>
                          {exam.start_time && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(exam.start_time).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" }
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Sending Invitation..."
                : isEditing
                ? "Update Student"
                : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
