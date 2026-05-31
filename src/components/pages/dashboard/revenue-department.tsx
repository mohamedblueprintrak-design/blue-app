"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartTooltip } from "./chart-tooltip";
import type { DashboardRevenue, DepartmentProgressItem } from "./types";

interface RevenueDepartmentProps {
  revenue: DashboardRevenue;
  departmentProgress: DepartmentProgressItem[];
  isAr: boolean;
  deptAccents: Record<string, string>;
}

export function RevenueDepartment({ revenue, departmentProgress, isAr, deptAccents }: RevenueDepartmentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Revenue Chart */}
      <Card className="lg:col-span-2 rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {isAr ? "الإيرادات الشهرية" : "Monthly Revenue"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "إجمالي المدفوعات المحصلة خلال آخر 6 أشهر" : "Total collected payments over the last 6 months"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30 gap-1">
              {isAr ? "عرض المزيد" : "View More"}
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenue.monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey={isAr ? "labelAr" : "labelEn"}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  dx={-4}
                />
                <Tooltip content={<ChartTooltip isAr={isAr} />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Department Progress */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
            {isAr ? "تقدّم الأقسام" : "Department Progress"}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? "مراحل المشاريع النشطة لكل قسم" : "Active project stages per department"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
          {departmentProgress.map((dept, idx) => {
            const accentColor = deptAccents[dept.key] || "bg-teal-500";
            return (
              <div key={dept.key}>
                <div className="py-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={cn("h-1 w-6 rounded-full", accentColor)} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {isAr ? dept.labelAr : dept.labelEn}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                        {dept.completed}/{dept.total}
                      </span>
                      <span className={cn(
                        "text-xs font-bold tabular-nums min-w-[36px] text-center px-1.5 py-0.5 rounded-md",
                        accentColor.replace("bg-", "text-"),
                        accentColor.replace("bg-", "bg-").replace("-500", "-100").replace("-500", "-50")
                      )}>
                        {dept.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        accentColor
                      )}
                      style={{ width: `${dept.progress}%` }}
                    />
                  </div>
                  <div className="mt-1.5">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {dept.total > 0
                        ? (dept.total - dept.completed) > 0
                          ? isAr
                            ? `${dept.total - dept.completed} مرحلة متبقية`
                            : `${dept.total - dept.completed} stages left`
                          : isAr
                            ? "مكتمل"
                            : "Complete"
                        : isAr
                          ? "لا توجد مراحل"
                          : "No stages"}
                    </span>
                  </div>
                </div>
                {idx < departmentProgress.length - 1 && (
                  <div className="border-t border-slate-100 dark:border-slate-800" />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
