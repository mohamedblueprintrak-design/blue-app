"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contractSchema, type ContractFormData } from "@/lib/validations";
import { getMutationHeaders } from "@/lib/csrf-client";

import type { ContractItem, ContractDetail, ClientOption, ProjectOption } from "./contracts/types";
import { ContractTable } from "./contracts/contract-table";
import { ContractFormDialog } from "./contracts/contract-form-dialog";
import { ContractDetailPanel } from "./contracts/contract-detail-panel";

// ===== Main Contracts Component =====
interface ContractsPageProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function ContractsPage({ language, projectId }: ContractsPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editContract, setEditContract] = useState<ContractItem | null>(null);
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);

  const emptyForm = {
    number: "", title: "", clientId: "", projectId: projectId || "",
    value: "0", type: "ENGINEERING_SERVICES" as ContractFormData["type"], startDate: "", endDate: "",
  };
  const [_formData, setFormData] = useState(emptyForm);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema) as Resolver<ContractFormData>,
    defaultValues: emptyForm,
  });
  const { reset } = form;

  // Fetch contracts
  const { data: contracts = [], isLoading } = useQuery<ContractItem[]>({
    queryKey: ["contracts", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts${projectId ? `?projectId=${projectId}` : ''}`);
      if (!res.ok) throw new Error("Failed to fetch contracts");
      const json = await res.json();
      return json.data || json.contracts || json;
    },
  });

  // Fetch contract detail
  const { data: contractDetail } = useQuery<ContractDetail>({
    queryKey: ["contract-detail", selectedContract?.id],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${selectedContract!.id}`);
      if (!res.ok) throw new Error("Failed to fetch contract detail");
      return res.json();
    },
    enabled: !!selectedContract,
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery<ClientOption[]>({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const res = await fetch("/api/clients");
      if (!res.ok) return [];
      const json = await res.json();
      const clientsArr = json.data || json;
      return (Array.isArray(clientsArr) ? clientsArr : []).map((c: { id: string; name: string; company: string }) => ({
        id: c.id, name: c.name, company: c.company,
      }));
    },
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create contract");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", projectId] });
      setShowAddDialog(false);
      setFormData(emptyForm);
      toast.created(tAuto('auto.contract'));
    },
    onError: () => {
      toast.error(tAuto('auto.createContract'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update contract");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", projectId] });
      queryClient.invalidateQueries({ queryKey: ["contract-detail"] });
      setEditContract(null);
      setFormData(emptyForm);
      toast.updated(tAuto('auto.contract'));
    },
    onError: () => {
      toast.error(tAuto('auto.updateContract'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/contracts/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", projectId] });
      setSelectedContract(null);
      toast.deleted(tAuto('auto.contract'));
    },
    onError: () => {
      toast.error(tAuto('auto.deleteContract'));
    },
  });

  const openEditDialog = (contract: ContractItem) => {
    setEditContract(contract);
    const values = {
      number: contract.number,
      title: contract.title,
      clientId: contract.clientId,
      projectId: contract.projectId,
      value: String(contract.value),
      type: contract.type as ContractFormData["type"],
      startDate: contract.startDate ? contract.startDate.split("T")[0] : "",
      endDate: contract.endDate ? contract.endDate.split("T")[0] : "",
    };
    setFormData(values);
    reset(values);
  };

  const openAddDialog = () => {
    setFormData(emptyForm);
    reset(emptyForm);
    setShowAddDialog(true);
  };

  const handleSave = (data: ContractFormData) => {
    if (editContract) {
      updateMutation.mutate({ id: editContract.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Filter contracts
  const filteredContracts = contracts.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.number.toLowerCase().includes(search.toLowerCase()) ||
      c.client?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.project?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Calculate totals
  const totalValue = filteredContracts.reduce((sum, c) => sum + c.value, 0);
  const activeValue = filteredContracts
    .filter((c) => c.status === "ACTIVE")
    .reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="space-y-4">
      <ContractTable
        ar={ar}
        contracts={contracts}
        filteredContracts={filteredContracts}
        totalValue={totalValue}
        activeValue={activeValue}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        onAddClick={openAddDialog}
        selectedContractId={selectedContract?.id || null}
        onSelectContract={setSelectedContract}
        onEditContract={openEditDialog}
        onDeleteContract={(contract) => {
          if (confirm(ar ? `حذف العقد "${contract.title}"؟` : `Delete "${contract.title}"?`)) {
            deleteMutation.mutate(contract.id);
          }
        }}
        contractDetail={contractDetail}
        onCloseDetail={() => setSelectedContract(null)}
        onEditFromDetail={() => selectedContract && openEditDialog(selectedContract)}
      />

      {/* Detail Panel */}
      {selectedContract && contractDetail && (
        <ContractDetailPanel
          contract={contractDetail}
          ar={ar}
          onClose={() => setSelectedContract(null)}
          onEdit={() => openEditDialog(selectedContract)}
        />
      )}

      {/* Add/Edit Dialog */}
      <ContractFormDialog
        ar={ar}
        isOpen={showAddDialog || !!editContract}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditContract(null); setFormData(emptyForm); }
        }}
        editContract={editContract}
        form={form}
        clients={clients}
        projects={projects}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
        onCancel={() => { setShowAddDialog(false); setEditContract(null); setFormData(emptyForm); reset(); }}
      />
    </div>
  );
}
