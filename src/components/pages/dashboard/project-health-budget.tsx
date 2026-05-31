"use client";

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
} from "recharts";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "./helpers";
import ProjectHealthWidget from "@/components/pages/project-health-widget";

interface ChartBudgetData {
  name: string;
  budget: number;
}

interface ProjectHealthBudgetProps {
  budgetOverviewData: ChartBudgetData[];
  language: "ar" | "en";
}

export function ProjectHealthBudget({ budgetOverviewData, language }: ProjectHealthBudgetProps) {
  const isAr = language === "ar";

  return (
    <>
      {/* ===== Project Health Widget ===== */}
      <ProjectHealthWidget language={language} />

      {/* Budget Overview Mini Chart */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {isAr ? "أعلى المشاريع من حيث الميزانية" : "Top Projects by Budget"}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "أعلى 5 مشاريع من حيث الميزانية الإجمالية" : "Top 5 projects by total budget"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {budgetOverviewData.length === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-center">
              <DollarSign className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isAr ? "لا تتوفر بيانات الميزانية" : "No budget data available"}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {isAr ? "ستظهر البيانات عند توفر ميزانيات المشاريع" : "Data will appear when project budgets are available"}
              </p>
            </div>
          ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetOverviewData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="budgetBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0e2a5c" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#133371" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={120}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as { name: string; budget: number };
                    return (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{d.name}</p>
                        <p className="text-sm font-bold text-teal-600 dark:text-teal-400 font-mono tabular-nums">
                          {formatCurrency(d.budget, language)} AED
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="budget"
                  name={isAr ? "الميزانية" : "Budget"}
                  fill="url(#budgetBar)"
                  radius={[0, 6, 6, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
