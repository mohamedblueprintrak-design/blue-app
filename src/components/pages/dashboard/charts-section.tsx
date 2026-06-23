"use client";


import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { DashboardStats } from "./types";

interface ChartProjectStatusData {
  name: string;
  value: number;
  color: string;
}

interface ChartTaskTrendData {
  month: string;
  created: number;
  COMPLETED: number;
}

interface ChartsSectionProps {
  projectStatusData: ChartProjectStatusData[];
  taskTrendData: ChartTaskTrendData[];
  stats: DashboardStats;
  isAr: boolean;
  language: "ar" | "en";
}

export function ChartsSection({ projectStatusData, taskTrendData, stats, isAr, language: _language }: ChartsSectionProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Project Status Donut Chart */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.projectStatus')}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            {tAuto('auto.projectDistributionByStatus')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload as { name: string; value: number; color: string };
                      return (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{d.name}</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{d.value}</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{stats.totalProjects}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{tAuto('auto.projects')}</span>
              </div>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
              {projectStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{item.name}</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums ms-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Task Completion Trend */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.taskCompletionTrend')}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            {tAuto('auto.createdVsCompletedTasksLast6Months')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {taskTrendData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tAuto('auto.noTaskTrendDataAvailable')}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {tAuto('auto.dataWillAppearWhenTaskHistoryIsAvailable')}
              </p>
            </div>
          ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskTrendData} barGap={4}>
                <defs>
                  <linearGradient id="createdBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#cbd5e1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="completedBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#133371" stopOpacity={1} />
                    <stop offset="100%" stopColor="#0e2a5c" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  dx={-4}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
                        {payload.map((p, i) => (
                          <p key={i} className="text-xs font-semibold" style={{ color: p.color }}>
                            {p.name}: {p.value}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span className="text-xs text-slate-600 dark:text-slate-400">{value}</span>}
                />
                <Bar
                  dataKey="created"
                  name={tAuto('auto.created')}
                  fill="url(#createdBar)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="COMPLETED"
                  name={tAuto('auto.completed')}
                  fill="url(#completedBar)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
