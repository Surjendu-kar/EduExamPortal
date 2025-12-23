"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps,
} from "recharts";
import {
  Users,
  GraduationCap,
  FileText,
  Activity,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlatformStatsData {
  overview: {
    studentCount: number;
    teacherCount: number;
    examCount: number;
    activeExamCount: number;
  };
  userGrowth: Array<{
    month: string; // Can be YYYY-MM or YYYY-MM-DD depending on granularity
    students: number;
    teachers: number;
  }>;
  examsByDepartment: Array<{
    name: string;
    count: number;
  }>;
  examStatusDistribution: Array<{
    status: string;
    count: number;
  }>;
  departmentOverview: Array<{
    id: string;
    name: string;
    studentCount: number;
    teacherCount: number;
    examCount: number;
  }>;
  granularity?: "daily" | "monthly"; // API returns this to indicate data format
}

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.purple,
];

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
          <div className="text-2xl font-bold py-2">
            {value.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PlatformStatsPage() {
  const [data, setData] = useState<PlatformStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(
    null
  );
  const [timeRange, setTimeRange] = useState<string>("12");

  const fetchPlatformStats = async (institutionId: string, range: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get department ID from localStorage for filtering
      const departmentId = localStorage.getItem("activeDepartmentId");

      // Build query params
      const params = new URLSearchParams();
      params.append("institution_id", institutionId);
      params.append("time_range", range);

      // Add department filter if selected and not "all"
      if (departmentId && departmentId !== "all") {
        params.append("department_id", departmentId);
      }

      const response = await fetch(
        `/api/admin/analytics/platform-stats?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch platform statistics");
      }

      const statsData = await response.json();
      setData(statsData);
    } catch (err) {
      console.error("Error fetching platform stats:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load platform statistics"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial institution ID
    const institutionId = localStorage.getItem("activeInstitutionId");
    if (institutionId) {
      setActiveInstitutionId(institutionId);
      fetchPlatformStats(institutionId, timeRange);
    } else {
      setError("No institution selected. Please select an institution.");
      setLoading(false);
    }

    // Listen ONLY for department changes
    // Institution changes always trigger department changes, so we don't need both
    const handleDepartmentChange = () => {
      const newInstitutionId = localStorage.getItem("activeInstitutionId");
      if (newInstitutionId) {
        setActiveInstitutionId(newInstitutionId);
        fetchPlatformStats(newInstitutionId, timeRange);
      }
    };

    window.addEventListener("departmentChanged", handleDepartmentChange);

    return () => {
      window.removeEventListener("departmentChanged", handleDepartmentChange);
    };
  }, []);

  // Refetch data when time range changes
  useEffect(() => {
    if (activeInstitutionId) {
      fetchPlatformStats(activeInstitutionId, timeRange);
    }
  }, [timeRange]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  if (!data) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              No platform statistics available at this time.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  // No need for client-side filtering - API handles it now
  const userGrowthData = data.userGrowth;
  const isDaily = data.granularity === "daily";

  // Get dynamic description based on time range
  const getTimeRangeDescription = () => {
    switch (timeRange) {
      case "7":
        return "Daily registrations (Last 7 days)";
      case "30":
        return "Daily registrations (Last 30 days)";
      case "3":
        return "Monthly registration trends (Last 3 months)";
      case "6":
        return "Monthly registration trends (Last 6 months)";
      case "12":
        return "Monthly registration trends (Last 12 months)";
      case "all":
        return "All-time registration trends";
      default:
        return "Registration trends";
    }
  };

  // Format X-axis labels based on granularity
  const formatXAxisLabel = (value: string) => {
    if (isDaily) {
      // Format: "2025-12-03" -> "Dec 3"
      const date = new Date(value);
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    } else {
      // Format: "2025-12" -> "Dec '25"
      const [year, month] = value.split("-");
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
    }
  };

  // Format tooltip label
  const formatTooltipLabel = (value: string) => {
    if (isDaily) {
      // Format: "2025-12-03" -> "December 3, 2025"
      const date = new Date(value);
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `📅 ${
        monthNames[date.getMonth()]
      } ${date.getDate()}, ${date.getFullYear()}`;
    } else {
      // Format: "2025-12" -> "December 2025"
      const [year, month] = value.split("-");
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `📅 ${monthNames[parseInt(month) - 1]} ${year}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Overview Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <StatsCard
          title="Total Students"
          value={data.overview.studentCount}
          icon={Users}
          description="Registered students"
        />
        <StatsCard
          title="Total Teachers"
          value={data.overview.teacherCount}
          icon={GraduationCap}
          description="Active teachers"
        />
        <StatsCard
          title="Total Exams"
          value={data.overview.examCount}
          icon={FileText}
          description="Created exams"
        />
        <StatsCard
          title="Active Exams"
          value={data.overview.activeExamCount}
          icon={Activity}
          description="Currently ongoing"
        />
      </motion.div>

      {/* Charts Row - User Growth & Exam Status */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>User Registration Trends</CardTitle>
                  <CardDescription>{getTimeRangeDescription()}</CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="3">Last 3 months</SelectItem>
                    <SelectItem value="6">Last 6 months</SelectItem>
                    <SelectItem value="12">Last 12 months</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {userGrowthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart
                    data={userGrowthData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.3}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ strokeWidth: 2 }}
                      tickFormatter={formatXAxisLabel}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ strokeWidth: 2 }}
                      label={{
                        value: "Users Joined",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 12, fill: "hsl(var(--foreground))" },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "2px solid hsl(var(--border))",
                        borderRadius: "8px",
                        padding: "12px",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: "600",
                        marginBottom: "8px",
                        fontSize: "14px",
                      }}
                      itemStyle={{
                        color: "hsl(var(--foreground))",
                        fontSize: "13px",
                        padding: "4px 0",
                      }}
                      labelFormatter={formatTooltipLabel}
                      formatter={(value: number, name: string) => {
                        const icon = name === "Students" ? "👨‍🎓" : "👨‍🏫";
                        return [`${icon} ${value} joined`, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{
                        paddingTop: "16px",
                      }}
                      iconType="line"
                      formatter={(value) => {
                        return value === "Students"
                          ? "👨‍🎓 Students"
                          : "👨‍🏫 Teachers";
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="students"
                      stroke={COLORS.primary}
                      strokeWidth={3}
                      name="Students"
                      dot={{
                        r: 5,
                        fill: COLORS.primary,
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{
                        r: 8,
                        fill: COLORS.primary,
                        strokeWidth: 3,
                        stroke: "#fff",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="teachers"
                      stroke={COLORS.success}
                      strokeWidth={3}
                      name="Teachers"
                      dot={{
                        r: 5,
                        fill: COLORS.success,
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{
                        r: 8,
                        fill: COLORS.success,
                        strokeWidth: 3,
                        stroke: "#fff",
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No growth data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Exam Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Exam Status Distribution</CardTitle>
                <CardDescription>
                  Upcoming, active, and completed
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {data.examStatusDistribution.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.examStatusDistribution}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={(props: PieLabelRenderProps) => {
                        const payload = props.payload as { status: string; count: number };
                        const percent = props.percent || 0;
                        return payload.count > 0
                          ? `${payload.status}: ${payload.count} (${(
                              percent * 100
                            ).toFixed(0)}%)`
                          : null;
                      }}
                      outerRadius={95}
                      fill={COLORS.primary}
                      dataKey="count"
                    >
                      {data.examStatusDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          fillOpacity={entry.count === 0 ? 0 : 1}
                          stroke={entry.count === 0 ? "transparent" : "#ffffff"}
                          strokeWidth={entry.count === 0 ? 0 : 1}
                        />
                      ))}
                    </Pie>

                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry) => {
                        const payload = entry.payload as unknown as { status: string };
                        const item = data.examStatusDistribution.find(
                          (d) => d.status === payload?.status
                        );
                        return `${value}: ${item?.count || 0}`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No exam data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Overview Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
            <CardDescription>
              Student, teacher, and exam counts by department
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.departmentOverview.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                      <TableRow>
                        <TableHead className="min-w-[200px] border-r">
                          <div className="flex items-center space-x-2">
                            <span>Department</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right min-w-[120px] border-r">
                          <div className="flex items-center justify-end space-x-2">
                            <Users className="h-4 w-4" />
                            <span>Students</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right min-w-[120px] border-r">
                          <div className="flex items-center justify-end space-x-2">
                            <GraduationCap className="h-4 w-4" />
                            <span>Teachers</span>
                          </div>
                        </TableHead>
                        <TableHead className="text-right min-w-[120px]">
                          <div className="flex items-center justify-end space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>Exams</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {data.departmentOverview.map((dept, index) => (
                          <motion.tr
                            key={dept.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{
                              opacity: 0,
                              x: 100,
                              transition: { duration: 0.3 },
                            }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            layout
                            className="border-b transition-all duration-200 hover:bg-muted/30 hover:shadow-sm group"
                          >
                            <TableCell className="font-medium border-r">
                              {dept.name}
                            </TableCell>
                            <TableCell className="text-right border-r">
                              <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                                {dept.studentCount}
                              </span>
                            </TableCell>
                            <TableCell className="text-right border-r">
                              <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 font-semibold">
                                {dept.teacherCount}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold">
                                {dept.examCount}
                              </span>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold mb-2">
                  No departments found
                </h3>
                <p className="text-muted-foreground">
                  No departments available for this institution.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Overview Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="gap-0">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
