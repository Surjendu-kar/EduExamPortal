"use client";

import * as React from "react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/animate-ui/primitives/radix/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import {
  BadgeCheck,
  BookOpen,
  Building,
  ChevronRight,
  ChevronsUpDown,
  Folder,
  Forward,
  Frame,
  GalleryVerticalEnd,
  LogOut,
  Map,
  MoreHorizontal,
  Plus,
  Settings2,
  SquareTerminal,
  Trash2,
  Edit,
  MoreVertical,
  User,
  FileText,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeTogglerButton } from "@/components/animate-ui/components/buttons/theme-toggler";
import { DepartmentDialog } from "@/components/DepartmentDialog";
import { InstitutionDialog } from "@/components/InstitutionDialog";
import departmentsData from "@/data/departmentsData.json";
import { supabase } from "@/lib/supabase/client";
import { signOut } from '@/lib/auth';
import toast from 'react-hot-toast';
import { WarningDialog } from "@/components/WarningDialog";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter,
} from "@/components/animate-ui/components/radix/dialog";
import { Button } from "@/components/ui/button";

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  institution_id?: string;
  logo: React.ComponentType<{ className?: string }>;
}

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
}

interface Breadcrumb {
  title: string;
  url: string;
  isLast: boolean;
}

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType;
  items?: {
    title: string;
    url: string;
  }[];
}

interface RecentItem {
  name: string;
  url: string;
  icon: React.ComponentType;
}

interface UserProfile {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  user_metadata?: {
    avatar_url?: string;
  };
}

interface Institution {
  id: string;
  name: string;
  description?: string;
}

interface InstitutionWithDepartmentInfo extends Institution {
  departmentCount?: number;
}

// Map departments data to include logos
const DEPARTMENTS_WITH_LOGOS = departmentsData.map((dept) => ({
  ...dept,
  logo: GalleryVerticalEnd,
}));

// Define navigation items for different roles
const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    {
      title: "Management",
      url: "/admin/management",
      icon: SquareTerminal,
      items: [
        {
          title: "Teachers",
          url: "/admin/management/teachers",
        },
        {
          title: "Students",
          url: "/admin/management/students",
        },
        {
          title: "Exams",
          url: "/admin/management/exams",
        },
        {
          title: "Grading",
          url: "/admin/management/grading",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: BarChart3,
      items: [
        {
          title: "Platform Stats",
          url: "/admin/analytics/platform-stats",
        },
        {
          title: "Usage Reports",
          url: "/admin/analytics/usage-reports",
        },
        {
          title: "Performance",
          url: "/admin/analytics/performance",
        },
      ],
    },
    {
      title: "Communications",
      url: "/admin/communications",
      icon: BookOpen,
      items: [
        {
          title: "Notifications",
          url: "/admin/communications/notifications",
        },
        {
          title: "Messages",
          url: "/admin/communications/messages",
        },
        {
          title: "Announcements",
          url: "/admin/communications/announcements",
        },
      ],
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings2,
      items: [
        {
          title: "System Config",
          url: "/admin/settings/system-config",
        },
        {
          title: "Permissions",
          url: "/admin/settings/permissions",
        },
        {
          title: "Security",
          url: "/admin/settings/security",
        },
        {
          title: "Backup",
          url: "/admin/settings/backup",
        },
        {
          title: "Email Templates",
          url: "/admin/settings/email-templates",
        },
      ],
    },
  ],
  teacher: [
    {
      title: "Management",
      url: "/teacher/management",
      icon: SquareTerminal,
      items: [
        {
          title: "Students",
          url: "/teacher/management/students",
        },
        {
          title: "Exams",
          url: "/teacher/management/exams",
        },
        {
          title: "Grading",
          url: "/teacher/management/grading",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/teacher/analytics",
      icon: BarChart3,
      items: [
        {
          title: "Student Performance",
          url: "/teacher/analytics/performance",
        },
        {
          title: "Exam Results",
          url: "/teacher/analytics/results",
        },
      ],
    },
    {
      title: "Settings",
      url: "/teacher/settings",
      icon: Settings2,
      items: [
        {
          title: "Email Templates",
          url: "/teacher/settings/email-templates",
        },
      ],
    },
  ],
  student: [
    {
      title: "Dashboard",
      url: "/student/dashboard",
      icon: SquareTerminal,
    },
    {
      title: "Exams",
      url: "/student/exams",
      icon: FileText,
    },
    {
      title: "Results",
      url: "/student/results",
      icon: BarChart3,
    },
  ],
};

const RECENT_ITEMS: Record<string, RecentItem[]> = {
  admin: [
    {
      name: "Recent Assignments",
      url: "/admin/recent-assignments",
      icon: Frame,
    },
    {
      name: "Pending Invitations",
      url: "/admin/pending-invitations",
      icon: Map,
    },
  ],
  teacher: [
    {
      name: "Recent Exams",
      url: "/teacher/recent-exams",
      icon: Frame,
    },
    {
      name: "Pending Invitations",
      url: "/teacher/pending-invitations",
      icon: Map,
    },
  ],
  student: [
    {
      name: "Upcoming Exams",
      url: "/student/upcoming-exams",
      icon: Calendar,
    },
    {
      name: "Recent Results",
      url: "/student/recent-results",
      icon: BarChart3,
    },
  ],
};

// Helper function to check if a nav item is active
function isNavItemActive(pathname: string, itemUrl: string): boolean {
  if (pathname.startsWith(itemUrl)) {
    return true;
  }
  
  // Special case: /student/exam/[id] should make /student/exams active
  if (itemUrl === "/student/exams" && pathname.startsWith("/student/exam/")) {
    return true;
  }
  
  return false;
}

// Helper function to generate breadcrumbs from pathname
function generateBreadcrumbs(pathname: string, customBreadcrumbs: Record<string, string> = {}): Breadcrumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: Breadcrumb[] = [];

  // Skip role prefix for breadcrumbs
  if (segments[0] === "admin" || segments[0] === "teacher" || segments[0] === "student") {
    segments.shift(); // Remove role from segments
  }

  let currentPath = pathname.split("/").slice(0, 2).join("/"); // Start from role base

  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    const isLast = i === segments.length - 1;

    // Check if custom breadcrumb exists for this segment
    const customTitle = customBreadcrumbs[segments[i]];
    
    // If custom title exists, use it
    if (customTitle) {
      breadcrumbs.push({
        title: customTitle,
        url: currentPath,
        isLast,
      });
      continue;
    }

    // Skip UUID-like segments (exam IDs) - don't show them until custom title loads
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidPattern.test(segments[i])) {
      continue;
    }
    
    // Convert segment to title case
    const title = segments[i]
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbs.push({
      title,
      url: currentPath,
      isLast,
    });
  }

  return breadcrumbs;
}

