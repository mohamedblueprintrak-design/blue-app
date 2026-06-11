"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users } from "lucide-react";
import { getMutationHeaders } from "@/lib/csrf-client";
import type { ContractorItem, ContractorDetail } from "./types";
import { emptyForm } from "./types";
import { ContractorCreateForm } from "./contractor-create-form";
import { RFQsView } from "./contractor-rfqs-view";
import { ContractorSummaryCards } from "./contractor-summary-cards";
import { ContractorGrid } from "./contractor-grid";
import { ContractorDetailPanel } from "./contractor-detail-panel";
import { ContractorEditDialog } from "./contractor-edit-dialog";

// ===== Main Component =====
interface ContractorsPageProps { language: "ar" | "en"; projectId?: string; initialTab?: "list" | "create" | "rfqs"; }

export default function ContractorsPage({ language, projectId, initialTab }: ContractorsPageProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [activeView, setActiveView] = useState<"list" | "create" | "rfqs">(initialTab || "list");

  const isEditing = !!editingId;

  // Fetch contractors
  const { data: contractorsData = [], isLoading } = useQuery<ContractorItem[]>({
    queryKey: ["contractors-page", projectId, search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (search) params.set("search", search);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/contractors?${params.toString()}`);
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });
  const contractors = useMemo(() => Array.isArray(contractorsData) ? contractorsData : [], [contractorsData]);

  // Fetch selected contractor detail
  const { data: detail } = useQuery<ContractorDetail>({
    queryKey: ["contractor-detail-page", selectedContractor],
    queryFn: async () => {
      const res = await fetch(`/api/contractors/${selectedContractor}`);
      if (!res.ok) throw new Error("Failed");
      const json = await res.json(); return json.data || json;
    },
    enabled: !!selectedContractor,
  });

  // Create / Update
  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      if (editingId) {
        const res = await fetch(`/api/contractors/${editingId}`, {
          method: "PUT",
          headers: getMutationHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      } else {
        const res = await fetch("/api/contractors", {
          method: "POST",
          headers: getMutationHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed");
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors-page"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-detail-page"] });
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setShowDialog(false);
      setEditingId(null);
      setFormData(emptyForm);
      if (activeView === "create") {
        setActiveView("list");
      }
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/contractors/${id}`, { method: "DELETE", headers: getMutationHeaders() }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors-page"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-detail-page"] });
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setSelectedContractor(null);
    },
  });

  // ===== Full-Page Create View =====
  if (activeView === "create" && !isEditing) {
    return (
      <ContractorCreateForm
        ar={ar}
        formData={formData}
        setFormData={setFormData}
        saveMutation={saveMutation}
        onCancel={() => { setFormData(emptyForm); setActiveView("list"); }}
      />
    );
  }

  // ===== RFQs View =====
  if (activeView === "rfqs") {
    return (
      <RFQsView ar={ar} contractors={contractors} onBack={() => setActiveView("list")} projectId={projectId} />
    );
  }

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
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Users className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "المقاولين" : "Contractors"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {contractors.length} {ar ? "مقاول" : "contractors"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={ar ? "بحث..." : "Search..."}
              className="ps-9 h-8 text-sm rounded-lg"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="CIVIL">{ar ? "أشغال مدنية" : "Civil"}</SelectItem>
              <SelectItem value="ELECTRICAL">{ar ? "كهرباء" : "Electrical"}</SelectItem>
              <SelectItem value="MEP">MEP</SelectItem>
              <SelectItem value="FINISHING">{ar ? "تشطيبات" : "Finishing"}</SelectItem>
              <SelectItem value="PLUMBING">{ar ? "سباكة" : "Plumbing"}</SelectItem>
              <SelectItem value="HVAC">{ar ? "تكييف" : "HVAC"}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
            onClick={() => { setFormData(emptyForm); setEditingId(null); setShowDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />{ar ? "إضافة مقاول" : "Add Contractor"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <ContractorSummaryCards ar={ar} contractors={contractors} />

      {/* Grid + Detail */}
      <div className="flex gap-4">
        <ContractorGrid
          ar={ar}
          contractors={contractors}
          selectedContractor={selectedContractor}
          onSelectContractor={setSelectedContractor}
          onAddContractor={() => { setFormData(emptyForm); setEditingId(null); setShowDialog(true); }}
        />

        {/* Detail Panel */}
        {selectedContractor && detail && (
          <ContractorDetailPanel
            ar={ar}
            detail={detail}
            onEdit={() => {
              setFormData({
                name: detail.name, nameEn: detail.nameEn, companyName: detail.companyName,
                companyEn: detail.companyEn, contactPerson: detail.contactPerson,
                phone: detail.phone, email: detail.email, address: detail.address,
                crNumber: detail.crNumber, licenseNumber: detail.licenseNumber,
                licenseExpiry: detail.licenseExpiry || "",
                classification: detail.classification,
                establishmentDate: detail.establishmentDate || "",
                workerCount: String(detail.workerCount),
                engineerCount: String(detail.engineerCount),
                tradeLicense: detail.tradeLicense,
                tradeLicenseExpiry: detail.tradeLicenseExpiry || "",
                vatNumber: detail.vatNumber,
                category: detail.category,
                rating: String(detail.rating), specialties: detail.specialties,
                experience: detail.experience, bankName: detail.bankName,
                bankAccount: detail.bankAccount, iban: detail.iban, notes: detail.notes,
                isActive: detail.isActive,
              });
              setEditingId(detail.id);
              setShowDialog(true);
            }}
            onClose={() => setSelectedContractor(null)}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}
      </div>

      {/* Add / Edit Dialog */}
      <ContractorEditDialog
        ar={ar}
        open={showDialog}
        onOpenChange={setShowDialog}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        saveMutation={saveMutation}
        onCancel={() => { setShowDialog(false); setEditingId(null); setFormData(emptyForm); }}
      />
    </div>
  );
}
