"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLang } from "@/hooks/use-lang";
import EmployeesPage from "@/components/pages/employees";
import AttendancePage from "@/components/pages/attendance";
import LeavePage from "@/components/pages/leave";
import WorkloadPage from "@/components/pages/workload";
import { UsersRound, Clock, CalendarOff, BarChart3 } from "lucide-react";

/**
 * Employees Hub — single entry point for all employee-related pages.
 * Replaces the old sub-menu (employees-list, employees-attendance, employees-leave, employees-workload)
 */
export default function EmployeesHub({ language }: { language: "ar" | "en" }) {
  const lang = useLang();
  const ar = lang === "ar";
  const [activeTab, setActiveTab] = useState("list");

  const tabs = [
    { id: "list", icon: UsersRound, labelAr: "قائمة الموظفين", labelEn: "Employees" },
    { id: "attendance", icon: Clock, labelAr: "الحضور والانصراف", labelEn: "Attendance" },
    { id: "LEAVE", icon: CalendarOff, labelAr: "الإجازات", labelEn: "Leave" },
    { id: "workload", icon: BarChart3, labelAr: "أعباء العمل", labelEn: "Workload" },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 h-10 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="gap-2 text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {ar ? tab.labelAr : tab.labelEn}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <EmployeesPage language={language} />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <AttendancePage language={language} />
        </TabsContent>
        <TabsContent value="LEAVE" className="mt-4">
          <LeavePage language={language} />
        </TabsContent>
        <TabsContent value="workload" className="mt-4">
          <WorkloadPage language={language} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
