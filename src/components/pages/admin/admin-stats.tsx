"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, CircleDot, Server, HardDrive } from "lucide-react";

interface AdminStatsProps {
  isAr: boolean;
  totalUsers: number;
  activeUsers: number;
}

export function AdminStats({ isAr, totalUsers, activeUsers }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "إجمالي المستخدمين" : "Total Users"}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {totalUsers}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CircleDot className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "الجلسات النشطة" : "Active Sessions"}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {activeUsers}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Server className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "صحة النظام" : "System Health"}
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {isAr ? "ممتاز" : "Excellent"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? "التخزين المستخدم" : "Storage Used"}
              </p>
              <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                2.4 GB
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
