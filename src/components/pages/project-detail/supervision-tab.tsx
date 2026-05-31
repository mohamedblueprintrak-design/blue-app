"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckCircle2 } from "lucide-react";
import { SubTabsNav } from "./helpers";
import { supervisionSubTabs } from "./constants";
import SupervisionPage from "@/components/pages/supervision";
import InspectionsPage from "@/components/pages/inspections";
import type { ProjectData } from "./types";

// ===== SUPERVISION TAB =====
interface SupervisionTabProps {
  project: ProjectData;
  language: "ar" | "en";
  projectId: string | undefined;
  activeSubTab: string;
  onSubTabChange: (id: string) => void;
}

export default function SupervisionTab({ project, language, projectId, activeSubTab, onSubTabChange }: SupervisionTabProps) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <>
      <SubTabsNav 
        tabs={supervisionSubTabs} 
        activeSubTab={activeSubTab} 
        onSubTabChange={onSubTabChange}
        language={language}
      />
      <div>
        {(activeSubTab === "checklists" || activeSubTab === "violations") && <SupervisionPage language={language} projectId={projectId} />}
        {activeSubTab === "inspections" && <InspectionsPage language={language} projectId={projectId} />}
        {activeSubTab === "completion" && (
          <Card className="border-slate-200 dark:border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                {t("شهادة الإنجاز", "Completion Certificate")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-400">
                <Award className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">{t("شهادة الإنجاز", "Completion Certificate")}</h3>
                <p className="text-sm max-w-md mx-auto">{t("سيتم إنشاء شهادة الإنجاز عند اكتمال جميع مراحل المشروع بنجاح", "Completion certificate will be generated upon successful completion of all project stages")}</p>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{t("إنجاز المعماري", "Architectural Completion")}: {project.progress}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
