"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Gavel, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";

import type { BidItem, ContractorFull, ProjectOption } from "./bids/types";
import { SummaryCards } from "./bids/summary-cards";
import { BidsTable } from "./bids/bids-table";
import { BidDetailPanel } from "./bids/bid-detail-panel";
import { EvaluationDialog } from "./bids/evaluation-dialog";
import { ContractorsTab } from "./bids/contractors-tab";
import { ContractorDetailPanel } from "./bids/contractor-detail-panel";
import { ComparisonMatrix } from "./bids/comparison-matrix";
import { AddBidDialog, type BidFormData } from "./bids/add-bid-dialog";

// ===== Main Component =====
interface BidsPageProps { language: "ar" | "en"; projectId?: string; }

export default function BidsPage({ language, projectId }: BidsPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showDetail, setShowDetail] = useState<BidItem | null>(null);
  const [activeTab, setActiveTab] = useState("bids");
  const [evaluateBid, setEvaluateBid] = useState<BidItem | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [_contractorSearch, _setContractorSearch] = useState("");

  const emptyForm: BidFormData = {
    projectId: projectId || "", contractorName: "", contractorContact: "",
    amount: "", notes: "", status: "SUBMITTED" as string, contractorId: "", deadline: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch bids
  const { data: bids = [], isLoading } = useQuery<BidItem[]>({
    queryKey: ["bids", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/bids${projectId ? `?projectId=${projectId}` : ''}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json(); return json.data || json;
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => { const res = await fetch("/api/projects-simple"); if (!res.ok) return []; const json = await res.json(); return json.data || json; },
  });

  // Fetch contractors for dropdown in bid form
  const { data: contractorsList = [] } = useQuery<ContractorFull[]>({
    queryKey: ["contractors-list"],
    queryFn: async () => { const res = await fetch("/api/contractors"); if (!res.ok) return []; const json = await res.json(); return json.data || json; },
  });

  // Create
  const createMutation = useMutation({
    mutationFn: async (data: BidFormData) => {
      const res = await fetch("/api/bids", {
        method: "POST", headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setShowDialog(false); setFormData(emptyForm); },
  });

  // Update status
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/bids/${id}`, {
        method: "PUT", headers: getMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/bids/${id}`, { method: "DELETE", headers: getMutationHeaders() }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bids"] }); setShowDetail(null); },
  });

  // Filter
  const filtered = bids.filter((b) => {
    const matchSearch =
      b.contractorName.toLowerCase().includes(search.toLowerCase()) ||
      (ar ? b.project.name : b.project.nameEn || b.project.name).toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Summary
  const wonCount = filtered.filter((b) => b.status === "ACCEPTED").length;
  const lostCount = filtered.filter((b) => b.status === "REJECTED").length;
  const winRate = filtered.length > 0 ? ((wonCount / filtered.length) * 100).toFixed(1) : "0";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="py-0 gap-0"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Gavel className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "العطاءات والمقاولين" : "Bids & Contractors"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {bids.length} {ar ? "عطاء" : "bids"} • {contractorsList.length} {ar ? "مقاول" : "contractors"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => { setFormData(emptyForm); setShowDialog(true); }}>
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "عطاء جديد" : "New Bid"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        ar={ar}
        totalBids={filtered.length}
        wonCount={wonCount}
        lostCount={lostCount}
        winRate={winRate}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setShowDetail(null); setSelectedContractorId(null); }}>
        <TabsList className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1 h-auto">
          <TabsTrigger
            value="bids"
            className={cn(
              "text-xs rounded-md px-4 py-2 transition-all",
              activeTab === "bids" && "bg-white dark:bg-slate-900 shadow-sm text-teal-600 dark:text-teal-400"
            )}
          >
            <Gavel className="h-3.5 w-3.5 me-1.5" />
            {ar ? "العطاءات" : "Bids"}
          </TabsTrigger>
          <TabsTrigger
            value="contractors"
            className={cn(
              "text-xs rounded-md px-4 py-2 transition-all",
              activeTab === "contractors" && "bg-white dark:bg-slate-900 shadow-sm text-teal-600 dark:text-teal-400"
            )}
          >
            <Users className="h-3.5 w-3.5 me-1.5" />
            {ar ? "المقاولين" : "Contractors"}
          </TabsTrigger>
          <TabsTrigger
            value="matrix"
            className={cn(
              "text-xs rounded-md px-4 py-2 transition-all",
              activeTab === "matrix" && "bg-white dark:bg-slate-900 shadow-sm text-teal-600 dark:text-teal-400"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5 me-1.5" />
            {ar ? "مصفوفة المقارنة" : "Comparison Matrix"}
          </TabsTrigger>
        </TabsList>

        {/* Bids Tab */}
        <TabsContent value="bids" className="mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "بحث..." : "Search..."} className="ps-9 h-8 text-sm rounded-lg" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
                <SelectItem value="SUBMITTED">{ar ? "مقدم" : "Submitted"}</SelectItem>
                <SelectItem value="UNDER_REVIEW">{ar ? "قيد المراجعة" : "Under Review"}</SelectItem>
                <SelectItem value="ACCEPTED">{ar ? "مقبول" : "Accepted"}</SelectItem>
                <SelectItem value="REJECTED">{ar ? "مرفوض" : "Rejected"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4">
            <BidsTable
              ar={ar}
              filtered={filtered}
              showDetailId={showDetail?.id ?? null}
              onShowDetail={(bid) => setShowDetail(bid)}
              onEvaluateBid={(bid) => setEvaluateBid(bid)}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
            />
            {showDetail && (
              <BidDetailPanel
                bid={showDetail}
                ar={ar}
                onClose={() => setShowDetail(null)}
                onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
                onEvaluateBid={(bid) => setEvaluateBid(bid)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}
          </div>
        </TabsContent>

        {/* Contractors Tab */}
        <TabsContent value="contractors" className="mt-4">
          <div className="flex gap-4">
            <div className={`flex-1 ${selectedContractorId ? "hidden lg:block" : ""}`}>
              <ContractorsTab
                ar={ar}
                projectId={projectId}
                onSelectContractor={(c) => setSelectedContractorId(c.id)}
              />
            </div>
            {selectedContractorId && (
              <ContractorDetailPanel
                contractorId={selectedContractorId}
                ar={ar}
                onClose={() => setSelectedContractorId(null)}
              />
            )}
          </div>
        </TabsContent>

        {/* Comparison Matrix Tab */}
        <TabsContent value="matrix" className="mt-4">
          <ComparisonMatrix bids={projectId ? filtered : bids} ar={ar} />
        </TabsContent>
      </Tabs>

      {/* Add Bid Dialog */}
      <AddBidDialog
        ar={ar}
        open={showDialog}
        onOpenChange={setShowDialog}
        formData={formData}
        onFormDataChange={setFormData}
        emptyForm={emptyForm}
        projects={projects}
        contractorsList={contractorsList}
        onSubmit={() => createMutation.mutate(formData)}
        isPending={createMutation.isPending}
      />

      {/* Evaluation Dialog */}
      {evaluateBid && (
        <EvaluationDialog
          bid={evaluateBid}
          ar={ar}
          open={!!evaluateBid}
          onClose={() => setEvaluateBid(null)}
        />
      )}
    </div>
  );
}
