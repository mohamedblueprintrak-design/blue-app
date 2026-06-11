"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectSchema, type ProjectFormData } from "@/lib/validations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";
import { getMutationHeaders } from "@/lib/csrf-client";
import { extractErrorMessage } from "@/lib/api/fetch-client";
import type { ProjectRow } from "./types";
import { MAX_COMPARE } from "./types";
import { ProjectHeader } from "./project-header";
import { ProjectFilters } from "./project-filters";
import { ProjectTableView } from "./project-table-view";
import { ProjectGridView } from "./project-grid-view";
import { ProjectCountBar } from "./project-count-bar";
import { FloatingCompareButton } from "./floating-compare-button";
import { CompareDialog } from "./compare-dialog";
import { AddProjectDialog } from "./add-project-dialog";
import { ToastAction } from "@/components/ui/toast";
import { BulkActionBar } from "@/components/common/bulk-action-bar";

// ===== MAIN COMPONENT =====
interface ProjectsListProps {
  language: "ar" | "en";
}

export default function ProjectsList({ language }: ProjectsListProps) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const { user } = useAuthStore();
  const { setCurrentProjectId, setCurrentPage, setCurrentProjectTab } = useNavStore();
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar: isAr });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<Set<string>>(new Set());
  const deleteTimeouts = useRef<NodeJS.Timeout[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [_quickViewProject, setQuickViewProject] = useState<ProjectRow | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const currentTimeouts = deleteTimeouts.current;
    return () => {
      currentTimeouts.forEach(clearTimeout);
    };
  }, []);
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as Resolver<ProjectFormData>,
    defaultValues: {
      number: "",
      name: "",
      nameEn: "",
      clientId: "",
      contractorId: "",
      location: "",
      plotNumber: "",
      type: "VILLA",
      budget: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  });

  // Fetch projects
  const { data, isLoading } = useQuery({
    queryKey: ["projects", search, statusFilter, typeFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      params.set("page", page.toString());
      params.set("limit", PAGE_SIZE.toString());
      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ["clients-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json;
    },
  });

  // Fetch contractors for dropdown
  const { data: contractorsData } = useQuery({
    queryKey: ["contractors-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/contractors");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ ...data, createdById: user?.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(extractErrorMessage(err.error, "Failed to create project"));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowAddDialog(false);
      localStorage.removeItem("draft_project_form");
      toast.showSuccess(isAr ? "تم إضافة المشروع بنجاح" : "Project added successfully");
      form.reset();
    },
    onError: (error: Error) => {
      toast.showError(isAr ? `فشل في إنشاء المشروع: ${error.message}` : `Failed to create project: ${error.message}`);
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        headers: getMutationHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const rawProjects: ProjectRow[] = Array.isArray(data?.projects) ? data.projects : [];
  const projects = rawProjects.filter(p => !optimisticDeletedIds.has(p.id));
  const totalPages = data?.pagination?.totalPages || 1;
  const allProjectsCount = data?.pagination?.total || 0;

  // Auto-save draft logic
  useEffect(() => {
    if (showAddDialog) {
      // eslint-disable-next-line
      const subscription = form.watch((value) => {
        const timeout = setTimeout(() => {
          localStorage.setItem("draft_project_form", JSON.stringify(value));
        }, 1000);
        return () => clearTimeout(timeout);
      });
      return () => subscription.unsubscribe();
    }
  }, [showAddDialog, form]);

  const handleRowClick = (projectId: string) => {
    setCurrentProjectId(projectId);
    setCurrentPage("projects");
    setCurrentProjectTab("overview");
  };

  const onSubmit = (data: ProjectFormData) => {
    createMutation.mutate({
      ...data,
      budget: data.budget ? parseFloat(data.budget) : 0,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      latitude: mapLocation?.lat ?? null,
      longitude: mapLocation?.lng ?? null,
    });
  };

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === projects.length && projects.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map((p: ProjectRow) => p.id)));
    }
  }, [selectedIds.size, projects]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedProjects = useMemo(
    () => projects.filter((p: ProjectRow) => selectedIds.has(p.id)),
    [projects, selectedIds]
  );

  const compareProjects = selectedProjects.slice(0, MAX_COMPARE);

  const handleBulkDelete = () => {
    const idsToDelete = Array.from(selectedIds);
    setOptimisticDeletedIds(prev => new Set([...prev, ...idsToDelete]));
    setSelectedIds(new Set());
    let isUndone = false;
    
    toast.toast({
      title: isAr ? "تم الحذف مؤقتاً" : "Deleted temporarily",
      description: isAr ? `تم إخفاء ${idsToDelete.length > 1 ? idsToDelete.length + ' مشاريع' : 'المشروع'}` : `Hidden ${idsToDelete.length} item(s)`,
      action: (
        <ToastAction altText="Undo" onClick={() => {
           isUndone = true;
           setOptimisticDeletedIds(prev => {
             const next = new Set(prev);
             idsToDelete.forEach(id => next.delete(id));
             return next;
           });
        }}>
          {isAr ? "تراجع" : "Undo"}
        </ToastAction>
      ),
      duration: 5000,
    });
    
    const timeoutId = setTimeout(() => {
       if (!isUndone) {
          idsToDelete.forEach(id => deleteMutation.mutate(id));
       }
    }, 5000);
    deleteTimeouts.current.push(timeoutId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <ProjectHeader
        isAr={isAr}
        t={t}
        allProjectsCount={allProjectsCount}
        selectedIdsSize={selectedIds.size}
        projects={projects}
        onShowCompare={() => setShowCompare(true)}
        onShowAddDialog={() => {
          form.reset();
          const draft = localStorage.getItem("draft_project_form");
          if (draft) {
            try {
              const parsed = JSON.parse(draft);
              Object.keys(parsed).forEach(k => {
                form.setValue(k as keyof ProjectFormData, parsed[k]);
              });
              toast.showSuccess(isAr ? "تم استعادة المسودة بنجاح" : "Draft restored successfully");
            } catch (_e) { /* intentional */ }
          }
          setShowAddDialog(true);
        }}
      />

      {/* Filters */}
      <ProjectFilters
        isAr={isAr}
        t={t}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
        typeFilter={typeFilter}
        onTypeFilterChange={(v) => { setTypeFilter(v); setPage(1); }}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Table / Grid View */}
      {viewMode === "table" ? (
        <ProjectTableView
          isAr={isAr}
          t={t}
          projects={projects}
          isLoading={isLoading}
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            });
          }}
          onToggleSelectAll={toggleSelectAll}
          onRowClick={handleRowClick}
          onQuickView={setQuickViewProject}
          page={page}
          totalPages={totalPages}
          allProjectsCount={allProjectsCount}
          PAGE_SIZE={PAGE_SIZE}
          onPageChange={setPage}
        />
      ) : (
        <ProjectGridView
          isAr={isAr}
          t={t}
          projects={projects}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      )}

      {/* Count */}
      <ProjectCountBar
        isAr={isAr}
        t={t}
        allProjectsCount={allProjectsCount}
        selectedIdsSize={selectedIds.size}
        onClearSelection={clearSelection}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        ar={isAr}
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onDeleteSelected={handleBulkDelete}
      />

      {/* Floating Compare Button */}
      {selectedIds.size > 0 && selectedIds.size <= MAX_COMPARE && (
        <FloatingCompareButton
          isAr={isAr}
          t={t}
          selectedIdsSize={selectedIds.size}
          onShowCompare={() => setShowCompare(true)}
        />
      )}

      {/* Project Comparison Dialog */}
      <CompareDialog
        isAr={isAr}
        t={t}
        open={showCompare}
        onOpenChange={setShowCompare}
        compareProjects={compareProjects}
      />

      {/* Add Project Dialog */}
      <AddProjectDialog
        isAr={isAr}
        t={t}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        form={form}
        mapLocation={mapLocation}
        onMapLocationChange={setMapLocation}
        onSubmit={onSubmit}
        createMutationPending={createMutation.isPending}
        clientsData={clientsData || []}
        contractorsData={contractorsData || []}
      />
    </div>
  );
}
