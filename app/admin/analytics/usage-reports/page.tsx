"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
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
  BarChart,
  Bar,
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
  Activity,
  FileText,
  AlertTriangle,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface UsageReportsData {
  activityMetrics: {
    totalExamAttempts: number;
    activeSessionsToday: number;
    submissionsThisWeek: number;
    averageViolations: number;
  };
  dailyActivity: Array<{
    date: string;
    attempts: number;
  }>;
  peakUsageHours: Array<{
    hour: string;
    attempts: number;
  }>;
  teacherActivity: Array<{
    name: string;
    email: string;
    examsCreated: number;
    studentsInvited: number;
    lastActive: string;
  }>;
  proctoringViolations: Array<{
    type: string;
    count: number;
  }>;
  examTerminations: number;
  invitationStats: {
    pending: number;
    accepted: number;
    expired: number;
    total: number;
    acceptanceRate: number;
  };
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

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  color = "text-muted-foreground",
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function UsageReportsPage() {
  const [data, setData] = useState<UsageReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const institutionId = localStorage.getItem("activeInstitutionId");
        if (!institutionId) {
          setError("No institution selected");
          setLoading(false);
          return;
        }

        // Get department ID from localStorage for filtering
        const departmentId = localStorage.getItem("activeDepartmentId");

        // Build query params
        const params = new URLSearchParams();
        params.append("institution_id", institutionId);

        // Always send department_id (backend will handle "all" case)
        if (departmentId) {
          params.append("department_id", departmentId);
        }

        const response = await fetch(
          `/api/admin/analytics/usage-reports?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch usage reports");
        }

        const reportsData = await response.json();
        console.log("=== Usage Reports Page Debug ===");
        console.log("Institution ID:", institutionId);
        console.log("Department ID:", departmentId);
        console.log("API Response:", reportsData);
        console.log("Activity Metrics:", reportsData.activityMetrics);
        console.log("Daily Activity:", reportsData.dailyActivity);
        console.log("Teacher Activity:", reportsData.teacherActivity);
        console.log("================================");
        setData(reportsData);
      } catch (err) {
        console.error("Error fetching usage reports:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load usage reports"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen ONLY for department changes
    // Institution changes always trigger department changes, so we don't need both
    const handleDepartmentChange = () => {
      fetchData();
    };

    window.addEventListener("departmentChanged", handleDepartmentChange);

    return () => {
      window.removeEventListener("departmentChanged", handleDepartmentChange);
    };
  }, []);

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
              No usage reports available at this time.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Activity Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Exam Attempts"
          value={data.activityMetrics.totalExamAttempts.toLocaleString()}
          description="All-time exam sessions"
          icon={FileText}
          color="text-blue-600"
        />
        <MetricCard
          title="Active Sessions Today"
          value={data.activityMetrics.activeSessionsToday}
          description="Exams in progress"
          icon={Activity}
          color="text-green-600"
        />
        <MetricCard
          title="Submissions This Week"
          value={data.activityMetrics.submissionsThisWeek}
          description="Recent submissions"
          icon={CheckCircle}
          color="text-purple-600"
        />
        <MetricCard
          title="Avg. Violations"
          value={data.activityMetrics.averageViolations}
          description="Per exam session"
          icon={AlertTriangle}
          color="text-orange-600"
        />
      </div>

      {/* Daily Activity & Peak Usage Hours */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity</CardTitle>
              <CardDescription>
                Exam attempts over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: "600",
                      }}
                      itemStyle={{
                        color: "hsl(var(--foreground))",
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString();
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="attempts"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Exam Attempts"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No activity data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Peak Usage Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Peak Usage Hours</CardTitle>
              <CardDescription>
                Exam activity by hour of day
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.peakUsageHours.some((h) => h.attempts > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.peakUsageHours}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: "600",
                      }}
                      itemStyle={{
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="attempts"
                      fill={COLORS.success}
                      radius={[4, 4, 0, 0]}
                      name="Attempts"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No usage data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Teacher Activity & Proctoring Violations */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Teacher Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Teacher Activity</CardTitle>
              <CardDescription>
                Most active teachers by exams created
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.teacherActivity.length > 0 ? (
                <div className="h-[200px] rounded-md border overflow-hidden">
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                        <TableRow>
                          <TableHead>Teacher</TableHead>
                          <TableHead className="text-right">Exams</TableHead>
                          <TableHead className="text-right">Students</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.teacherActivity.map((teacher, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{teacher.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {teacher.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-blue-600">
                                {teacher.examsCreated}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600">
                                {teacher.studentsInvited}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No teacher activity data
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Proctoring Violations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Proctoring Violations</CardTitle>
              <CardDescription>
                Violation types and frequency
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.proctoringViolations.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={data.proctoringViolations}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={(props: PieLabelRenderProps) => {
                        const payload = props.payload as { type: string; count: number };
                        return payload.count > 0 ? `${payload.type}: ${payload.count}` : null;
                      }}
                      outerRadius={95}
                      dataKey="count"
                    >
                      {data.proctoringViolations.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry) => {
                        const payload = entry.payload as unknown as { type: string };
                        const item = data.proctoringViolations.find(
                          (d) => d.type === payload?.type
                        );
                        return `${value}: ${item?.count || 0}`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No violation data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Exam Terminations & Invitation Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Exam Terminations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Exam Terminations</CardTitle>
              <CardDescription>
                Sessions terminated due to violations
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px]">
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                    <XCircle className="h-10 w-10 text-red-600" />
                  </div>
                  <div className="text-4xl font-bold mb-2">
                    {data.examTerminations}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Terminated exam sessions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invitation Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Invitation Statistics</CardTitle>
              <CardDescription>
                Student invitation status breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[200px]">
              <div className="h-full flex flex-col justify-center space-y-4">
                <div className="grid gap-3 grid-cols-3">
                  <div className="text-center p-3 border rounded-lg">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                    <div className="text-lg font-bold">
                      {data.invitationStats.pending}
                    </div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
                    <div className="text-lg font-bold">
                      {data.invitationStats.accepted}
                    </div>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" />
                    <div className="text-lg font-bold">
                      {data.invitationStats.expired}
                    </div>
                    <p className="text-xs text-muted-foreground">Expired</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Acceptance Rate
                    </span>
                    <span className="font-semibold">
                      {data.invitationStats.acceptanceRate}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${data.invitationStats.acceptanceRate}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.invitationStats.accepted} of{" "}
                    {data.invitationStats.total} invitations accepted
                  </p>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Total Invitations
                      </span>
                    </div>
                    <span className="text-lg font-bold">
                      {data.invitationStats.total}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
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

      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
