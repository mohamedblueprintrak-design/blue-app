"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, GitCompareArrows, Building2 } from "lucide-react";
import { exportToCSV } from "@/lib/export-utils";
import type { ProjectRow } from "./types";
import { MAX_COMPARE } from "./types";

interface ProjectHeaderProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  allProjectsCount: number;
  selectedIdsSize: number;
  projects: ProjectRow[];
  onShowCompare: () => void;
  onShowAddDialog: () => void;
}

export function ProjectHeader({
  isAr,
  t,
  allProjectsCount,
  selectedIdsSize,
  projects,
  onShowCompare,
  onShowAddDialog,
}: ProjectHeaderProps) {
  const tAuto = useTranslations();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-teal-500/20">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("المشاريع", "Projects")}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {allProjectsCount} {t("مشروع", "projects")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {selectedIdsSize >= 2 && selectedIdsSize <= MAX_COMPARE && (
          <Button
            variant="outline"
            onClick={onShowCompare}
            className="text-teal-600 dark:text-teal-400 border-teal-300 dark:border-teal-700 gap-2 hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            <GitCompareArrows className="h-4 w-4" />
            {t("مقارنة", "Compare")}
            <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0 text-[10px] h-5 min-w-[20px] px-1 justify-center rounded-full">
              {selectedIdsSize}
            </Badge>
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => {
            const statusLabels: Record<string, string> = {
              ACTIVE: tAuto('auto.active'),
              COMPLETED: tAuto('auto.completed'),
              DELAYED: tAuto('auto.delayed'),
              ON_HOLD: tAuto('auto.onHold'),
              CANCELLED: tAuto('auto.cancelled'),
              DESIGN: tAuto('auto.design'),
              SUBMISSION: tAuto('auto.submission'),
              APPROVAL: tAuto('auto.approval'),
              CONSTRUCTION: tAuto('auto.construction'),
            };
            const typeLabels: Record<string, string> = {
              VILLA: tAuto('auto.villa'),
              BUILDING: tAuto('auto.building'),
              COMMERCIAL: tAuto('auto.commercial'),
              INDUSTRIAL: tAuto('auto.industrial'),
            };
            exportToCSV(
              projects.map((p: ProjectRow) => ({
                [t("الرقم", "No.")]: p.number,
                [t("اسم المشروع", "Project Name")]: isAr ? p.name : p.nameEn || p.name,
                [t("العميل", "Client")]: p.client?.name || "",
                [t("المقاول", "Contractor")]: p.contractor?.companyName || p.contractor?.name || "",
                [t("الموقع", "Location")]: p.location,
                [t("النوع", "Type")]: typeLabels[p.type] || p.type,
                [t("الحالة", "Status")]: statusLabels[p.status] || p.status,
                [t("الإنجاز %", "Progress %")]: p.progress,
                [t("الميزانية", "Budget")]: p.budget,
              })),
              tAuto('auto.projects1')
            );
          }}
          className="text-slate-600 dark:text-slate-300 gap-2"
        >
          <Download className="h-4 w-4" />
          {t("تصدير", "Export")}
        </Button>
        <Button
          onClick={onShowAddDialog}
          className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("مشروع جديد", "New Project")}
        </Button>
      </div>
    </div>
  );
}
