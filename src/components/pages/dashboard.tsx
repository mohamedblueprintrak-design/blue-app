"use client";

import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";
import { AlertCircle } from "lucide-react";
import { FolderKanban, Receipt, TrendingUp, CheckSquare } from "lucide-react";
import { useDashboardLayout, WidgetSlot, DashboardLayoutManager } from "@/components/pages/dashboard-layout-manager";
import dynamic from "next/dynamic";

import type { DashboardData, StatCardConfig } from "./dashboard/types";
import { formatCurrency, formatNumber } from "./dashboard/helpers";
import { getActivityFeed } from "./dashboard/activity-data";
import { getTeamPerformance } from "./dashboard/team-data";
import { DashboardSkeleton } from "./dashboard/dashboard-skeleton";
import { WidgetSkeleton } from "@/components/common/page-loading-skeleton";
import { MyTasksWidget } from "./dashboard/my-tasks-widget";
import { WelcomeSection } from "./dashboard/welcome-section";
import { StatCards } from "./dashboard/stat-cards";
import { QuickOverview } from "./dashboard/quick-overview";
import { SystemStatus } from "./dashboard/system-status";
import { RecentProjectsAlerts } from "./dashboard/recent-projects-alerts";
import { GanttTimeline } from "./dashboard/gantt-timeline";
import { DeadlinesTeam } from "./dashboard/deadlines-team";
import { ActivityFeed } from "./dashboard/activity-feed";
import { DeptWorkload } from "./dashboard/dept-workload";

const RevenueDepartment = dynamic(() => import("./dashboard/revenue-department").then(m => m.RevenueDepartment), { ssr: false, loading: () => <WidgetSkeleton /> });
const ChartsSection = dynamic(() => import("./dashboard/charts-section").then(m => m.ChartsSection), { ssr: false, loading: () => <WidgetSkeleton /> });
const ProjectHealthBudget = dynamic(() => import("./dashboard/project-health-budget").then(m => m.ProjectHealthBudget), { ssr: false, loading: () => <WidgetSkeleton /> });

