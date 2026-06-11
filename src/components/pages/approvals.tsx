"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Skeleton } from "@/components/ui/skeleton";
import { getMutationHeaders } from "@/lib/csrf-client";
import { useAuthStore } from "@/store/auth-store";

// Sub-components
import { ApprovalHeader } from "./approvals/approval-header";
import { SummaryCards } from "./approvals/summary-cards";
import { StatusFilterTabs } from "./approvals/status-filter-tabs";
import { FilterRow } from "./approvals/filter-row";
import { ApprovalCardList } from "./approvals/approval-card-list";
import { CreateApprovalDialog } from "./approvals/create-approval-dialog";
import { ApprovalDetailPanel } from "./approvals/approval-detail-panel";

// Shared types, helpers, constants
import type { EntityItem, Approval, StatusFilterTab, EntityFilter, DateFilter, CreateFormState } from "./approvals/types";
import { getDateThreshold } from "./approvals/helpers";

// ===== Main Component =====
interface ApprovalsPageProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function ApprovalsPage({ language, projectId }: ApprovalsPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });

  // Filter states
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusFilterTab>("all");
  const [activeEntityFilter, setActiveEntityFilter] = useState<EntityFilter>("all");
  const [activeDateFilter, setActiveDateFilter] = useState<DateFilter>("all");

  // UI states
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [requestInfoId, setRequestInfoId] = useState<string | null>(null);
  const [requestInfoText, setRequestInfoText] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateFormState>({
    entityType: "",
    entityId: "",
    title: "",
    description: "",
    assignedTo: "",
    totalSteps: "1",
    amount: "",
    priority: "NORMAL",
  });

  // ===== Entity Picker: fetch invoices / payments / change-orders =====
  const { data: entityInvoices = [] } = useQuery<EntityItem[]>({
    queryKey: ["approval-entity-invoices", projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((inv: { id: string; number: string; total: number; status: string; client: { name: string } }) => ({
        id: inv.id,
        title: `${inv.number || inv.id}${inv.client?.name ? ` - ${inv.client.name}` : ""}`,
        amount: inv.total,
        status: inv.status,
      }));
    },
    enabled: createForm.entityType === "invoice" && showCreateDialog,
  });

  const { data: entityPayments = [] } = useQuery<EntityItem[]>({
    queryKey: ["approval-entity-payments", projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/payments?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((pay: { id: string; referenceNumber: string; amount: number; status: string; description: string }) => ({
        id: pay.id,
        title: pay.referenceNumber || pay.description || pay.id,
        amount: pay.amount,
        status: pay.status,
      }));
    },
    enabled: createForm.entityType === "payment" && showCreateDialog,
  });

  const { data: entityChangeOrders = [] } = useQuery<EntityItem[]>({
    queryKey: ["approval-entity-change-orders", projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/change-orders?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((co: { id: string; title: string; amount: number; status: string }) => ({
        id: co.id,
        title: co.title || co.id,
        amount: co.amount,
        status: co.status,
      }));
    },
    enabled: createForm.entityType === "change_order" && showCreateDialog,
  });

  // Pick the right entity list based on entity type
  const entityList: EntityItem[] = createForm.entityType === "invoice"
    ? entityInvoices
    : createForm.entityType === "payment"
      ? entityPayments
      : createForm.entityType === "change_order"
        ? entityChangeOrders
        : [];

  const handleEntitySelect = (entityId: string) => {
    const entity = entityList.find((e) => e.id === entityId);
    setCreateForm((prev) => ({
      ...prev,
      entityId: entityId,
      title: entity?.title || prev.title,
      amount: entity?.amount ? String(entity.amount) : prev.amount,
    }));
  };

  // Fetch pending count
  const { data: pendingData } = useQuery({
    queryKey: ["approvals-pending-count"],
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending");
      if (!res.ok) return { count: 0 };
      const json = await res.json(); return json.data || json;
    },
    refetchInterval: 30000,
  });
  const pendingCount = pendingData?.count ?? 0;

  // Fetch all approvals (client-side filtering)
  const { data: approvals = [], isLoading } = useQuery<Approval[]>({
    queryKey: ["approvals", projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/approvals${params.toString() ? `?${params.toString()}` : ""}`);
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  // Fetch single approval for detail panel
  const { data: selectedApproval } = useQuery<Approval>({
    queryKey: ["approval-detail", selectedApprovalId],
    queryFn: async () => {
      if (!selectedApprovalId) return null;
      const res = await fetch(`/api/approvals/${selectedApprovalId}`);
      if (!res.ok) return null;
      const json = await res.json(); return json.data || json;
    },
    enabled: !!selectedApprovalId,
  });

  // Fetch linked entity details for the selected approval
  const { data: linkedEntity } = useQuery({
    queryKey: ["approval-entity", selectedApproval?.entityType, selectedApproval?.entityId],
    queryFn: async () => {
      if (!selectedApproval?.entityId || !selectedApproval?.entityType) return null;
      const type = selectedApproval.entityType;
      let url = "";
      if (type === "invoice") url = `/api/invoices/${selectedApproval.entityId}`;
      else if (type === "payment") url = `/api/payments/${selectedApproval.entityId}`;
      else if (type === "change_order") url = `/api/change-orders/${selectedApproval.entityId}`;
      else return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = await res.json(); return json.data || json;
      } catch { return null; }
    },
    enabled: !!selectedApproval?.entityId && !!selectedApproval?.entityType,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status: "APPROVED", notes }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvals-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["approval-detail"] });
      toast.showSuccess(ar ? "تمت الموافقة" : "Approved");
    },
    onError: () => toast.error(ar ? "الموافقة" : "Approve"),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status: "REJECTED", notes }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvals-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["approval-detail"] });
      setRejectingId(null);
      setRejectReason("");
      toast.showSuccess(ar ? "تم الرفض" : "Rejected");
    },
    onError: () => toast.error(ar ? "الرفض" : "Reject"),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateFormState) => {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          entityType: data.entityType,
          entityId: data.entityId || "new",
          title: data.title,
          description: data.description,
          requestedBy: useAuthStore.getState()?.user?.name || (ar ? "المستخدم الحالي" : "Current User"),
          assignedTo: data.assignedTo,
          totalSteps: parseInt(data.totalSteps) || 1,
          step: 1,
          amount: parseFloat(data.amount) || 0,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      queryClient.invalidateQueries({ queryKey: ["approvals-pending-count"] });
      setShowCreateDialog(false);
      setCreateForm({
        entityType: "",
        entityId: "",
        title: "",
        description: "",
        assignedTo: "",
        totalSteps: "1",
        amount: "",
        priority: "NORMAL",
      });
      toast.created(ar ? "طلب موافقة" : "Approval request");
    },
    onError: () => toast.error(ar ? "إنشاء طلب الموافقة" : "Create approval request"),
  });

  // ===== Computed values =====
  const dateThreshold = getDateThreshold(activeDateFilter);

  const filteredApprovals = useMemo(() => {
    let result = approvals;

    // Status filter
    if (activeStatusFilter !== "all") {
      result = result.filter((a) => a.status === activeStatusFilter);
    }

    // Entity type filter
    if (activeEntityFilter !== "all") {
      result = result.filter((a) => a.entityType === activeEntityFilter);
    }

    // Date filter
    if (dateThreshold) {
      result = result.filter((a) => new Date(a.createdAt).getTime() >= dateThreshold);
    }

    return result;
  }, [approvals, activeStatusFilter, activeEntityFilter, dateThreshold]);

  // Summary stats
  const totalCount = approvals.length;
  const pendingItems = approvals.filter((a) => a.status === "PENDING");
  const approvedItems = approvals.filter((a) => a.status === "APPROVED");
  const rejectedItems = approvals.filter((a) => a.status === "REJECTED");

  // This month approved
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const approvedThisMonth = approvedItems.filter((a) => new Date(a.updatedAt).getTime() >= monthStart);

  // Status counts for filter tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: totalCount, PENDING: pendingItems.length, APPROVED: approvedItems.length, REJECTED: rejectedItems.length, CANCELLED: approvals.filter((a) => a.status === "CANCELLED").length };
    return counts;
  }, [totalCount, pendingItems.length, approvedItems.length, rejectedItems.length, approvals]);

  // ===== Handlers =====
  const handleApprove = (id: string) => {
    approveMutation.mutate({ id });
  };

  const handleReject = (id: string, notes: string) => {
    rejectMutation.mutate({ id, notes });
  };

  const handleRequestInfoSubmit = (id: string, notes: string) => {
    approveMutation.mutate({ id, notes });
    setRequestInfoId(null);
    setRequestInfoText("");
  };

  // ===== Loading State =====
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ===== HEADER SECTION ===== */}
      <ApprovalHeader
        ar={ar}
        totalCount={totalCount}
        pendingCount={pendingCount}
        onNewClick={() => setShowCreateDialog(true)}
      />

      {/* ===== SUMMARY STAT CARDS ===== */}
      <SummaryCards
        ar={ar}
        totalCount={totalCount}
        pendingCount={pendingCount}
        approvedThisMonthCount={approvedThisMonth.length}
        rejectedCount={rejectedItems.length}
      />

      {/* ===== STATUS FILTER TABS ===== */}
      <StatusFilterTabs
        ar={ar}
        activeStatusFilter={activeStatusFilter}
        setActiveStatusFilter={setActiveStatusFilter}
        statusCounts={statusCounts}
        pendingCount={pendingCount}
      />

      {/* ===== FILTER ROW ===== */}
      <FilterRow
        ar={ar}
        activeEntityFilter={activeEntityFilter}
        setActiveEntityFilter={setActiveEntityFilter}
        activeDateFilter={activeDateFilter}
        setActiveDateFilter={setActiveDateFilter}
      />

      {/* ===== APPROVAL CARDS LIST ===== */}
      <ApprovalCardList
        ar={ar}
        filteredApprovals={filteredApprovals}
        rejectingId={rejectingId}
        rejectReason={rejectReason}
        requestInfoId={requestInfoId}
        requestInfoText={requestInfoText}
        approveMutationIsPending={approveMutation.isPending}
        rejectMutationIsPending={rejectMutation.isPending}
        onApprove={handleApprove}
        onReject={handleReject}
        setRejectingId={setRejectingId}
        setRejectReason={setRejectReason}
        setRequestInfoId={setRequestInfoId}
        setRequestInfoText={setRequestInfoText}
        setSelectedApprovalId={setSelectedApprovalId}
        onNewClick={() => setShowCreateDialog(true)}
        onRequestInfoSubmit={handleRequestInfoSubmit}
      />

      {/* ===== CREATE APPROVAL DIALOG ===== */}
      <CreateApprovalDialog
        ar={ar}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        createForm={createForm}
        setCreateForm={setCreateForm}
        onCreate={(form) => createMutation.mutate(form)}
        createMutationIsPending={createMutation.isPending}
        entityList={entityList}
        handleEntitySelect={handleEntitySelect}
      />

      {/* ===== APPROVAL DETAIL PANEL ===== */}
      <ApprovalDetailPanel
        ar={ar}
        selectedApprovalId={selectedApprovalId}
        setSelectedApprovalId={setSelectedApprovalId}
        selectedApproval={selectedApproval}
        linkedEntity={linkedEntity}
      />
    </div>
  );
}
