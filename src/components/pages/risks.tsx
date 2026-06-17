"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ShieldAlert, Filter } from "lucide-react";
import { getMutationHeaders } from "@/lib/csrf-client";
import { categories } from "./risks/constants";
import { RiskStats } from "./risks/risk-stats";
import { RiskMatrix } from "./risks/risk-matrix";
import { RiskTable } from "./risks/risk-table";
import { RiskFormDialog } from "./risks/risk-form-dialog";
import { RiskDetailDialog } from "./risks/risk-detail-dialog";
import type { RiskItem, ProjectOption, UserOption, RiskFormData, NewAction } from "./risks/types";

interface RisksProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function Risks({ language, projectId }: RisksProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskItem | null>(null);
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch risks
  const { data: risks = [], isLoading } = useQuery<RiskItem[]>({
    queryKey: ["risks", filterProject, filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      const res = await fetch(`/api/risks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch risks");
      const json = await res.json(); return json.data || json;
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  // Fetch users
  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-simple"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/risks", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create risk");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/risks/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
    },
  });

  // Toggle action completion mutation
  const toggleActionMutation = useMutation({
    mutationFn: async ({ actionId, completed }: { actionId: string; completed: boolean }) => {
      const res = await fetch(`/api/risks/actions/${actionId}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update action");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/risks/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update risk");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risks"] });
    },
  });

  const [formData, setFormData] = useState<RiskFormData>({
    projectId: projectId || "",
    title: "",
    category: "TECHNICAL",
    probability: 3,
    impact: 3,
    mitigationPlan: "",
    strategy: "MITIGATE",
    assigneeId: "",
  });

  const [newActions, setNewActions] = useState<NewAction[]>([]);

  const resetForm = () => {
    setFormData({
      projectId: projectId || (filterProject !== "all" ? filterProject : ""),
      title: "",
      category: "TECHNICAL",
      probability: 3,
      impact: 3,
      mitigationPlan: "",
      strategy: "MITIGATE",
      assigneeId: "",
    });
    setNewActions([]);
  };

  // Filter risks by category on client side
  const filteredRisks = filterCategory === "all"
    ? risks
    : risks.filter((r) => r.category === filterCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {ar ? "إدارة المخاطر" : "Risk Management"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ar ? `إجمالي ${risks.length} خطر` : `${risks.length} total risks`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={ar ? "المشروع" : "Project"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع المشاريع" : "All Projects"}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {ar ? p.name : p.nameEn || p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder={ar ? "التصنيف" : "Category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>{ar ? c.ar : c.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {ar ? "خطر جديد" : "New Risk"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <RiskStats ar={ar} risks={risks} />

      {/* Risk Matrix */}
      <RiskMatrix
        ar={ar}
        risks={risks}
        onSelectRisk={(risk) => {
          setSelectedRisk(risk);
          setShowDetailDialog(true);
        }}
      />

      {/* Risk Table */}
      <RiskTable
        ar={ar}
        isLoading={isLoading}
        filteredRisks={filteredRisks}
        onSelectRisk={(risk) => {
          setSelectedRisk(risk);
          setShowDetailDialog(true);
        }}
        onDeleteRisk={(id) => deleteMutation.mutate(id)}
        onUpdateStatus={updateStatusMutation.mutate}
      />

      {/* Add Dialog */}
      <RiskFormDialog
        ar={ar}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        formData={formData}
        setFormData={setFormData}
        newActions={newActions}
        setNewActions={setNewActions}
        projects={projects}
        users={users}
        createMutation={createMutation}
        resetForm={resetForm}
      />

      {/* Detail Dialog */}
      <RiskDetailDialog
        ar={ar}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        selectedRisk={selectedRisk}
        toggleActionMutation={toggleActionMutation}
      />
    </div>
  );
}