// ===== Main Dashboard Component =====
export default function Dashboard({ language }: { language: "ar" | "en" }) {
  const isAr = language === "ar";
  const { user } = useAuthStore();
  const { setCurrentPage, setCurrentProjectId } = useNavStore();

  const layout = useDashboardLayout();

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <DashboardSkeleton isAr={isAr} />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mb-3" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {isAr ? "خطأ في تحميل البيانات" : "Error loading data"}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isAr ? "تعذر تحميل بيانات لوحة التحكم" : "Failed to load dashboard data"}
        </p>
      </div>
    );
  }

  const { stats, invoices, revenue, activeTasksCount, overdueTasksCount } = data;
  const recentProjects = Array.isArray(data?.recentProjects) ? data.recentProjects : [];
  const upcomingTasks = Array.isArray(data?.upcomingTasks) ? data.upcomingTasks : [];
  const departmentProgress = Array.isArray(data?.departmentProgress) ? data.departmentProgress : [];
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  // Use API data for activity feed and team performance (with mock fallback)
  const activities = getActivityFeed(data, isAr);
  const teamPerformance = getTeamPerformance(departmentProgress, isAr);

  // Project status pie chart data (derived from real API stats)
  const projectStatusData = [
    { name: isAr ? "نشط" : "Active", value: stats.activeProjects, color: "#0d9488" },
    { name: isAr ? "مكتمل" : "Completed", value: stats.completedProjects, color: "#10b981" },
    { name: isAr ? "متأخر" : "Delayed", value: stats.delayedProjects, color: "#ef4444" },
    { name: isAr ? "معلق" : "On Hold", value: stats.totalProjects - stats.activeProjects - stats.completedProjects - stats.delayedProjects, color: "#f59e0b" },
  ];

  // Task trend data from API
  const taskTrendData = (data?.taskTrend && data.taskTrend.length > 0)
    ? data.taskTrend.map(t => ({ month: isAr ? t.labelAr : t.labelEn, created: t.created, COMPLETED: t.completed }))
    : [];

  // Budget overview data from API
  const budgetOverviewData = (data?.budgetOverview && data.budgetOverview.length > 0)
    ? data.budgetOverview.map(p => ({ name: isAr ? p.name : (p.nameEn || p.name), budget: Number(p.budget) }))
    : [];

  const handleProjectClick = (projectId: string) => {
    setCurrentProjectId(projectId);
    setCurrentPage("projects");
  };

  // Stat cards config
  const statCards: StatCardConfig[] = [
    {
      label: isAr ? "إجمالي المشاريع" : "Total Projects",
      value: formatNumber(stats.totalProjects, language),
      icon: FolderKanban,
      gradientFrom: "from-teal-500",
      gradientTo: "to-teal-600",
      borderAccent: "border-s-teal-500",
      bgColor: "bg-teal-100 dark:bg-teal-950/30",
      iconColor: "text-teal-600 dark:text-teal-400",
      trend: { value: stats.activeProjects, label: isAr ? "نشط" : "ACTIVE", isPositive: true },
      secondaryBadge: stats.delayedProjects > 0 ? { value: stats.delayedProjects, label: isAr ? "متأخر" : "DELAYED", type: "danger" as const } : null,
    },
    {
      label: isAr ? "الفواتير المستحقة" : "Outstanding Invoices",
      value: formatCurrency(invoices.outstandingTotal, language),
      valueSuffix: "AED",
      icon: Receipt,
      gradientFrom: "from-amber-500",
      gradientTo: "to-amber-600",
      borderAccent: "border-s-amber-500",
      bgColor: "bg-amber-100 dark:bg-amber-950/30",
      iconColor: "text-amber-600 dark:text-amber-400",
      trend: invoices.overdueCount > 0 ? { value: invoices.overdueCount, label: isAr ? "متأخر" : "OVERDUE", isPositive: false } : null,
      secondaryBadge: null,
      valueSub: `(${invoices.outstandingCount})`,
    },
    {
      label: isAr ? "إيرادات هذا الشهر" : "This Month Revenue",
      value: formatCurrency(revenue.thisMonth, language),
      valueSuffix: "AED",
      icon: TrendingUp,
      gradientFrom: "from-emerald-500",
      gradientTo: "to-emerald-600",
      borderAccent: "border-s-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      trend: revenue.change !== 0 ? { value: Math.abs(revenue.change), label: "%", isPositive: revenue.change > 0, showArrow: true } : null,
      secondaryBadge: null,
      valueSub: revenue.change !== 0 ? (isAr ? "مقارنة بالشهر الماضي" : "vs last month") : undefined,
    },
    {
      label: isAr ? "المهام القادمة (7 أيام)" : "Upcoming Tasks (7 days)",
      value: formatNumber(activeTasksCount, language),
      icon: CheckSquare,
      gradientFrom: "from-blue-500",
      gradientTo: "to-blue-600",
      borderAccent: "border-s-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      trend: overdueTasksCount > 0 ? { value: overdueTasksCount, label: isAr ? "متأخر" : "OVERDUE", isPositive: false } : null,
      secondaryBadge: null,
    },
  ];

  // Department accent colors
  const deptAccents: Record<string, string> = {
    ARCHITECTURAL: "bg-teal-500",
    STRUCTURAL: "bg-amber-500",
    MEP: "bg-violet-500",
  };

  return (
    <div className="space-y-6">
      {/* ===== Welcome Section with Notification Bell & Quick Create ===== */}
      <WelcomeSection
        userName={user?.name}
        alertsCount={alerts.length}
        isAr={isAr}
        onNavigate={setCurrentPage}
      />

      {/* ===== Stats Cards ===== */}
      <DashboardLayoutManager layout={layout} language={language}>
      <WidgetSlot widgetId="kpi-cards" layout={layout} language={language}>
        <StatCards statCards={statCards} />
      </WidgetSlot>

      <WidgetSlot widgetId="quick-overview" layout={layout} language={language}>
        {/* ===== Quick Overview Strip ===== */}
        <QuickOverview
          stats={stats}
          overdueTasksCount={overdueTasksCount}
          invoices={invoices}
          upcomingTasks={upcomingTasks}
          isAr={isAr}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="revenue-chart" layout={layout} language={language}>
        {/* ===== Revenue Chart + Department Progress ===== */}
        <RevenueDepartment
          revenue={revenue}
          departmentProgress={departmentProgress}
          isAr={isAr}
          deptAccents={deptAccents}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="my-tasks" layout={layout} language={language}>
        {/* ===== My Tasks Widget ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Suspense fallback={<WidgetSkeleton />}>
              <MyTasksWidget language={language} />
            </Suspense>
          </div>

          {/* ===== System Status Widget ===== */}
          <Suspense fallback={<WidgetSkeleton />}>
            <SystemStatus isAr={isAr} />
          </Suspense>
        </div>
      </WidgetSlot>

      <WidgetSlot widgetId="recent-projects" layout={layout} language={language}>
        {/* ===== Recent Projects Table + Alerts ===== */}
        <RecentProjectsAlerts
          recentProjects={recentProjects}
          alerts={alerts}
          isAr={isAr}
          onProjectClick={handleProjectClick}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="gantt-timeline" layout={layout} language={language}>
        {/* ===== Project Gantt Timeline ===== */}
        <GanttTimeline
          recentProjects={recentProjects}
          isAr={isAr}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="deadlines-team" layout={layout} language={language}>
        {/* ===== Upcoming Deadlines + Team Performance ===== */}
        <DeadlinesTeam
          upcomingTasks={upcomingTasks}
          teamPerformance={teamPerformance}
          isAr={isAr}
          onProjectClick={handleProjectClick}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="activity-overview" layout={layout} language={language}>
        {/* ===== Recent Activity Feed + Quick Project Overview ===== */}
        <ActivityFeed
          activities={activities}
          recentProjects={recentProjects}
          isAr={isAr}
          onProjectClick={handleProjectClick}
          onNavigate={setCurrentPage}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="charts-section" layout={layout} language={language}>
        {/* ===== New Chart Sections ===== */}
        <ChartsSection
          projectStatusData={projectStatusData}
          taskTrendData={taskTrendData}
          stats={stats}
          isAr={isAr}
          language={language}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="dept-workload" layout={layout} language={language}>
        {/* ===== Department Workload Overview ===== */}
        <DeptWorkload
          departmentProgress={departmentProgress}
          stats={stats}
          activeTasksCount={activeTasksCount}
          overdueTasksCount={overdueTasksCount}
          invoices={invoices}
          isAr={isAr}
        />
      </WidgetSlot>

      <WidgetSlot widgetId="project-health" layout={layout} language={language}>
        {/* ===== Project Health Widget + Budget Overview ===== */}
        <ProjectHealthBudget
          budgetOverviewData={budgetOverviewData}
          language={language}
        />
      </WidgetSlot>

      </DashboardLayoutManager>
    </div>
  );
}
