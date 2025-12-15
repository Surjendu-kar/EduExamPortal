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
} from "recharts";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  Award,
  AlertCircle,
} from "lucide-react";

interface PerformanceData {
  overview: {
    averageScore: number;
    passRate: number;
    completionRate: number;
    averageTimeTaken: number;
  };
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  examDifficulty: Array<{
    examTitle: string;
    averageScore: string;
    completionRate: string;
    totalAttempts: number;
  }>;
  departmentPerformance: Array<{
    name: string;
    averageScore: number;
    totalAttempts: number;
  }>;
  questionTypePerformance: Array<{
    type: string;
    percentage: number;
    count: number;
  }>;
  gradingStatus: {
    pending: number;
    partial: number;
    completed: number;
  };
  topPerformers: Array<{
    name: string;
    email: string;
    averageScore: number;
    examsTaken: number;
  }>;
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

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
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
          `/api/admin/analytics/performance?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch performance data");
        }

        const performanceData = await response.json();
        setData(performanceData);
      } catch (err) {
        console.error("Error fetching performance data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load performance data"
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
              No performance data available at this time.
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  const totalGrading =
    data.gradingStatus.pending +
    data.gradingStatus.partial +
    data.gradingStatus.completed;
  const gradingProgress =
    totalGrading > 0
      ? ((data.gradingStatus.completed / totalGrading) * 100).toFixed(1)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Average Score"
          value={`${data.overview.averageScore}%`}
          description="Overall student performance"
          icon={TrendingUp}
          color="text-blue-600"
        />
        <MetricCard
          title="Pass Rate"
          value={`${data.overview.passRate}%`}
          description="Students scoring ≥50%"
          icon={Target}
          color="text-green-600"
        />
        <MetricCard
          title="Completion Rate"
          value={`${data.overview.completionRate}%`}
          description="Exams completed"
          icon={CheckCircle2}
          color="text-purple-600"
        />
        <MetricCard
          title="Avg. Time Taken"
          value={`${data.overview.averageTimeTaken} min`}
          description="Per exam attempt"
          icon={Clock}
          color="text-orange-600"
        />
      </div>

      {/* Score Distribution & Question Type Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <CardDescription>
                Student performance across score ranges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.scoreDistribution.some((item) => item.count > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
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
                      dataKey="count"
                      fill={COLORS.primary}
                      radius={[4, 4, 0, 0]}
                      name="Students"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No score data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Question Type Performance</CardTitle>
              <CardDescription>
                Average scores by question type
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.questionTypePerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.questionTypePerformance}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      label={(props: any) => {
                        const { payload } = props;
                        return `${payload.type}: ${payload.percentage}%`;
                      }}
                      outerRadius={95}
                      dataKey="percentage"
                    >
                      {data.questionTypePerformance.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => {
                        const item = data.questionTypePerformance.find(
                          (d) => d.type === entry.payload.type
                        );
                        return `${value} (${item?.count || 0} questions)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No question type data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Department Performance & Grading Status */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>
                Average scores and attempts by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.departmentPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart
                    data={data.departmentPerformance}
                    margin={{ top: 10, right: 10, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
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
                      dataKey="averageScore"
                      fill={COLORS.success}
                      radius={[4, 4, 0, 0]}
                      name="Average Score (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No department data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Grading Status</CardTitle>
              <CardDescription>
                Current status of exam grading across the institution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold">
                        {data.gradingStatus.pending}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Partial</p>
                      <p className="text-2xl font-bold">
                        {data.gradingStatus.partial}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold">
                        {data.gradingStatus.completed}
                      </p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Grading Progress
                    </span>
                    <span className="font-semibold">{gradingProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${gradingProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {data.gradingStatus.completed} of {totalGrading} submissions
                    graded
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Exam Difficulty & Top Performers */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Exam Difficulty Analysis</CardTitle>
              <CardDescription>
                Exams sorted by average score (easiest to hardest)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.examDifficulty.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                        <TableRow>
                          <TableHead>Exam Title</TableHead>
                          <TableHead className="text-right">Avg Score</TableHead>
                          <TableHead className="text-right">
                            Completion
                          </TableHead>
                          <TableHead className="text-right">Attempts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.examDifficulty.map((exam, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {exam.examTitle}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-semibold ${
                                  parseFloat(exam.averageScore) >= 70
                                    ? "text-green-600"
                                    : parseFloat(exam.averageScore) >= 50
                                    ? "text-orange-600"
                                    : "text-red-600"
                                }`}
                              >
                                {exam.averageScore}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {exam.completionRate}%
                            </TableCell>
                            <TableCell className="text-right">
                              {exam.totalAttempts}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No exam data available
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Top Performing Students
              </CardTitle>
              <CardDescription>
                Students with highest average scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topPerformers.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <div className="max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10">
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-right">
                            Avg Score
                          </TableHead>
                          <TableHead className="text-right">Exams</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topPerformers.map((student, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  index === 0
                                    ? "bg-yellow-500 text-white"
                                    : index === 1
                                    ? "bg-gray-400 text-white"
                                    : index === 2
                                    ? "bg-orange-600 text-white"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {student.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600">
                                {student.averageScore}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {student.examsTaken}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No student data available
                </div>
              )}
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