// Extract sidebar content to prevent unnecessary re-renders
const SidebarContentMemo = React.memo(function SidebarContent({
  navItems,
  recentItems,
  pathname,
  openSection,
  setOpenSection,
}: {
  navItems: NavItem[];
  recentItems: RecentItem[];
  pathname: string;
  openSection: string;
  setOpenSection: (section: string) => void;
  isPathInSection: (sectionPath: string) => boolean;
}) {
  const isMobile = useIsMobile();
  
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Platform</SidebarGroupLabel>
        <SidebarMenu>
          {navItems.map((item: NavItem) => (
            item.items && item.items.length > 0 ? (
              // Items with sub-items (use collapsible)
              <Collapsible
                key={item.title}
                asChild
                open={openSection === item.title}
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    setOpenSection(item.title);
                  } else if (openSection === item.title) {
                    setOpenSection("");
                  }
                }}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem: { title: string; url: string }) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isNavItemActive(pathname, subItem.url)}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              // Items without sub-items (simple link)
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isNavItemActive(pathname, item.url)}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          ))}
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Quick Access</SidebarGroupLabel>
        <SidebarMenu>
          {recentItems.map((item: RecentItem) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={isNavItemActive(pathname, item.url)}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <Folder className="text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Forward className="text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <MoreHorizontal className="text-sidebar-foreground/70" />
              <span>More</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
});

