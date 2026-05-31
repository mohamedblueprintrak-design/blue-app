"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  ClipboardCheck,
  FileWarning,
} from "lucide-react";
import { getMutationHeaders } from "@/lib/csrf-client";
import {
  SupervisionChecklist,
  Violation,
  ProjectOption,
  SupervisionProps,
  CreateFormState,
  CreateFormItem,
  CreateViolationItem,
  getInitialCreateForm,
} from "./types";
import { SupervisionStats } from "./supervision-stats";
import { ProjectFilter, StageSelector, ViolationFilters } from "./supervision-filters";
import { ChecklistList, ViolationsTable } from "./supervision-table";
import { SupervisionForm } from "./supervision-form";
import { SupervisionDetail } from "./supervision-detail";

export default function Supervision({ language, projectId }: SupervisionProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState("checklists");
  const [selectedStage, setSelectedStage] = useState("all");
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewChecklist, setViewChecklist] = useState<SupervisionChecklist | null>(null);
  const [violationFilterStatus, setViolationFilterStatus] = useState<string>("all");
  const [violationFilterSeverity, setViolationFilterSeverity] = useState<string>("all");

  const [createForm, setCreateForm] = useState<CreateFormState>(getInitialCreateForm(projectId));
  const [createItems, setCreateItems] = useState<CreateFormItem[]>([]);
  const [createViolations, setCreateViolations] = useState<CreateViolationItem[]>([]);

  // Queries
  const { data: checklists = [], isLoading: checklistsLoading } = useQuery<SupervisionChecklist[]>({
    queryKey: ["supervision-checklists", filterProject, selectedStage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      if (selectedStage !== "all") params.set("stage", selectedStage);
      const res = await fetch(`/api/supervision-checklists?${params}`);
      if (!res.ok) throw new Error("Failed to fetch checklists");
      return res.json();
    },
  });

  const { data: allViolations = [], isLoading: violationsLoading } = useQuery<Violation[]>({
    queryKey: ["violations-list", filterProject, violationFilterStatus, violationFilterSeverity],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      if (violationFilterStatus !== "all") params.set("status", violationFilterStatus);
      if (violationFilterSeverity !== "all") params.set("severity", violationFilterSeverity);
      const res = await fetch(`/api/violations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch violations");
      return res.json();
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/supervision-checklists", {
        method: "POST", headers: getMutationHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create checklist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supervision-checklists"] });
      queryClient.invalidateQueries({ queryKey: ["violations-list"] });
      setShowCreateDialog(false);
      resetCreateForm();
    },
  });

  const deleteChecklistMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/supervision-checklists/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supervision-checklists"] }),
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/supervision-checklists/${id}`, {
        method: "PUT", headers: getMutationHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update checklist");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supervision-checklists"] }),
  });

  const updateViolationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/violations/${id}`, {
        method: "PUT", headers: getMutationHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update violation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["violations-list"] });
      queryClient.invalidateQueries({ queryKey: ["supervision-checklists"] });
    },
  });

  const deleteViolationMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/violations/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["violations-list"] }),
  });

  // Helpers
  const resetCreateForm = () => {
    setCreateForm(getInitialCreateForm(projectId, selectedStage));
    setCreateItems([]);
    setCreateViolations([]);
  };

  // Stats
  const totalVisits = checklists.length;
  const openViolations = allViolations.filter(v => v.status === "OPEN" || v.status === "IN_PROGRESS").length;
  const resolvedViolations = allViolations.filter(v => v.status === "RESOLVED" || v.status === "CLOSED").length;
  const avgProgress = checklists.length > 0
    ? Math.round(checklists.reduce((sum, c) => sum + c.progressOverall, 0) / checklists.length)
    : 0;
  const filteredChecklists = selectedStage === "all" ? checklists : checklists.filter(c => c.stage === selectedStage);

  const handleCreateSubmit = () => {
    const totalProgress = [
      createForm.concreteProgress, createForm.masonryProgress,
      createForm.electricalProgress, createForm.plumbingProgress,
    ].reduce((a, b) => a + b, 0) / 4;
    createMutation.mutate({
      ...createForm,
      progressOverall: totalProgress,
      items: createItems.map(({ _key, ...rest }) => rest),
      violations: createViolations.map(({ _key, ...v }) => ({ ...v, contractorName: v.contractorName || createForm.contractorName })),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <ClipboardCheck className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "الإشراف على التنفيذ" : "Site Supervision"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {totalVisits} {ar ? "زيارة إشرافية" : "supervision visits"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          {!projectId && (
            <ProjectFilter ar={ar} filterProject={filterProject} onFilterProjectChange={setFilterProject} projects={projects} />
          )}
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "قائمة مراجعة جديدة" : "New Checklist"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <SupervisionStats ar={ar} totalVisits={totalVisits} openViolations={openViolations} resolvedViolations={resolvedViolations} avgProgress={avgProgress} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-800 h-9">
          <TabsTrigger value="checklists" className="text-xs h-7 px-3 gap-1.5">
            <ClipboardCheck className="h-3 w-3" />
            {ar ? "قوائم المراجعة" : "Checklists"}
          </TabsTrigger>
          <TabsTrigger value="violations" className="text-xs h-7 px-3 gap-1.5">
            <FileWarning className="h-3 w-3" />
            {ar ? "المخالفات" : "Violations"}
            {openViolations > 0 && (
              <Badge className="h-4 w-4 p-0 text-[9px] bg-red-500 text-white border-0 rounded-full flex items-center justify-center">
                {openViolations}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklists" className="mt-4 space-y-4">
          <StageSelector ar={ar} selectedStage={selectedStage} onSelectedStageChange={setSelectedStage} />
          <ChecklistList
            ar={ar} checklists={filteredChecklists} isLoading={checklistsLoading}
            onViewChecklist={setViewChecklist}
            onSubmitChecklist={(id) => updateChecklistMutation.mutate({ id, data: { status: "SUBMITTED" } })}
            onApproveChecklist={(id) => updateChecklistMutation.mutate({ id, data: { status: "APPROVED" } })}
            onDeleteChecklist={(id) => deleteChecklistMutation.mutate(id)}
            onCreateNew={() => { resetCreateForm(); setShowCreateDialog(true); }}
          />
        </TabsContent>

        <TabsContent value="violations" className="mt-4 space-y-4">
          <ViolationFilters
            ar={ar} violationFilterStatus={violationFilterStatus} violationFilterSeverity={violationFilterSeverity}
            onViolationFilterStatusChange={setViolationFilterStatus} onViolationFilterSeverityChange={setViolationFilterSeverity}
          />
          <ViolationsTable
            ar={ar} violations={allViolations} isLoading={violationsLoading}
            onUpdateViolationStatus={(id, status) => updateViolationMutation.mutate({ id, data: { status } })}
            onDeleteViolation={(id) => deleteViolationMutation.mutate(id)}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <SupervisionForm
        ar={ar} open={showCreateDialog} onOpenChange={setShowCreateDialog}
        createForm={createForm} setCreateForm={setCreateForm}
        createItems={createItems} setCreateItems={setCreateItems}
        createViolations={createViolations} setCreateViolations={setCreateViolations}
        projects={projects} isPending={createMutation.isPending}
        onSubmit={handleCreateSubmit}
        onCancel={() => { setShowCreateDialog(false); resetCreateForm(); }}
      />

      {/* Detail Dialog */}
      <SupervisionDetail
        ar={ar} viewChecklist={viewChecklist} onClose={() => setViewChecklist(null)}
        onSubmit={(id) => updateChecklistMutation.mutate({ id, data: { status: "SUBMITTED" } })}
        onApprove={(id) => updateChecklistMutation.mutate({ id, data: { status: "APPROVED" } })}
      />
    </div>
  );
}
