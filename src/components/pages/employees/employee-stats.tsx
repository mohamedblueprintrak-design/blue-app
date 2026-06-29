"use client";


import { useTranslations } from 'next-intl';
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Clock, UserPlus } from "lucide-react";

interface Employee {
  employmentStatus: string;
  hireDate: string | null;
}

interface EmployeeStatsProps {
  employees: Employee[];
  ar: boolean;
}

export function EmployeeStats({ employees, ar: _ar }: EmployeeStatsProps) {
  const tAuto = useTranslations();
  const stats = useMemo(() => ({
    total: employees.length,
    ACTIVE: employees.filter(e => e.employmentStatus === "ACTIVE").length,
    onLeave: employees.filter(e => e.employmentStatus === "ON_LEAVE").length,
    newThisMonth: employees.filter(e => {
      if (!e.hireDate) return false;
      const d = new Date(e.hireDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  }), [employees]);

  const statCards = [
    {
      label: tAuto('auto.totalEmployees'),
      value: stats.total,
      icon: Users,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      label: tAuto('auto.active'),
      value: stats.ACTIVE,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: tAuto('auto.onLeave'),
      value: stats.onLeave,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: tAuto('auto.newThisMonth'),
      value: stats.newThisMonth,
      icon: UserPlus,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statCards.map((card) => (
        <Card key={card.label} className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{card.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
