"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Landmark,
  ClipboardCheck,
  CheckCircle2,
  Upload,
  FileUp,
  FileText,
} from "lucide-react";
import { SubTabsNav, StatusBadge } from "./helpers";
import { municipalitySubTabs, MUNICIPALITY_PREREQUISITES, DESIGN_DISCIPLINES } from "./constants";
import MunicipalityCorrespondencePage from "@/components/pages/municipality-correspondence";
import DocumentsPage from "@/components/pages/documents";
import type { ProjectData } from "./types";

// ===== MUNICIPALITY TAB =====
interface MunicipalityTabProps {
  project: ProjectData;
  language: "ar" | "en";
  projectId: string;
  activeSubTab: string;
  onSubTabChange: (id: string) => void;
}

export default function MunicipalityTab({ project, language, projectId, activeSubTab, onSubTabChange }: MunicipalityTabProps) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <>
      <SubTabsNav 
        tabs={municipalitySubTabs} 
        activeSubTab={activeSubTab} 
        onSubTabChange={onSubTabChange}
        language={language}
      />
      <div className="space-y-4">
        {/* Prerequisites Checklist — shown on license sub-tab */}
        {activeSubTab === "license" && (
          <Card className="border-slate-200 dark:border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-teal-500" />
                {t("قائمة المتطلبات", "Prerequisites Checklist")}
                <Badge variant="outline" className="text-[10px] border-0 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 ms-2">
                  {(() => {
                    const checked = MUNICIPALITY_PREREQUISITES.filter(p => {
                      if (p.dependsOn === "EXTERNAL") return false;
                      return project.stages?.some(s => s.department === p.dependsOn && s.status === "APPROVED");
                    }).length;
                    return `${checked}/${MUNICIPALITY_PREREQUISITES.length}`;
                  })()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {MUNICIPALITY_PREREQUISITES.map((item) => {
                  const isChecked = item.dependsOn === "EXTERNAL"
                    ? false
                    : project.stages?.some(s => s.department === item.dependsOn && s.status === "APPROVED") || false;
                  return (
                    <div key={item.id} className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      isChecked
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    )}>
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                        isChecked
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-slate-300 dark:border-slate-600"
                      )}>
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs font-medium", isChecked ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300")}>
                          {isAr ? item.labelAr : item.labelEn}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.dependsOn === "EXTERNAL" ? t("مطلوب يدوياً", "Manual upload required") : `${t("يعتمد على", "Depends on")} ${DESIGN_DISCIPLINES.find(d => d.id === item.dependsOn)?.nameAr || item.dependsOn}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          {activeSubTab === "license" && (
            <>
              <Card className="border-slate-200 dark:border-slate-700/50 mb-4">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("حالة الرخصة", "License Status")}</CardTitle></CardHeader>
                <CardContent>
                  {project.govApprovals && project.govApprovals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {project.govApprovals.map((approval) => (
                        <div key={approval.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium">{approval.authority}</span>
                          </div>
                          <StatusBadge status={approval.status} language={language} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500"><Landmark className="h-10 w-10 mx-auto text-slate-300 mb-3" /><p>{t("لا توجد موافقات", "No approvals tracked")}</p></div>
                  )}
                </CardContent>
              </Card>

              {/* License Stages Table */}
              <Card className="border-slate-200 dark:border-slate-700/50">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("مراحل الرخصة البلدية", "Municipality License Stages")}</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-start p-2.5 text-slate-500 font-medium">{t("المرحلة", "Stage")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-28">{t("الحالة", "Status")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-28">{t("تاريخ التقديم", "Submitted")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-28">{t("تاريخ الاعتماد", "Approved")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-20">{t("ملاحظات", "Notes")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { stageAr: "تقديم الطلب", stageEn: "Application Submission", status: project.govApprovals?.[0]?.status || "PENDING", submitted: project.govApprovals?.[0]?.submissionDate, approved: project.govApprovals?.[0]?.approvalDate },
                          { stageAr: "مراجعة البلدية", stageEn: "Municipality Review", status: "PENDING", submitted: null, approved: null },
                          { stageAr: "الاعتماد / الرفض", stageEn: "Approval / Rejection", status: "NOT_STARTED", submitted: null, approved: null },
                        ].map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/50">
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{isAr ? row.stageAr : row.stageEn}</td>
                            <td className="p-2.5"><StatusBadge status={row.status} language={language} /></td>
                            <td className="p-2.5 text-slate-400">{row.submitted ? new Date(row.submitted).toLocaleDateString(isAr ? "ar-AE" : "en-US") : "—"}</td>
                            <td className="p-2.5 text-slate-400">{row.approved ? new Date(row.approved).toLocaleDateString(isAr ? "ar-AE" : "en-US") : "—"}</td>
                            <td className="p-2.5 text-slate-400">—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Document Section */}
              <Card className="border-slate-200 dark:border-slate-700/50 mt-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-amber-500" />
                      {t("مستندات البلدية", "Municipality Documents")}
                    </CardTitle>
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                      <Upload className="h-3 w-3" />
                      {t("رفع مستند", "Upload Document")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-slate-400">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs">{t("لا توجد مستندات مرفوعة", "No documents uploaded")}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          {activeSubTab === "correspondence" && <MunicipalityCorrespondencePage language={language} projectId={projectId || undefined} />}
          {activeSubTab === "approved-drawings" && <DocumentsPage language={language} projectId={projectId || undefined} />}
        </div>
      </div>
    </>
  );
}