export function AnimatedSidebar({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [institutions, setInstitutions] = React.useState<InstitutionWithDepartmentInfo[]>([] as InstitutionWithDepartmentInfo[]);
  const [loadingInstitutions, setLoadingInstitutions] = React.useState(true);
  const [departments, setDepartments] = React.useState<Department[]>(DEPARTMENTS_WITH_LOGOS);
  const [activeDepartment, setActiveDepartment] = React.useState<Department>(DEPARTMENTS_WITH_LOGOS[0]);
  const [activeInstitution, setActiveInstitution] = React.useState<InstitutionWithDepartmentInfo | null>(null);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [institutionToDelete, setInstitutionToDelete] = useState<Institution | null>(null);
  const [editingDepartment, setEditingDepartment] =
    React.useState<Department | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [departmentToDelete, setDepartmentToDelete] = React.useState<Department | null>(null);
  const [isInstitutionDialogOpen, setIsInstitutionDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isDepartmentsListDialogOpen, setIsDepartmentsListDialogOpen] = useState(false);
  const [isEditInstitutionDialogOpen, setIsEditInstitutionDialogOpen] = useState(false);
  const [showDeleteInstitutionDialog, setShowDeleteInstitutionDialog] = useState(false);

  const breadcrumbs = useMemo(() => {
    return generateBreadcrumbs(pathname, {});
  }, [pathname]);

  // Check if current path belongs to a navigation section
  const isPathInSection = useCallback(
    (sectionPath: string): boolean => {
      return pathname.startsWith(sectionPath);
    },
    [pathname]
  );

  // State to manage which section is open
  const [openSection, setOpenSection] = React.useState<string>(() => {
    if (userRole) {
      return NAV_ITEMS[userRole]?.find((item) => isPathInSection(item.url))?.title || "";
    }
    return "";
  });

  // Fetch user data and role
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            // Fetch user profile data directly using the user ID
            const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (!profileError && profileData) {
              setUserRole(profileData.role.toLowerCase());
              setUserData({
                ...user,
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                role: profileData.role,
                email: profileData.email
              });

              // Also store in localStorage for future use
              localStorage.setItem('userRole', profileData.role);
              localStorage.setItem('userFirstName', profileData.first_name || '');
              localStorage.setItem('userLastName', profileData.last_name || '');
              localStorage.setItem('userEmail', profileData.email || '');

              // For non-admin users (teachers/students), set their assigned institution and department
              if (profileData.role.toLowerCase() !== 'admin') {
                if (profileData.institution_id) {
                  // Fetch and set the user's assigned institution
                  const { data: userInstitution } = await supabase
                    .from('institutions')
                    .select('*')
                    .eq('id', profileData.institution_id)
                    .single();

                  if (userInstitution) {
                    setActiveInstitution(userInstitution);
                    localStorage.setItem('activeInstitutionId', userInstitution.id);
                  }
                }

                if (profileData.department_id) {
                  // Fetch and set the user's assigned department
                  const { data: userDepartment } = await supabase
                    .from('departments')
                    .select('*')
                    .eq('id', profileData.department_id)
                    .single();

                  if (userDepartment) {
                    setActiveDepartment({
                      ...userDepartment,
                      logo: GalleryVerticalEnd
                    });
                    localStorage.setItem('activeDepartmentId', userDepartment.id);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          // No user logged in, clear user data
          setUserRole(null);
          setUserData(null);
          localStorage.removeItem('userRole');
          localStorage.removeItem('userFirstName');
          localStorage.removeItem('userLastName');
          localStorage.removeItem('userEmail');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        fetchUserData();
      } else if (event === 'SIGNED_OUT') {
        // Clear user data on sign out
        setUserRole(null);
        setUserData(null);
        localStorage.removeItem('userRole');
        localStorage.removeItem('userFirstName');
        localStorage.removeItem('userLastName');
        localStorage.removeItem('userEmail');
      }
    });

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array means this runs only once

  // Update open section when pathname or userRole changes
  useEffect(() => {
    if (userRole) {
      const currentSection = NAV_ITEMS[userRole]?.find((item) =>
        isPathInSection(item.url)
      );
      if (currentSection) {
        setOpenSection(currentSection.title);
      }
    }
  }, [pathname, isPathInSection, userRole]);

  // Fetch institutions from API
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        setLoadingInstitutions(true);
        
        // Fetch both institutions and departments
        const [institutionsResponse, departmentsResponse] = await Promise.all([
          fetch('/api/institutions'),
          fetch('/api/departments')
        ]);
        
        const institutionsData = await institutionsResponse.json();
        const departmentsData = await departmentsResponse.json();
        
        if (institutionsResponse.ok && departmentsResponse.ok) {
          // Create a map of institution ID to department count
          const departmentCountMap: Record<string, number> = {};
          
          // Count departments for each institution
          departmentsData.forEach((dept: Department) => {
            if (dept.institution_id) {
              departmentCountMap[dept.institution_id] = 
                (departmentCountMap[dept.institution_id] || 0) + 1;
            }
          });
          
          // Add department count to each institution
          const institutionsWithDepartmentInfo = institutionsData.map((inst: Institution) => ({
            ...inst,
            departmentCount: departmentCountMap[inst.id] || 0
          }));
          
          setInstitutions(institutionsWithDepartmentInfo);
          
          // Set active institution from localStorage or first institution
          const storedInstitutionId = localStorage.getItem('activeInstitutionId');
          const storedInstitution = institutionsWithDepartmentInfo.find(
            (inst: InstitutionWithDepartmentInfo) => inst.id === storedInstitutionId
          );
          setActiveInstitution(storedInstitution || institutionsWithDepartmentInfo[0] || null);
        }
      } catch (error) {
        console.error('Error fetching institutions and departments:', error);
      } finally {
        setLoadingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, []);

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoadingDepartments(true);
        const response = await fetch('/api/departments');
        const departmentsData = await response.json();
        
        if (response.ok) {
          let processedDepartments = [];
          let institutionDepartments = [];
          
          // If we have an active institution, filter departments by that institution
          if (activeInstitution) {
            institutionDepartments = departmentsData
              .filter((dept: Department) => {
                return dept.institution_id === activeInstitution.id;
              })
              .map((dept: Department) => ({
                ...dept,
                logo: GalleryVerticalEnd,
              }));
          } else {
            // Otherwise, use all departments (for backward compatibility)
            institutionDepartments = departmentsData.map((dept: Department) => ({
              ...dept,
              logo: GalleryVerticalEnd,
            }));
          }
          
          // Only add "All Departments" option if there are actual departments
          if (institutionDepartments.length > 0) {
            const allDept = {
              id: "all",
              name: "All Departments",
              code: "ALL",
              description: activeInstitution 
                ? `View all departments in ${activeInstitution.name}` 
                : "View all departments",
              logo: GalleryVerticalEnd,
            };
            
            processedDepartments = [allDept, ...institutionDepartments];
          } else {
            // No departments available
            processedDepartments = institutionDepartments;
          }
          
          setDepartments(processedDepartments);

          // Check if there's a stored department ID in localStorage
          const storedDepartmentId = localStorage.getItem('activeDepartmentId');
          const storedDepartment = processedDepartments.find(
            (dept: Department) => dept.id === storedDepartmentId
          );

          if (storedDepartment) {
            // Use the stored department if it exists in the current list
            setActiveDepartment(storedDepartment);
            // Don't dispatch event on initial load - pages will fetch on mount
          } else {
            // Keep the currently active department if it still exists, otherwise switch to first or "all"
            const currentActiveStillExists = processedDepartments.some(
              (dept: Department) => dept.id === activeDepartment.id
            );

            if (!currentActiveStillExists) {
              // If there are departments, select the first one or "all"
              // If no departments, keep current selection
              if (processedDepartments.length > 0) {
                setActiveDepartment(processedDepartments[0]);
                // Update localStorage to match the UI state
                localStorage.setItem('activeDepartmentId', processedDepartments[0].id);
                // Don't dispatch event on initial load - pages will fetch on mount
              }
            }
          }
        } else {
          console.error('Failed to fetch departments:', departmentsData.error);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitution]);

  // Memoize department functions to prevent unnecessary re-renders
  const handleAddDepartment = useCallback(async (department: DepartmentFormData): Promise<void> => {
    try {
      const loadingToast = toast.loading('Adding department...');
      
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: department.name,
          code: department.code,
          description: department.description,
          institution_id: activeInstitution?.id
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success(result.message || 'Department added successfully');
        
        // Refresh departments list for the current institution
        const refreshResponse = await fetch('/api/departments');
        const departmentsData = await refreshResponse.json();
        
        if (refreshResponse.ok && activeInstitution) {
          // Filter departments by institution
          const institutionDepartments = departmentsData
            .filter((dept: Department) => dept.institution_id === activeInstitution.id)
            .map((dept: Department) => ({
              ...dept,
              logo: GalleryVerticalEnd,
            }));
        
          // Ensure we always have "All Departments" as the first option
          const allDept = institutionDepartments.find((d: Department) => 
            (d.code || '').toUpperCase() === "ALL"
          );
        
          const finalDepartments = allDept 
            ? [allDept, ...institutionDepartments.filter((d: Department) => 
                (d.code || '').toUpperCase() !== "ALL"
              )]
            : [
                {
                  id: "all",
                  name: "All Departments",
                  code: "ALL",
                  description: `View all departments in ${activeInstitution.name}`,
                  logo: GalleryVerticalEnd,
                },
                ...institutionDepartments
              ];
        
        setDepartments(finalDepartments);
        
        // Update institution department counts
        const [institutionsResponse] = await Promise.all([
          fetch('/api/institutions'),
        ]);
        
        if (institutionsResponse.ok) {
          const institutionsData = await institutionsResponse.json();
          // Create a map of institution ID to department count
          const departmentCountMap: Record<string, number> = {};
          
          // Count departments for each institution
          departmentsData.forEach((dept: Department) => {
            if (dept.institution_id) {
              departmentCountMap[dept.institution_id] = 
                (departmentCountMap[dept.institution_id] || 0) + 1;
            }
          });
          
          // Add department count to each institution
          const institutionsWithDepartmentInfo = institutionsData.map((inst: Institution) => ({
            ...inst,
            departmentCount: departmentCountMap[inst.id] || 0
          }));
          
          setInstitutions(institutionsWithDepartmentInfo);
        }
      }
    } else {
      toast.dismiss(loadingToast);
      toast.error(result.error || 'Failed to add department');
    }
  } catch (error) {
    toast.error('An unexpected error occurred');
    console.error('Error adding department:', error);
  }
}, [activeInstitution]);

  const handleUpdateDepartment = useCallback(async (department: DepartmentFormData): Promise<void> => {
    if (!editingDepartment) return;

    try {
      const loadingToast = toast.loading('Updating department...');
      
      const response = await fetch(`/api/departments/${editingDepartment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: department.name,
          code: department.code,
          description: department.description,
          institution_id: activeInstitution?.id
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success(result.message || 'Department updated successfully');
      
        // Refresh departments list for the current institution
        const refreshResponse = await fetch('/api/departments');
        const departmentsData = await refreshResponse.json();
      
        if (refreshResponse.ok && activeInstitution) {
          // Filter departments by institution
          const institutionDepartments = departmentsData
            .filter((dept: Department) => dept.institution_id === activeInstitution.id)
            .map((dept: Department) => ({
              ...dept,
              logo: GalleryVerticalEnd,
            }));
      
        // Ensure we always have "All Departments" as the first option
        const allDept = institutionDepartments.find((d: Department) => 
          (d.code || '').toUpperCase() === "ALL"
        );
      
        const finalDepartments = allDept 
          ? [allDept, ...institutionDepartments.filter((d: Department) => 
              (d.code || '').toUpperCase() !== "ALL"
            )]
        : [
            {
              id: "all",
              name: "All Departments",
              code: "ALL",
              description: `View all departments in ${activeInstitution.name}`,
              logo: GalleryVerticalEnd,
            },
            ...institutionDepartments
          ];
      
        setDepartments(finalDepartments);
      
        // Update active department if it was the one being edited
        const updatedDept = finalDepartments.find((dept: Department) => dept.id === editingDepartment.id);
        if (updatedDept && activeDepartment.id === editingDepartment.id) {
          setActiveDepartment(updatedDept);
        }
        
        // Update institution department counts
        const [institutionsResponse] = await Promise.all([
          fetch('/api/institutions'),
        ]);
        
        if (institutionsResponse.ok) {
          const institutionsData = await institutionsResponse.json();
          // Create a map of institution ID to department count
          const departmentCountMap: Record<string, number> = {};
          
          // Count departments for each institution
          departmentsData.forEach((dept: Department) => {
            if (dept.institution_id) {
              departmentCountMap[dept.institution_id] = 
                (departmentCountMap[dept.institution_id] || 0) + 1;
            }
          });
          
          // Add department count to each institution
          const institutionsWithDepartmentInfo = institutionsData.map((inst: Institution) => ({
            ...inst,
            departmentCount: departmentCountMap[inst.id] || 0
          }));
          
          setInstitutions(institutionsWithDepartmentInfo);
        }
      }
      
      setEditingDepartment(null);
    } else {
      toast.dismiss(loadingToast);
      toast.error(result.error || 'Failed to update department');
    }
  } catch (error) {
    toast.error('An unexpected error occurred');
    console.error('Error updating department:', error);
  }
}, [activeDepartment.id, editingDepartment, activeInstitution]);

  const handleSaveDepartment = useCallback(async (department: DepartmentFormData): Promise<void> => {
    if (editingDepartment) {
      await handleUpdateDepartment(department);
    } else {
      handleAddDepartment(department);
    }
  }, [editingDepartment, handleAddDepartment, handleUpdateDepartment]);

  const handleEditDepartment = useCallback((department: Department): void => {
    setEditingDepartment(department);
    setIsDepartmentDialogOpen(true);
  }, []);

  const confirmDeleteDepartment = useCallback(async (): Promise<void> => {
    if (!departmentToDelete) return;

    try {
      const loadingToast = toast.loading('Deleting department...');
      
      const response = await fetch(`/api/departments/${departmentToDelete.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success(result.message || 'Department deleted successfully');
        
        // Refresh departments list for the current institution
        const refreshResponse = await fetch('/api/departments');
        const departmentsData = await refreshResponse.json();
        
        if (refreshResponse.ok && activeInstitution) {
          // Filter departments by institution
          const institutionDepartments = departmentsData
            .filter((dept: Department) => dept.institution_id === activeInstitution.id)
            .map((dept: Department) => ({
              ...dept,
              logo: GalleryVerticalEnd,
            }));
        
        // Ensure we always have "All Departments" as the first option
        const allDept = institutionDepartments.find((d: Department) => 
          (d.code || '').toUpperCase() === "ALL"
        );
        
        const finalDepartments = allDept 
          ? [allDept, ...institutionDepartments.filter((d: Department) => 
              (d.code || '').toUpperCase() !== "ALL"
            )]
          : [
              {
                id: "all",
                name: "All Departments",
                code: "ALL",
                description: `View all departments in ${activeInstitution.name}`,
                logo: GalleryVerticalEnd,
              },
              ...institutionDepartments
            ];
        
        setDepartments(finalDepartments);
        
        // If the deleted department was active, switch to "All Departments"
        if (activeDepartment.id === departmentToDelete.id) {
          const allDept = finalDepartments.find((dept: Department) => 
            (dept.code || '').toUpperCase() === "ALL"
          );
          if (allDept) {
            setActiveDepartment(allDept);
          } else {
            setActiveDepartment(finalDepartments[0]);
          }
        }
        
        // Update institution department counts
        const [institutionsResponse] = await Promise.all([
          fetch('/api/institutions'),
        ]);
        
        if (institutionsResponse.ok) {
          const institutionsData = await institutionsResponse.json();
          // Create a map of institution ID to department count
          const departmentCountMap: Record<string, number> = {};
          
          // Count departments for each institution
          departmentsData.forEach((dept: Department) => {
            if (dept.institution_id) {
              departmentCountMap[dept.institution_id] = 
                (departmentCountMap[dept.institution_id] || 0) + 1;
            }
          });
          
          // Add department count to each institution
          const institutionsWithDepartmentInfo = institutionsData.map((inst: Institution) => ({
            ...inst,
            departmentCount: departmentCountMap[inst.id] || 0
          }));
          
          setInstitutions(institutionsWithDepartmentInfo);
        }
      }
    } else {
      toast.dismiss(loadingToast);
      toast.error(result.error || 'Failed to delete department');
    }
  } catch (error) {
    toast.error('An unexpected error occurred');
    console.error('Error deleting department:', error);
  } finally {
    setShowDeleteDialog(false);
    setDepartmentToDelete(null);
    // Clear editing department state to ensure form is reset
    setEditingDepartment(null);
  }
}, [activeDepartment.id, departmentToDelete, activeInstitution]);

  // Institution management functions
  const handleAddInstitution = useCallback(async (institution: { name: string; description: string }): Promise<void> => {
    try {
      const loadingToast = toast.loading('Adding institution...');
      
      const response = await fetch('/api/institutions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(institution),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success('Institution added successfully');
        
        // Refresh institutions list with department counts
        const [institutionsResponse, departmentsResponse] = await Promise.all([
          fetch('/api/institutions'),
          fetch('/api/departments')
        ]);
        
        if (institutionsResponse.ok && departmentsResponse.ok) {
          const institutionsData = await institutionsResponse.json();
          const departmentsData = await departmentsResponse.json();
          
          // Create a map of institution ID to department count
          const departmentCountMap: Record<string, number> = {};
          
          // Count departments for each institution
          departmentsData.forEach((dept: Department) => {
            if (dept.institution_id) {
              departmentCountMap[dept.institution_id] = 
                (departmentCountMap[dept.institution_id] || 0) + 1;
            }
          });
          
          // Add department count to each institution
          const institutionsWithDepartmentInfo = institutionsData.map((inst: Institution) => ({
            ...inst,
            departmentCount: departmentCountMap[inst.id] || 0
          }));
          
          setInstitutions(institutionsWithDepartmentInfo);
        }
      } else {
        toast.dismiss(loadingToast);
        toast.error(result.error || 'Failed to add institution');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Error adding institution:', error);
    }
  }, []);

  const handleUpdateInstitution = useCallback(async (institution: { name: string; description: string }): Promise<void> => {
    if (!editingInstitution) return;

    try {
      const loadingToast = toast.loading('Updating institution...');
      
      const response = await fetch(`/api/institutions/${editingInstitution.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(institution),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success('Institution updated successfully');
        
        // Refresh institutions list with department counts
        const [institutionsResponse, departmentsResponse] = await Promise.all([
          fetch('/api/institutions'),
          fetch('/api/departments')
        ]);
        
        if (institutionsResponse.ok && departmentsResponse.ok) {
          const institutionsData = await institutionsResponse.json();
          const departmentsData = await departmentsResponse.json();
          
          // Create a map of institution ID to department count
          const departmentCountMap: Record<string, number> = {};
          
          // Count departments for each institution
          departmentsData.forEach((dept: Department) => {
            if (dept.institution_id) {
              departmentCountMap[dept.institution_id] = 
                (departmentCountMap[dept.institution_id] || 0) + 1;
            }
          });
          
          // Add department count to each institution
          const institutionsWithDepartmentInfo = institutionsData.map((inst: Institution) => ({
            ...inst,
            departmentCount: departmentCountMap[inst.id] || 0
          }));
          
          setInstitutions(institutionsWithDepartmentInfo);
          
          // Update active institution if it was the one being edited
          if (activeInstitution?.id === editingInstitution.id) {
            const updatedInstitution = institutionsWithDepartmentInfo.find((inst: Institution) => inst.id === editingInstitution.id);
            if (updatedInstitution) {
              setActiveInstitution(updatedInstitution);
            }
          }
        }
      } else {
        toast.dismiss(loadingToast);
        toast.error(result.error || 'Failed to update institution');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Error updating institution:', error);
    } finally {
      setEditingInstitution(null);
    }
  }, [activeInstitution, editingInstitution]);

  const handleSaveInstitution = useCallback(async (institution: { name: string; description: string }): Promise<void> => {
    if (editingInstitution) {
      await handleUpdateInstitution(institution);
    } else {
      handleAddInstitution(institution);
    }
  }, [editingInstitution, handleAddInstitution, handleUpdateInstitution]);

  const handleEditInstitution = useCallback((institution: InstitutionWithDepartmentInfo): void => {
    setEditingInstitution({
      id: institution.id,
      name: institution.name,
      description: institution.description
    } as InstitutionWithDepartmentInfo);
    setIsEditInstitutionDialogOpen(true);
  }, []);

  const confirmDeleteInstitution = useCallback(async (): Promise<void> => {
    if (!institutionToDelete) return;

    let loadingToast: string | undefined;
    
    try {
      loadingToast = toast.loading('Deleting institution...');
      
      const response = await fetch(`/api/institutions/${institutionToDelete.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success(result.message || 'Institution deleted successfully');
      
        // Refresh institutions list
        const refreshResponse = await fetch('/api/institutions');
        const institutionsData = await refreshResponse.json();
      
        if (refreshResponse.ok) {
          // Also refresh departments to get updated counts
          const departmentsResponse = await fetch('/api/departments');
          const departmentsData = await departmentsResponse.json();
          
          if (departmentsResponse.ok) {
            // Create a map of institution ID to department count
            const departmentCountMap: Record<string, number> = {};
            
            // Count departments for each institution
            departmentsData.forEach((dept: Department) => {
              if (dept.institution_id) {
                departmentCountMap[dept.institution_id] = 
                  (departmentCountMap[dept.institution_id] || 0) + 1;
              }
            });
            
            // Add department count to each institution
            const institutionsWithDepartmentInfo = institutionsData.map((inst: Institution) => ({
              ...inst,
              departmentCount: departmentCountMap[inst.id] || 0
            }));
            
            setInstitutions(institutionsWithDepartmentInfo);
            
            // If the deleted institution was active, switch to first institution or null
            if (activeInstitution?.id === institutionToDelete.id) {
              setActiveInstitution(institutionsWithDepartmentInfo[0] || null);
              // Also reset departments since institution changed
              setDepartments([
                {
                  id: "all",
                  name: "All Departments",
                  code: "ALL",
                  description: institutionsWithDepartmentInfo[0] 
                    ? `View all departments in ${institutionsWithDepartmentInfo[0].name}` 
                    : "View all departments",
                  logo: GalleryVerticalEnd,
                }
              ]);
              setActiveDepartment({
                id: "all",
                name: "All Departments",
                code: "ALL",
                description: institutionsWithDepartmentInfo[0] 
                  ? `View all departments in ${institutionsWithDepartmentInfo[0].name}` 
                  : "View all departments",
                logo: GalleryVerticalEnd,
              });
            }
          }
        }
      } else {
        if (loadingToast) toast.dismiss(loadingToast);
        toast.error(result.error || 'Failed to delete institution');
        console.error('Failed to delete institution:', result.error || 'Unknown error');
      }
    } catch (error) {
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error('An unexpected error occurred while deleting the institution');
      console.error('Error deleting institution:', error);
    } finally {
      setShowDeleteInstitutionDialog(false);
      setInstitutionToDelete(null);
      // Clear editing institution state to ensure form is reset
      setEditingInstitution(null);
    }
  }, [activeInstitution, institutionToDelete]);

  // Memoize navigation items to prevent unnecessary re-renders
  const navItems = useMemo(() => {
    return userRole ? NAV_ITEMS[userRole] || [] : [];
  }, [userRole]);
  
  const recentItems = useMemo(() => {
    return userRole ? RECENT_ITEMS[userRole] || [] : [];
  }, [userRole]);

  return (
    <SidebarProvider>
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
          scrollbar-width: thin;
          scrollbar-color: #9ca3af #374151;
        }
      `}</style>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                onClick={() => {
                  // Only allow admins to change institution/department
                  if (userRole === 'admin') {
                    setIsInstitutionDialogOpen(true);
                  }
                }}
                disabled={userRole !== 'admin'}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <activeDepartment.logo className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeInstitution?.name || "Select Institution"}
                  </span>
                  <span className="truncate text-xs">
                    {departments.length === 0
                      ? "No departments available"
                      : activeDepartment.id === "all"
                      ? "View all Departments"
                      : activeDepartment.name}
                  </span>
                </div>
                {userRole === 'admin' && <ChevronsUpDown className="ml-auto" />}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          {/* Custom sel*/}
          <Dialog open={isInstitutionDialogOpen} onOpenChange={setIsInstitutionDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Select Institution</DialogTitle>
                <DialogDescription>
                  Choose an institution to view its departments
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2 max-h-60 overflow-y-auto">
                {loadingInstitutions ? (
                  // Show skeleton loaders while loading institutions
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-md">
                      <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 w-32 rounded bg-muted animate-pulse mb-1" />
                        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : institutions.length === 0 ? (
                  // Show message when no institutions are available
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-muted-foreground mb-2">
                      <Building className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="font-medium mb-1">No institutions found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      No institutions have been created yet.
                    </p>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        setIsInstitutionDialogOpen(false);
                        setEditingInstitution(null);
                        setIsEditInstitutionDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Institution
                    </Button>
                  </div>
                ) : (
                  // Show actual institutions when loaded
                  institutions.map((institution) => (
                    <div 
                      key={institution.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group relative pr-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveInstitution(institution);
                        localStorage.setItem('activeInstitutionId', institution.id);
                        // Dispatch custom event to notify other components
                        window.dispatchEvent(new CustomEvent('institutionChanged', { 
                          detail: { institutionId: institution.id } 
                        }));
                        setIsInstitutionDialogOpen(false);
                        setTimeout(() => setIsDepartmentsListDialogOpen(true), 100);
                      }}
                    >
                      <GalleryVerticalEnd className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{institution.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {!institution.departmentCount || institution.departmentCount === 0 
                            ? "No departments" 
                            : `${institution.departmentCount} department${institution.departmentCount > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      {activeInstitution?.id === institution.id && (
                        <BadgeCheck className="h-4 w-4 text-green-500" />
                      )}
                      {/* Add dropdown menu for institutions */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit institution
                                handleEditInstitution(institution);
                                setIsInstitutionDialogOpen(false);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle delete institution
                                setInstitutionToDelete(institution);
                                setIsInstitutionDialogOpen(false);
                                setShowDeleteInstitutionDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" className="w-full" onClick={() => {
                  setIsInstitutionDialogOpen(false);
                  setEditingInstitution(null);
                  setIsEditInstitutionDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Institution
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Departments List Dialog */}
          <Dialog open={isDepartmentsListDialogOpen} onOpenChange={setIsDepartmentsListDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Departments</DialogTitle>
                <DialogDescription>
                  Departments in {activeInstitution?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1">
                {loadingDepartments ? (
                  // Show skeleton loaders while loading
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-md">
                      <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                      <div className="flex-1">
                        <div className="h-4 w-24 rounded bg-muted animate-pulse mb-1" />
                        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : departments.length === 0 ? (
                  // Show message when no departments are available
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-muted-foreground mb-2">
                      <Folder className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="font-medium mb-1">No departments found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {activeInstitution 
                        ? `No departments have been created for ${activeInstitution.name} yet.` 
                        : "No departments available."}
                    </p>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => {
                        setIsDepartmentsListDialogOpen(false);
                        setEditingDepartment(null);
                        setIsDepartmentDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Department
                    </Button>
                  </div>
                ) : (
                  // Show actual departments when loaded
                  departments.map((department) => (
                    <div 
                      key={department.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer group relative pr-10"
                      onClick={() => {
                        setActiveDepartment(department);
                        // Store selected department ID in localStorage
                        localStorage.setItem('activeDepartmentId', department.id);
                        // Dispatch custom event to notify other components
                        window.dispatchEvent(new CustomEvent('departmentChanged', {
                          detail: { departmentId: department.id }
                        }));
                        setIsDepartmentsListDialogOpen(false);
                      }}
                    >
                      <department.logo className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0"> {/* Added min-w-0 to allow truncation */}
                        <p className="font-medium truncate max-w-[200px]">{department.name}</p>
                        {department.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[250px] ml-1">
                            {department.description}
                          </p>
                        )}
                      </div>
                      {activeDepartment.id === department.id && (
                        <BadgeCheck className="h-4 w-4 text-green-500" />
                      )}
                      {/* Add dropdown menu for departments */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit department
                                handleEditDepartment(department);
                                setIsDepartmentsListDialogOpen(false);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-500 focus:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle delete department
                                setDepartmentToDelete(department);
                                setIsDepartmentsListDialogOpen(false);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Only show the footer with "Add Department" button when there are departments */}
              {departments.length > 0 && (
                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="w-full" onClick={() => {
                    setIsDepartmentsListDialogOpen(false);
                    // Clear editing department and open dialog for new department
                    setEditingDepartment(null);
                    setIsDepartmentDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Department Dialog for adding/editing departments */}
          <DepartmentDialog
            isOpen={isDepartmentDialogOpen}
            onOpenChange={setIsDepartmentDialogOpen}
            onSaveDepartment={handleSaveDepartment}
            institutionId={activeInstitution?.id}
            {...(editingDepartment && { editDepartment: editingDepartment })}
          />
          
          {/* Institution Dialog for adding/editing institutions */}
          <InstitutionDialog
            isOpen={isEditInstitutionDialogOpen}
            onOpenChange={setIsEditInstitutionDialogOpen}
            onSaveInstitution={handleSaveInstitution}
            {...(editingInstitution && { editInstitution: editingInstitution })}
          />
          
          {/* Warning Dialog for Institution Deletion */}
          <WarningDialog
            open={showDeleteInstitutionDialog}
            onOpenChange={setShowDeleteInstitutionDialog}
            title="Delete Institution"
            description={`Are you sure you want to delete ${institutionToDelete?.name} institution? This action cannot be undone and will also delete all associated departments.`}
            confirmText="Delete"
            cancelText="Cancel"
            variant="destructive"
            onConfirm={confirmDeleteInstitution}
            onCancel={() => {
              setShowDeleteInstitutionDialog(false);
              setInstitutionToDelete(null);
            }}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarContentMemo 
            navItems={navItems}
            recentItems={recentItems}
            pathname={pathname}
            openSection={openSection}
            setOpenSection={setOpenSection}
            isPathInSection={isPathInSection}
          />
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg uppercase">
                      <AvatarImage
                        src={userData?.user_metadata?.avatar_url || ""}
                        alt={userData?.first_name || "User"}
                      />
                      <AvatarFallback className="rounded-lg">
                        {userData?.first_name?.charAt(0) || "U"}
                        {userData?.last_name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold capitalize">
                        {userData?.first_name} {userData?.last_name}
                      </span>
                      <span className="truncate text-xs">
                        {userData?.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg uppercase">
                        <AvatarImage
                          src={userData?.user_metadata?.avatar_url || ""}
                          alt={userData?.first_name || "User"}
                        />
                        <AvatarFallback className="rounded-lg">
                          {userData?.first_name?.charAt(0) || "U"}
                          {userData?.last_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold capitalize">
                          {userData?.first_name} {userData?.last_name}
                        </span>
                        <span className="truncate text-xs">
                          {userData?.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <User />
                      Profile
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => {
                    await signOut();
                  }}>
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((breadcrumb: Breadcrumb, index: number) => (
                  <React.Fragment key={breadcrumb.url}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.15,
                        ease: "easeOut",
                      }}
                    >
                      <BreadcrumbItem>
                        {breadcrumb.isLast ? (
                          <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
                        ) : (
                          <span className="text-muted-foreground">
                            {breadcrumb.title}
                          </span>
                        )}
                      </BreadcrumbItem>
                    </motion.div>
                    {!breadcrumb.isLast && index < breadcrumbs.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.15 + 0.1,
                          ease: "easeOut",
                        }}
                      >
                        <BreadcrumbSeparator className="hidden md:block mt-1" />
                      </motion.div>
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4">
            <ThemeTogglerButton
              variant="ghost"
              size="xs"
              modes={["light", "dark"]}
            />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
      
      {/* Warning Dialog for Department Deletion */}
      <WarningDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Department"
        description={`Are you sure you want to delete ${departmentToDelete?.name} department? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteDepartment}
        onCancel={() => {
          setShowDeleteDialog(false);
          setDepartmentToDelete(null);
        }}
      />
    </SidebarProvider>
  );
}
