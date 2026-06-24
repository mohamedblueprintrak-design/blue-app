"use client";


import { useTranslations } from 'next-intl';
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Search, Eye, Pencil, Trash2, Phone, UserCircle, Upload } from 'lucide-react';

import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import { formatCurrency } from "@/lib/formatters";
import {
  type Client,
  getAvatarColor,
} from "./client-shared";
import ClientDetailPanel from "./client-detail";
import ClientFormDialog from "./client-form";

// ===== Main Clients Component =====
interface ClientsPageProps {
  language: "ar" | "en";
  projectId?: string;
  initialTab?: "list" | "create";
}

export default function ClientsPage({ language, projectId, initialTab }: ClientsPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const headers = { ...getMutationHeaders() };
        // Delete Content-Type to let browser set boundaries for FormData
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === "content-type") {
            delete headers[key];
          }
        }

        const res = await fetch("/api/clients/import", {
          method: "POST",
          headers,
          body: formData,
        });

        const json = await res.json();
        if (res.ok && json.success) {
          toast.showSuccess(
            ar 
              ? `تم استيراد ${json.successCount} عميل بنجاح، وفشل ${json.failureCount}`
              : `Successfully imported ${json.successCount} clients, failed ${json.failureCount}`
          );
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        } else {
          toast.showError(ar ? `فشل الاستيراد: ${json.error || "خطأ غير معروف"}` : `Import failed: ${json.error || "Unknown error"}`);
        }
      } catch (_err) {
        toast.showError(tAuto('auto.anErrorOccurredDuringImport'));
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };


  // Auto-open create dialog on initialTab
  useEffect(() => {
    if (initialTab === "create") {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setShowAddDialog(true));
    }
  }, [initialTab]);

  // Fetch clients
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["clients", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/clients${projectId ? `?projectId=${projectId}` : ''}`);
      if (!res.ok) throw new Error("Failed to fetch clients");
      const json = await res.json();
      // Defensive: API may return { data: [...] }, { clients: [...] }, or a bare array
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.data)) return json.data;
      if (Array.isArray(json.clients)) return json.clients;
      // Could be nested: { data: { clients: [...] } }
      if (json.data && Array.isArray(json.data.clients)) return json.data.clients;
      if (process.env.NODE_ENV === 'development') {
        console.warn('Unexpected API response shape for clients:', typeof json, Object.keys(json || {}));
      }
      return [];
    },
  });

  // Fetch client detail
  const { data: clientDetail } = useQuery<Client>({
    queryKey: ["client-detail", selectedClient?.id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${selectedClient!.id}`);
      if (!res.ok) throw new Error("Failed to fetch client detail");
      return res.json();
    },
    enabled: !!selectedClient,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create client");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAddDialog(false);
      setEditClient(null);
      toast.created(tAuto('auto.client'));
    },
    onError: () => {
      toast.error(tAuto('auto.createClient'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update client");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-detail"] });
      setEditClient(null);
      setShowAddDialog(false);
      toast.updated(tAuto('auto.client'));
    },
    onError: () => {
      toast.error(tAuto('auto.updateClient'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setSelectedClient(null);
      toast.deleted(tAuto('auto.client'));
    },
    onError: () => {
      toast.error(tAuto('auto.deleteClient'));
    },
  });

  const openEditDialog = (client: Client) => {
    setEditClient(client);
    setShowAddDialog(true);
  };

  const openAddDialog = () => {
    setEditClient(null);
    setShowAddDialog(true);
  };

  // Handle save from the form dialog
  const handleFormSave = (payload: Record<string, unknown>) => {
    if (editClient) {
      updateMutation.mutate({ id: editClient.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Filter clients — always ensure we have an array before calling .filter()
  const clientList = Array.isArray(clients) ? clients : [];
  const filteredClients = clientList.filter((c) =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
              <UserCircle className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {tAuto('auto.clients')}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {clientList.length} {tAuto('auto.clients1')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tAuto('auto.searchClients')}
                className="ps-9 h-8 text-sm rounded-lg"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
              onClick={handleImportClick}
              disabled={importing}
            >
              <Upload className="h-3.5 w-3.5 me-1" />
              {importing ? (tAuto('auto.importing')) : (tAuto('auto.import'))}
            </Button>
            <Button
              size="sm"
              className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20"
              onClick={openAddDialog}
            >
              <Plus className="h-3.5 w-3.5 me-1" />
              {tAuto('auto.newClient')}
            </Button>

          </div>
        </div>

        <div className="flex gap-4">
          {/* Table */}
          <div className={cn("flex-1 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm", selectedClient ? "hidden lg:block" : "")}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                  <TableHead className="text-xs font-semibold">{tAuto('auto.name')}</TableHead>
                  <TableHead className="text-xs font-semibold">{tAuto('auto.company')}</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">{tAuto('auto.email')}</TableHead>
                  <TableHead className="text-xs font-semibold hidden md:table-cell">{tAuto('auto.phone')}</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">{tAuto('auto.projects')}</TableHead>
                  <TableHead className="text-xs font-semibold hidden sm:table-cell">{tAuto('auto.credit')}</TableHead>
                  <TableHead className="text-xs font-semibold text-end">{tAuto('auto.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client, idx) => {
                  const creditPct = client.creditLimit > 0 ? Math.min((client.creditUsed / client.creditLimit) * 100, 100) : 0;
                  return (
                    <TableRow
                      key={client.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                        idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20",
                        selectedClient?.id === client.id && "bg-brand-navy-50/50 dark:bg-brand-navy-950/20"
                      )}
                      onClick={() => setSelectedClient(client)}
                    >
                      {/* Avatar + Name */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", getAvatarColor(client.name))}>
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {client.name}
                            </div>
                            {client.company && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                {client.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400 text-xs">
                        {client.company || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-slate-500 text-xs">
                        {client.email || "—"}
                      </TableCell>
                      {/* Clickable phone */}
                      <TableCell className="hidden md:table-cell text-xs">
                        {client.phone ? (
                          <a
                            href={`tel:${client.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-navy-600 dark:text-brand-navy-400 hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {client._count.projects}
                        </Badge>
                      </TableCell>
                      {/* Credit limit progress bar */}
                      <TableCell className="hidden sm:table-cell">
                        <div className="w-24 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 dark:text-slate-400 tabular-nums font-mono">
                              {formatCurrency(client.creditUsed, ar)}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">
                              / {formatCurrency(client.creditLimit, ar)}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                creditPct >= 80 ? "bg-red-500" : creditPct >= 50 ? "bg-amber-500" : "bg-brand-navy-500"
                              )}
                              style={{ width: `${creditPct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center gap-0.5 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                aria-label="View"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{tAuto('auto.view')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); openEditDialog(client); }}
                                aria-label="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{tAuto('auto.edit')}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(ar ? `حذف العميل "${client.name}"؟` : `Delete "${client.name}"?`)) {
                                    deleteMutation.mutate(client.id);
                                  }
                                }}
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">{tAuto('auto.delete')}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredClients.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                      {tAuto('auto.noClientsFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Detail Panel */}
          {selectedClient && clientDetail && (
            <ClientDetailPanel
              client={clientDetail}
              ar={ar}
              onClose={() => setSelectedClient(null)}
              onEdit={() => openEditDialog(selectedClient)}
            />
          )}
        </div>

        {/* Add/Edit Dialog */}
        <ClientFormDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddDialog(false);
              setEditClient(null);
            }
          }}
          editClient={editClient}
          onSave={handleFormSave}
          isSaving={isSaving}
          ar={ar}
        />
      </div>
    </TooltipProvider>
  );
}
