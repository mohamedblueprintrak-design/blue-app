"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Receipt,
  Plus,
} from "lucide-react";
import { SubTabsNav, StatusBadge } from "./helpers";
import { financialSubTabs } from "./constants";
import InvoicesPage from "@/components/pages/invoices";
import PaymentsPage from "@/components/pages/payments";
import BudgetsPage from "@/components/pages/budgets";
import ProposalsPage from "@/components/pages/proposals";
import type { ProjectData } from "./types";

// ===== FINANCIAL TAB =====
interface FinancialTabProps {
  project: ProjectData;
  language: "ar" | "en";
  projectId: string | undefined;
  activeSubTab: string;
  onSubTabChange: (id: string) => void;
}

export default function FinancialTab({ project, language, projectId, activeSubTab, onSubTabChange }: FinancialTabProps) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <>
      <SubTabsNav 
        tabs={financialSubTabs} 
        activeSubTab={activeSubTab} 
        onSubTabChange={onSubTabChange}
        language={language}
      />
      <div className="space-y-4">
        {/* Contract Value Summary */}
        <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-4 text-white">
            <h3 className="text-sm font-semibold mb-3">{t("ملخص قيمة العقد", "Contract Value Summary")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-white/70">{t("إجمالي العقد", "Total Contract")}</p>
                <p className="text-lg font-bold tabular-nums">{project.budget.toLocaleString()} <span className="text-xs font-normal">AED</span></p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t("إجمالي المدفوع", "Total Paid")}</p>
                <p className="text-lg font-bold tabular-nums">{project.invoices?.reduce((s, i) => s + i.paidAmount, 0).toLocaleString() || 0} <span className="text-xs font-normal">AED</span></p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t("المتبقي", "Total Remaining")}</p>
                <p className="text-lg font-bold tabular-nums">{Math.max(project.budget - (project.invoices?.reduce((s, i) => s + i.paidAmount, 0) || 0), 0).toLocaleString()} <span className="text-xs font-normal">AED</span></p>
              </div>
              <div>
                <p className="text-xs text-white/70">{t("نسبة التحصيل", "% Collected")}</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold tabular-nums">{project.budget > 0 ? Math.round(((project.invoices?.reduce((s, i) => s + i.paidAmount, 0) || 0) / project.budget) * 100) : 0}%</p>
                  <Progress value={project.budget > 0 ? Math.round(((project.invoices?.reduce((s, i) => s + i.paidAmount, 0) || 0) / project.budget) * 100) : 0} className="h-2 bg-white/20 flex-1" />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Schedule Table */}
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-teal-500" />
                {t("جدول الدفعات", "Payment Schedule")}
              </CardTitle>
              <Button size="sm" className="h-7 gap-1 text-xs bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="h-3 w-3" />
                {t("إضافة مرحلة دفع", "Add Payment Milestone")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-start p-2.5 text-slate-500 font-medium">{t("المرحلة", "Milestone")}</th>
                    <th className="text-start p-2.5 text-slate-500 font-medium">{t("المبلغ", "Amount")}</th>
                    <th className="text-start p-2.5 text-slate-500 font-medium">{t("النسبة", "%")}</th>
                    <th className="text-start p-2.5 text-slate-500 font-medium">{t("تاريخ الاستحقاق", "Due Date")}</th>
                    <th className="text-start p-2.5 text-slate-500 font-medium">{t("الحالة", "Status")}</th>
                    <th className="text-start p-2.5 text-slate-500 font-medium">{t("تاريخ الدفع", "Paid Date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { milestoneAr: "دفعة مقدمة", milestoneEn: "Advance Payment", amount: project.budget * 0.2, pct: 20, dueDate: project.startDate, status: "PAID", paidDate: project.startDate },
                    { milestoneAr: "إتمام التصميم", milestoneEn: "Design Completion", amount: project.budget * 0.15, pct: 15, dueDate: null, status: "PENDING", paidDate: null },
                    { milestoneAr: "اعتماد البلدية", milestoneEn: "Municipality Approval", amount: project.budget * 0.1, pct: 10, dueDate: null, status: "NOT_STARTED", paidDate: null },
                    { milestoneAr: "إتمام الهيكل", milestoneEn: "Structure Completion", amount: project.budget * 0.25, pct: 25, dueDate: null, status: "NOT_STARTED", paidDate: null },
                    { milestoneAr: "التشطيبات", milestoneEn: "Finishing Works", amount: project.budget * 0.2, pct: 20, dueDate: null, status: "NOT_STARTED", paidDate: null },
                    { milestoneAr: "التسليم النهائي", milestoneEn: "Final Handover", amount: project.budget * 0.1, pct: 10, dueDate: project.endDate, status: "NOT_STARTED", paidDate: null },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{isAr ? row.milestoneAr : row.milestoneEn}</td>
                      <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300">{row.amount.toLocaleString()} AED</td>
                      <td className="p-2.5 text-slate-500">{row.pct}%</td>
                      <td className="p-2.5 text-slate-400">{row.dueDate ? new Date(row.dueDate).toLocaleDateString(isAr ? "ar-AE" : "en-US") : "—"}</td>
                      <td className="p-2.5">
                        <StatusBadge status={row.status === "PAID" ? "APPROVED" : row.status === "PENDING" ? "SUBMITTED" : "NOT_STARTED"} language={language} />
                      </td>
                      <td className="p-2.5 text-slate-400">{row.paidDate ? new Date(row.paidDate).toLocaleDateString(isAr ? "ar-AE" : "en-US") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{t("المجموع", "Total")}</td>
                    <td className="p-2.5 font-bold font-mono text-slate-900 dark:text-white">{project.budget.toLocaleString()} AED</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">100%</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          {activeSubTab === "invoices" && <InvoicesPage language={language} projectId={projectId} />}
          {activeSubTab === "payments" && <PaymentsPage language={language} projectId={projectId} />}
          {activeSubTab === "budgets" && <BudgetsPage language={language} projectId={projectId} />}
          {activeSubTab === "proposals" && <ProposalsPage language={language} projectId={projectId} />}
        </div>
      </div>
    </>
  );
}
