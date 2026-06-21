"use client";


import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavStore } from "@/store/nav-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Building2,
  Pencil,
  Sparkles,
} from "lucide-react";

// Import sub-components
import { StatusBadge, ProgressRing } from "./project-detail/helpers";
import {
  mainTabs,
  designSubTabs,
  municipalitySubTabs,
  boqSubTabs,
  contractorSubTabs,
  supervisionSubTabs,
  financialSubTabs,
} from "./project-detail/constants";
import OverviewTab from "./project-detail/overview-tab";
import WorkflowTab from "./project-detail/workflow-tab";
import ContractorRFQTab from "./project-detail/contractor-rfq-tab";
import DesignTab from "./project-detail/design-tab";
import MunicipalityTab from "./project-detail/municipality-tab";
import BOQTab from "./project-detail/boq-tab";
import SupervisionTab from "./project-detail/supervision-tab";
import FinancialTab from "./project-detail/financial-tab";

// Import page components still used directly
import TasksKanban from "@/components/pages/tasks";
import DocumentsPage from "@/components/pages/documents";

// Import types
import type { ProjectDetailProps, ProjectData } from "./project-detail/types";

// ===== MAIN COMPONENT =====
export default function ProjectDetail({ language }: ProjectDetailProps) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { 
    currentProjectId, 
    currentProjectTab, 
    currentProjectSubTab,
    setCurrentProjectId, 
    setCurrentPage, 
    setCurrentProjectTab,
    setCurrentProjectSubTab 
  } = useNavStore();

  const [activeTab, setActiveTab] = useState(currentProjectTab || "overview");
  const [activeSubTab, setActiveSubTab] = useState(currentProjectSubTab || "");

  // Sync with store
  React.useEffect(() => {
    if (currentProjectTab) {
      setActiveTab(currentProjectTab);
    }
    setActiveSubTab(currentProjectSubTab || "");
  }, [currentProjectTab, currentProjectSubTab]);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const res = await fetch(`/api/projects/${currentProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json() as Promise<ProjectData>;
    },
    enabled: !!currentProjectId,
  });

  const handleBack = () => {
    setCurrentProjectId(null);
    setCurrentPage("projects");
    setCurrentProjectTab("overview");
    setCurrentProjectSubTab("");
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentProjectTab(tab);
    // Set default sub-tab for tabs with sub-tabs
    const subTabsMap: Record<string, typeof designSubTabs> = {
      design: designSubTabs,
      municipality: municipalitySubTabs,
      boq: boqSubTabs,
      contractor: contractorSubTabs,
      supervision: supervisionSubTabs,
      financial: financialSubTabs,
    };
    if (subTabsMap[tab] && subTabsMap[tab].length > 0) {
      const defaultSubTab = subTabsMap[tab][0].id;
      setActiveSubTab(defaultSubTab);
      setCurrentProjectSubTab(defaultSubTab);
    } else {
      setActiveSubTab("");
      setCurrentProjectSubTab("");
    }
  };

  const handleSubTabChange = (subTab: string) => {
    setActiveSubTab(subTab);
    setCurrentProjectSubTab(subTab);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Building2 className="h-12 w-12 text-slate-300" />
        <p className="text-slate-500">{t("لم يتم العثور على المشروع", "Project not found")}</p>
        <Button variant="outline" onClick={handleBack}>
          {t("رجوع", "Back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== Header ===== */}
      <Card className="border-slate-200 dark:border-slate-700/50 bg-gradient-to-l from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-9 w-9 shrink-0 mt-0.5" aria-label={isAr ? "الرجوع" : "Go back"}>
                {isAr ? <ChevronLeft className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5 rotate-180" />}
              </Button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 border-0 px-2">
                    #{project.number}
                  </Badge>
                  <StatusBadge status={project.status} language={language} />
                  <Badge variant="outline" className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-500 border-0">
                    {project.type === "VILLA" ? t("فيلا", "Villa") :
                     project.type === "BUILDING" ? t("مبنى", "Building") :
                     project.type === "COMMERCIAL" ? t("تجاري", "Commercial") :
                     t("صناعي", "Industrial")}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {isAr ? project.name : project.nameEn || project.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("العميل", "Client")}: {project.client?.name}{project.client?.company ? ` — ${project.client.company}` : ""}
                  {project.contractor ? (
                    <span className="ms-3">| {t("المقاول", "Contractor")}: {project.contractor.companyName || project.contractor.name}</span>
                  ) : null}
                </p>
              </div>
            </div>

            {/* Right: Progress Ring + Actions */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <ProgressRing value={Math.round(project.progress)} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {Math.round(project.progress)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Pencil className="h-3.5 w-3.5" />
                  {t("تعديل", "Edit")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Main Tabs ===== */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <ScrollArea className="w-full -mb-px" dir={isAr ? "rtl" : "ltr"}>
          <TabsList className="bg-slate-100 dark:bg-slate-800 h-auto p-1 rounded-xl w-fit min-w-full">
            {mainTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm transition-all",
                  "data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm",
                  "data-[state=active]:text-teal-600 dark:data-[state=active]:text-teal-400"
                )}
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{isAr ? tab.labelAr : tab.labelEn}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {/* ===== Tab Contents ===== */}
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <OverviewTab project={project} language={language} />
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow" className="mt-4">
          <WorkflowTab projectId={currentProjectId || ''} language={language} />
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="mt-4">
          <DesignTab 
            project={project} 
            language={language} 
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
          />
        </TabsContent>

        {/* Municipality Tab */}
        <TabsContent value="municipality" className="mt-4">
          <MunicipalityTab 
            project={project}
            language={language}
            projectId={currentProjectId || ''}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
          />
        </TabsContent>

        {/* BOQ Tab */}
        <TabsContent value="boq" className="mt-4">
          <BOQTab 
            language={language}
            projectId={currentProjectId || undefined}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
          />
        </TabsContent>

        {/* Contractor Tab */}
        <TabsContent value="contractor" className="mt-4">
          <ContractorRFQTab projectId={currentProjectId || ''} language={language} />
        </TabsContent>

        {/* Supervision Tab */}
        <TabsContent value="supervision" className="mt-4">
          <SupervisionTab 
            project={project}
            language={language}
            projectId={currentProjectId || undefined}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
          />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4">
          <TasksKanban language={language} projectId={currentProjectId || undefined} />
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="mt-4">
          <FinancialTab 
            project={project}
            language={language}
            projectId={currentProjectId || undefined}
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <div className="border rounded-xl p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DocumentsPage language={language} projectId={currentProjectId || undefined} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating AI Button - Opens AI Assistant */}
      <button
        onClick={() => {
          const { setCurrentPage } = useNavStore.getState();
          setCurrentPage("ai-assistant");
        }}
        className="fixed bottom-6 start-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-xl shadow-teal-500/30 flex items-center justify-center transition-all hover:scale-110 group"
        title={t("المساعد الذكي", "AI Assistant")}
      >
        <Sparkles className="h-5 w-5 group-hover:animate-pulse" />
        <span className="absolute -top-1 -end-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
      </button>
    </div>
  );
}
