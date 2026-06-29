"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { useLang } from "@/hooks/use-lang";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getMutationHeaders } from "@/lib/csrf-client";
import { TenderItem, TenderDetail, TendersResponse, TenderFormData, TendersPageProps, emptyForm } from "./types";
import { TenderFilters } from "./tender-filters";
import { TenderStats } from "./tender-stats";
import { TenderTable } from "./tender-table";
import { TenderForm } from "./tender-form";
import { TenderDetailPanel } from "./tender-detail";

export default function TendersPage({ language: _language }: TendersPageProps) {
  const tAuto = useTranslations();
  const lang = useLang();
  const isAr = lang === "ar";

  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar: isAr });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAuthority, setFilterAuthority] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editTender, setEditTender] = useState<TenderItem | null>(null);
  const [selectedTender, setSelectedTender] = useState<TenderItem | null>(null);
  const [formData, setFormData] = useState<TenderFormData>(emptyForm);

  // Fetch tenders
  const { data, isLoading } = useQuery<TendersResponse>({
    queryKey: ["tenders", filterStatus, filterAuthority, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);
      if (filterAuthority && filterAuthority !== "all") params.set("authority", filterAuthority);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/tenders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch tenders");
      const json = await res.json(); return json.data || json;
    },
  });

  const tenders = data?.data || [];
  const total = data?.pagination?.total || 0;

  // Fetch tender detail
  const { data: tenderDetail } = useQuery<TenderDetail>({
    queryKey: ["tender-detail", selectedTender?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tenders/${selectedTender!.id}`);
      if (!res.ok) throw new Error("Failed to fetch tender detail");
      const json = await res.json(); return json.data || json;
    },
    enabled: !!selectedTender,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: TenderFormData) => {
      const res = await fetch("/api/tenders", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create tender");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      setShowAddDialog(false);
      setFormData(emptyForm);
      toast.created(tAuto('auto.tender'));
    },
    onError: () => {
      toast.error(tAuto('auto.createTender'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TenderFormData }) => {
      const res = await fetch(`/api/tenders/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update tender");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      queryClient.invalidateQueries({ queryKey: ["tender-detail"] });
      setEditTender(null);
      setFormData(emptyForm);
      toast.updated(tAuto('auto.tender'));
    },
    onError: () => {
      toast.error(tAuto('auto.updateTender'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/tenders/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenders"] });
      setSelectedTender(null);
      toast.deleted(tAuto('auto.tender'));
    },
    onError: () => {
      toast.error(tAuto('auto.deleteTender'));
    },
  });

  // Handlers
  const openEditDialog = (tender: TenderItem) => {
    setEditTender(tender);
    setFormData({
      tenderNumber: tender.tenderNumber,
      title: tender.title,
      authority: tender.authority,
      projectType: tender.projectType,
      description: tender.description,
      estimatedBudget: String(tender.estimatedBudget),
      currency: tender.currency,
      closingDate: tender.closingDate ? tender.closingDate.split("T")[0] : "",
      submissionDate: tender.submissionDate ? tender.submissionDate.split("T")[0] : "",
      qualifications: tender.qualifications,
      requiredDocs: tender.requiredDocs,
      status: tender.status,
      winnerName: tender.winnerName,
      lostReason: tender.lostReason,
      competitorAnalysis: tender.competitorAnalysis,
      notes: tender.notes,
      source: tender.source,
      sourceUrl: tender.sourceUrl,
      assignedTo: tender.assignedTo || "",
    });
  };

  const openAddDialog = () => {
    setFormData(emptyForm);
    setEditTender(null);
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.title.trim()) return;
    if (editTender) {
      updateMutation.mutate({ id: editTender.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancelForm = () => {
    setShowAddDialog(false);
    setEditTender(null);
    setFormData(emptyForm);
  };

  const handleDeleteTender = (tender: TenderItem) => {
    if (confirm(isAr ? `حذف المناقصة "${tender.title}"؟` : `Delete "${tender.title}"?`)) {
      deleteMutation.mutate(tender.id);
    }
  };

  // Statistics
  const totalCount = tenders.length;
  const preparingCount = tenders.filter((t) => t.status === "PREPARING" || t.status === "SUBMITTED" || t.status === "IDENTIFIED").length;
  const wonCount = tenders.filter((t) => t.status === "WON").length;
  const lostCount = tenders.filter((t) => t.status === "LOST").length;
  const wonBudget = tenders.filter((t) => t.status === "WON").reduce((sum, t) => sum + t.estimatedBudget, 0);

  return (
    <div className="space-y-4">
      {/* Filters & Header */}
      <TenderFilters
        search={search}
        onSearchChange={setSearch}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterAuthority={filterAuthority}
        onFilterAuthorityChange={setFilterAuthority}
        total={total}
        isAr={isAr}
        onAddClick={openAddDialog}
      />

      {/* Statistics Cards */}
      <TenderStats
        totalCount={totalCount}
        total={total}
        preparingCount={preparingCount}
        wonCount={wonCount}
        lostCount={lostCount}
        wonBudget={wonBudget}
        isLoading={isLoading}
        isAr={isAr}
      />

      <div className="flex gap-4">
        {/* Table */}
        <TenderTable
          tenders={tenders}
          isLoading={isLoading}
          isAr={isAr}
          selectedTenderId={selectedTender?.id ?? null}
          onSelectTender={setSelectedTender}
          onEditTender={openEditDialog}
          onDeleteTender={handleDeleteTender}
          onAddClick={openAddDialog}
          hasSelectedTender={!!selectedTender}
        />

        {/* Detail Panel */}
        {selectedTender && tenderDetail && (
          <TenderDetailPanel
            tender={tenderDetail}
            ar={isAr}
            onClose={() => setSelectedTender(null)}
            onEdit={() => openEditDialog(selectedTender)}
          />
        )}
      </div>

      {/* Add/Edit Dialog */}
      <TenderForm
        open={showAddDialog || !!editTender}
        editTender={editTender}
        formData={formData}
        isAr={isAr}
        isPending={createMutation.isPending || updateMutation.isPending}
        onFormDataChange={setFormData}
        onSave={handleSave}
        onCancel={handleCancelForm}
      />
    </div>
  );
}
