"use client";


import { useTranslations } from 'next-intl';
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import {
  Building2,
  HardHat,
  Zap,
  ShieldAlert,
  PenTool,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Upload,
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { SubTabsNav, StatCard, DesignPipeline, StageStepper } from "./helpers";
import {
  designSubTabs,
  APPROVAL_CHAIN,
  DESIGN_DISCIPLINES,
  DESIGN_STEP_STATUS_COLORS,
} from "./constants";
import type { ProjectData } from "./types";

// ===== DESIGN TAB =====
interface DesignTabProps {
  project: ProjectData;
  language: "ar" | "en";
  activeSubTab: string;
  onSubTabChange: (id: string) => void;
}

export default function DesignTab({ project, language, activeSubTab, onSubTabChange }: DesignTabProps) {
  const tAuto = useTranslations();
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  return (
    <>
      <SubTabsNav 
        tabs={designSubTabs} 
        activeSubTab={activeSubTab} 
        onSubTabChange={onSubTabChange}
        language={language}
      />
      <div className="space-y-4">
        {/* Approval Chain — shown on all design sub-tabs */}
        <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-navy-500" />{t("سلسلة الاعتماد", "Approval Chain")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {APPROVAL_CHAIN.map((step, idx) => (
                <React.Fragment key={step.key}>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{isAr ? step.labelAr : step.labelEn}</span>
                  </div>
                  {idx < APPROVAL_CHAIN.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Tables per Discipline — shown on all design sub-tabs */}
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PenTool className="h-4 w-4 text-brand-navy-500" />
              {t("جدول خطوات التخصصات", "Discipline Steps Table")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {DESIGN_DISCIPLINES.map((discipline) => {
              const DisciplineIcon = discipline.icon;
              const completedSteps = discipline.steps.filter(s => s.status === "APPROVED").length;
              const totalSteps = discipline.steps.length;
              const progressPct = Math.round((completedSteps / totalSteps) * 100);

              return (
                <div key={discipline.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                  {/* Section Header with Progress */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${discipline.color}15`, color: discipline.color }}>
                      <DisciplineIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{isAr ? discipline.nameAr : discipline.nameEn}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{completedSteps}/{totalSteps}</span>
                      <div className="w-24">
                        <Progress value={progressPct} className="h-1.5 bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <span className="text-sm font-bold" style={{ color: discipline.color }}>{progressPct}%</span>
                    </div>
                  </div>

                  {/* Steps Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="text-start p-2.5 text-slate-500 font-medium w-8">#</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium">{t("الخطوة", "Step")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-36">{t("المسؤول", "Assignee")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-28">{t("الحالة", "Status")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-28">{t("التاريخ", "Date")}</th>
                          <th className="text-start p-2.5 text-slate-500 font-medium w-24">{t("ملفات", "Files")}</th>
                            </tr>
                      </thead>
                      <tbody>
                        {discipline.steps.map((step, idx) => (
                          <tr key={step.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{isAr ? step.nameAr : step.nameEn}</td>
                            <td className="p-2.5">
                              <div className="relative">
                                <select
                                  className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 appearance-none cursor-pointer pr-6"
                                  value={step.assignee}
                                  onChange={() => {}}
                                >
                                  <option value="">{t("اختر...", "Select...")}</option>
                                  <option value="ahmed">أحمد محمد</option>
                                  <option value="sara">سارة أحمد</option>
                                  <option value="khalid">خالد علي</option>
                                  <option value="fatma">فاطمة حسن</option>
                                </select>
                                <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                              </div>
                            </td>
                            <td className="p-2.5">
                              <select
                                className="w-full text-xs px-2 py-1.5 rounded-md border-0 font-medium cursor-pointer"
                                style={{ backgroundColor: DESIGN_STEP_STATUS_COLORS[step.status]?.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100', color: DESIGN_STEP_STATUS_COLORS[step.status]?.split(' ').find(c => c.startsWith('text-')) || 'text-slate-500' }}
                                value={step.status}
                                onChange={() => {}}
                              >
                                <option value="not-started">{tAuto('auto.notStarted')}</option>
                                <option value="in-progress">{tAuto('auto.inProgress')}</option>
                                <option value="SUBMITTED">{tAuto('auto.submitted')}</option>
                                <option value="APPROVED">{tAuto('auto.approved')}</option>
                              </select>
                            </td>
                            <td className="p-2.5 text-slate-400">{step.date || "—"}</td>
                            <td className="p-2.5">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-brand-navy-600" aria-label="Upload">
                                <Upload className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Supervisor Assignment */}
                  <div className="flex items-center gap-3 p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <UserCheck className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-500">{t("المشرف:", "Supervisor:")}</span>
                    <div className="relative flex-1 max-w-[200px]">
                      <select className="w-full text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 appearance-none cursor-pointer pr-6">
                        <option value="">{t("اختر مشرف...", "Select supervisor...")}</option>
                        <option value="lead1">أحمد محمد</option>
                        <option value="lead2">سارة أحمد</option>
                      </select>
                      <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {activeSubTab === "ARCHITECTURAL" && (
          <>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("خط أنابيب التصميم المعماري", "Architectural Design Pipeline")}</CardTitle></CardHeader>
              <CardContent>
                <DesignPipeline department="ARCHITECTURAL" stages={project.stages || []} language={language} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t("الإنجاز", "Progress")} value={`${Math.round(project.stages?.filter((s) => s.department === "ARCHITECTURAL" && s.status === "APPROVED").length / Math.max(project.stages?.filter((s) => s.department === "ARCHITECTURAL").length, 1) * 100 || 0)}%`} icon={TrendingUp} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <StatCard label={t("مكتمل", "Completed")} value={`${project.stages?.filter((s) => s.department === "ARCHITECTURAL" && s.status === "APPROVED").length || 0}/${project.stages?.filter((s) => s.department === "ARCHITECTURAL").length || 0}`} icon={CheckCircle2} color="bg-brand-navy-100 dark:bg-brand-navy-900/30 text-brand-navy-600 dark:text-brand-navy-400" />
              <StatCard label={t("قيد التنفيذ", "In Progress")} value={project.stages?.filter((s) => s.department === "ARCHITECTURAL" && s.status === "IN_PROGRESS").length || 0} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <StatCard label={t("عدد الرفوض", "Rejections")} value={0} icon={XCircle} color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            </div>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("مراحل القسم المعماري", "Architectural Stages")}</CardTitle></CardHeader>
              <CardContent>
                {project.stages?.filter((s) => s.department === "ARCHITECTURAL").length > 0 ? (
                  <StageStepper stages={project.stages.filter((s) => s.department === "ARCHITECTURAL")} language={language} />
                ) : (
                  <div className="text-center py-8 text-slate-500"><Building2 className="h-10 w-10 mx-auto text-slate-300 mb-3" /><p>{t("لا توجد مراحل", "No stages defined")}</p></div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        {activeSubTab === "STRUCTURAL" && (
          <>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("خط أنابيب التصميم الإنشائي", "Structural Design Pipeline")}</CardTitle></CardHeader>
              <CardContent>
                <DesignPipeline department="STRUCTURAL" stages={project.stages || []} language={language} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t("الإنجاز", "Progress")} value={`${Math.round(project.stages?.filter((s) => s.department === "STRUCTURAL" && s.status === "APPROVED").length / Math.max(project.stages?.filter((s) => s.department === "STRUCTURAL").length, 1) * 100 || 0)}%`} icon={TrendingUp} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <StatCard label={t("مكتمل", "Completed")} value={`${project.stages?.filter((s) => s.department === "STRUCTURAL" && s.status === "APPROVED").length || 0}/${project.stages?.filter((s) => s.department === "STRUCTURAL").length || 0}`} icon={CheckCircle2} color="bg-brand-navy-100 dark:bg-brand-navy-900/30 text-brand-navy-600 dark:text-brand-navy-400" />
              <StatCard label={t("قيد التنفيذ", "In Progress")} value={project.stages?.filter((s) => s.department === "STRUCTURAL" && s.status === "IN_PROGRESS").length || 0} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <StatCard label={t("عدد الرفوض", "Rejections")} value={0} icon={XCircle} color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            </div>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("مراحل القسم الإنشائي", "Structural Stages")}</CardTitle></CardHeader>
              <CardContent>
                {project.stages?.filter((s) => s.department === "STRUCTURAL").length > 0 ? (
                  <StageStepper stages={project.stages.filter((s) => s.department === "STRUCTURAL")} language={language} />
                ) : (
                  <div className="text-center py-8 text-slate-500"><HardHat className="h-10 w-10 mx-auto text-slate-300 mb-3" /><p>{t("لا توجد مراحل", "No stages defined")}</p></div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        {activeSubTab === "MEP" && (
          <>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("خط أنابيب التصميم الكهربائي والميكانيك", "MEP Design Pipeline")}</CardTitle></CardHeader>
              <CardContent>
                <DesignPipeline department="mep_electrical" stages={project.stages || []} language={language} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t("الإنجاز", "Progress")} value={`${Math.round(project.stages?.filter((s) => (s.department === "mep_electrical" || s.department === "mep_plumbing" || s.department === "mep_water") && s.status === "APPROVED").length / Math.max(project.stages?.filter((s) => s.department === "mep_electrical" || s.department === "mep_plumbing" || s.department === "mep_water").length, 1) * 100 || 0)}%`} icon={TrendingUp} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <StatCard label={t("مكتمل", "Completed")} value={`${project.stages?.filter((s) => (s.department === "mep_electrical" || s.department === "mep_plumbing" || s.department === "mep_water") && s.status === "APPROVED").length || 0}/${project.stages?.filter((s) => s.department === "mep_electrical" || s.department === "mep_plumbing" || s.department === "mep_water").length || 0}`} icon={CheckCircle2} color="bg-brand-navy-100 dark:bg-brand-navy-900/30 text-brand-navy-600 dark:text-brand-navy-400" />
              <StatCard label={t("قيد التنفيذ", "In Progress")} value={project.stages?.filter((s) => (s.department === "mep_electrical" || s.department === "mep_plumbing" || s.department === "mep_water") && s.status === "IN_PROGRESS").length || 0} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <StatCard label={t("عدد الرفوض", "Rejections")} value={0} icon={XCircle} color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            </div>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("مراحل الكهربائي والميكانيك", "MEP Stages")}</CardTitle></CardHeader>
              <CardContent>
                {project.stages?.filter((s) => s.department === "mep_electrical" || s.department === "mep_plumbing" || s.department === "mep_water").length > 0 ? (
                  <StageStepper stages={project.stages.filter((s) => s.department === "mep_electrical" || s.department === "mep_plumbing" || s.department === "mep_water")} language={language} />
                ) : (
                  <div className="text-center py-8 text-slate-500"><Zap className="h-10 w-10 mx-auto text-slate-300 mb-3" /><p>{t("لا توجد مراحل", "No stages defined")}</p></div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        {activeSubTab === "civil-defense" && (
          <>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("خط أنابيب تصميم الدفاع المدني", "Civil Defense Design Pipeline")}</CardTitle></CardHeader>
              <CardContent>
                <DesignPipeline department="mep_civil_defense" stages={project.stages || []} language={language} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={t("الإنجاز", "Progress")} value={`${Math.round(project.stages?.filter((s) => s.department === "mep_civil_defense" && s.status === "APPROVED").length / Math.max(project.stages?.filter((s) => s.department === "mep_civil_defense").length, 1) * 100 || 0)}%`} icon={TrendingUp} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" />
              <StatCard label={t("مكتمل", "Completed")} value={`${project.stages?.filter((s) => s.department === "mep_civil_defense" && s.status === "APPROVED").length || 0}/${project.stages?.filter((s) => s.department === "mep_civil_defense").length || 0}`} icon={CheckCircle2} color="bg-brand-navy-100 dark:bg-brand-navy-900/30 text-brand-navy-600 dark:text-brand-navy-400" />
              <StatCard label={t("قيد التنفيذ", "In Progress")} value={project.stages?.filter((s) => s.department === "mep_civil_defense" && s.status === "IN_PROGRESS").length || 0} icon={Clock} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" />
              <StatCard label={t("عدد الرفوض", "Rejections")} value={0} icon={XCircle} color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            </div>
            <Card className="border-slate-200 dark:border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">{t("مراحل الدفاع المدني", "Civil Defense Stages")}</CardTitle></CardHeader>
              <CardContent>
                {project.stages?.filter((s) => s.department === "mep_civil_defense").length > 0 ? (
                  <StageStepper stages={project.stages.filter((s) => s.department === "mep_civil_defense")} language={language} />
                ) : (
                  <div className="text-center py-8 text-slate-500"><ShieldAlert className="h-10 w-10 mx-auto text-slate-300 mb-3" /><p>{t("لا توجد مراحل", "No stages defined")}</p></div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
