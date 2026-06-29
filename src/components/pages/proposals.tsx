"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  FileText,
  Send,
  Target,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";
import { VAT_RATE } from "@/lib/constants";

// ===== Types =====
interface ProposalItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Proposal {
  id: string;
  number: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  notes: string;
  clientId: string;
  projectId: string | null;
  createdAt: string;
  client: { id: string; name: string; company: string };
  project: { id: string; name: string; nameEn: string; number: string } | null;
  items: ProposalItem[];
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }
interface ClientOption { id: string; name: string; company: string; }

// ===== Helpers =====
function getStatusConfig(status: string) {
  const configs: Record<string, { ar: string; en: string; color: string; gradient: string }> = {
    DRAFT: { ar: "مسودة", en: "Draft", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", gradient: "from-slate-400 to-slate-500" },
    SENT: { ar: "مرسلة", en: "Sent", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300", gradient: "from-sky-400 to-sky-500" },
    ACCEPTED: { ar: "مقبولة", en: "Accepted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", gradient: "from-emerald-400 to-emerald-500" },
    REJECTED: { ar: "مرفوضة", en: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300", gradient: "from-red-400 to-red-500" },
    EXPIRED: { ar: "منتهية", en: "Expired", color: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400", gradient: "from-slate-400 to-slate-500" },
  };
  return configs[status] || configs.DRAFT;
}

function getProbabilityConfig(status: string) {
  const configs: Record<string, number> = {
    DRAFT: 20,
    SENT: 50,
    ACCEPTED: 100,
    REJECTED: 0,
    EXPIRED: 0,
  };
  return configs[status] ?? 50;
}

function getEmptyLineItem(): ProposalItem {
  return { description: "", quantity: 1, unitPrice: 0, total: 0 };
}

// ===== Probability Bar Component =====
function ProbabilityBar({ probability, ar: _ar }: { probability: number; ar: boolean }) {
  const colorClass = probability >= 80
    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
    : probability >= 50
      ? "bg-gradient-to-r from-sky-400 to-sky-500"
      : probability >= 25
        ? "bg-gradient-to-r from-amber-400 to-amber-500"
        : "bg-gradient-to-r from-slate-300 to-slate-400";

  return (
    <div className="flex items-center gap-2 w-24">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", colorClass)}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400 w-7 text-end">{probability}%</span>
    </div>
  );
}

// ===== Main Component =====
interface ProposalsPageProps { language: "ar" | "en"; projectId?: string; }

export default function ProposalsPage({ language, projectId }: ProposalsPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editProposal, setEditProposal] = useState<Proposal | null>(null);

  const emptyForm = {
    number: "", clientId: "", projectId: projectId || "",
    status: "DRAFT" as string, notes: "",
    items: [getEmptyLineItem()],
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch proposals
  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ["proposals", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/proposals${projectId ? `?projectId=${projectId}` : ''}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: clientsData } = useQuery<ClientOption[]>({
    queryKey: ["clients-list"],
    queryFn: async () => { const res = await fetch("/api/clients"); if (!res.ok) return []; const json = await res.json(); return json.data || json; },
  });
  const clients = Array.isArray(clientsData) ? clientsData : [];

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => { const res = await fetch("/api/projects-simple"); if (!res.ok) return []; return res.json(); },
  });

  // Create
  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const items = data.items.map((i) => ({ ...i, total: i.quantity * i.unitPrice }));
      const res = await fetch("/api/proposals", {
        method: "POST", headers: getMutationHeaders(),
        body: JSON.stringify({ ...data, items }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proposals", projectId] }); setShowDialog(false); setFormData(emptyForm); },
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof emptyForm }) => {
      const items = data.items.map((i) => ({ ...i, total: i.quantity * i.unitPrice }));
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PUT", headers: getMutationHeaders(),
        body: JSON.stringify({ ...data, items }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proposals", projectId] }); setEditProposal(null); setFormData(emptyForm); },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/proposals/${id}`, { method: "DELETE", headers: getMutationHeaders() }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["proposals", projectId] }); },
  });

  // Convert to Contract
  const convertMutation = useMutation({
    mutationFn: async (proposal: Proposal) => {
      const res = await fetch("/api/contracts", {
        method: "POST", headers: getMutationHeaders(),
        body: JSON.stringify({
          number: `CTR-${proposal.number}`,
          title: `${tAuto('auto.contractFrom')} ${proposal.number}`,
          clientId: proposal.clientId,
          projectId: proposal.projectId,
          value: proposal.total,
          type: "ENGINEERING_SERVICES",
          status: "DRAFT",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contracts"] }); },
  });

  // Filter
  const filtered = proposals.filter((p) => {
    const matchSearch =
      p.number.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Summary stats
  const totalProposals = filtered.length;
  const activeProposals = filtered.filter((p) => p.status === "DRAFT" || p.status === "SENT").length;
  const convertedCount = filtered.filter((p) => p.status === "ACCEPTED").length;
  const conversionRate = totalProposals > 0 ? ((convertedCount / totalProposals) * 100).toFixed(1) : "0";
  const highValueThreshold = filtered.length > 0 ? filtered.reduce((s, p) => s + Number(p.total), 0) / filtered.length * 1.5 : 0;

  // Form helpers
  const openEdit = (p: Proposal) => {
    setEditProposal(p);
    setFormData({
      number: p.number, clientId: p.clientId,
      projectId: p.projectId || "", status: p.status, notes: p.notes,
      items: p.items.length > 0
        ? p.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total }))
        : [getEmptyLineItem()],
    });
  };

  const updateLineItem = (idx: number, field: keyof ProposalItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    newItems[idx].total = newItems[idx].quantity * newItems[idx].unitPrice;
    setFormData({ ...formData, items: newItems });
  };

  const addLineItem = () => setFormData({ ...formData, items: [...formData.items, getEmptyLineItem()] });
  const removeLineItem = (idx: number) => { if (formData.items.length <= 1) return; setFormData({ ...formData, items: formData.items.filter((_, i) => i !== idx) }); };

  const calcSubtotal = formData.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const calcTax = calcSubtotal * VAT_RATE;
  const calcTotal = calcSubtotal + calcTax;

  const handleSave = () => {
    if (editProposal) { updateMutation.mutate({ id: editProposal.id, data: formData }); }
    else { createMutation.mutate(formData); }
  };

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
          <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
            <FileText className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.proposals')}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {proposals.length} {tAuto('auto.proposals1')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tAuto('auto.search1')} className="ps-9 h-8 text-sm rounded-lg" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
              <SelectItem value="DRAFT">{tAuto('auto.draft')}</SelectItem>
              <SelectItem value="SENT">{tAuto('auto.sent')}</SelectItem>
              <SelectItem value="ACCEPTED">{tAuto('auto.accepted')}</SelectItem>
              <SelectItem value="REJECTED">{tAuto('auto.rejected')}</SelectItem>
              <SelectItem value="EXPIRED">{tAuto('auto.expired')}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={() => { setFormData(emptyForm); setShowDialog(true); }}>
            <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newProposal')}
          </Button>
        </div>
      </div>

      {/* Summary Cards with Gradient */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Proposals */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><FileText className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-slate-200">{tAuto('auto.totalProposals')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{totalProposals}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {formatCurrency(filtered.reduce((s, p) => s + Number(p.total), 0), ar)}
            </p>
          </div>
        </Card>

        {/* Active Proposals */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Target className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-sky-100">{tAuto('auto.active')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{activeProposals}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {ar ? "مسودة + مرسلة" : "Draft + Sent"}
            </p>
          </div>
        </Card>

        {/* Converted to Contract */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Award className="h-3.5 w-3.5 text-white" /></div>
              <span className="text-xs text-emerald-100">{tAuto('auto.converted')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{convertedCount}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {formatCurrency(filtered.filter((p) => p.status === "ACCEPTED").reduce((s, p) => s + Number(p.total), 0), ar)}
            </p>
          </div>
        </Card>

        {/* Conversion Rate */}
        <Card className="py-0 gap-0 border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/50"><TrendingUp className="h-3.5 w-3.5 text-brand-navy-600 dark:text-brand-navy-400" /></div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{tAuto('auto.conversionRate')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-brand-navy-600 dark:text-brand-navy-400 tabular-nums">{conversionRate}%</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/50 dark:text-brand-navy-300">
                {parseFloat(conversionRate) >= 50 ? (tAuto('auto.excellent')) : parseFloat(conversionRate) >= 30 ? (tAuto('auto.good')) : (tAuto('auto.needsWork'))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <ScrollArea className="max-h-[calc(100vh-380px)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{tAuto('auto.no')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.client')}</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">{tAuto('auto.project')}</TableHead>
                <TableHead className="text-xs font-semibold text-end">{tAuto('auto.totalAED')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.winChance')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">{tAuto('auto.date')}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{tAuto('auto.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((proposal, idx) => {
                const sc = getStatusConfig(proposal.status);
                const probability = getProbabilityConfig(proposal.status);
                const isHighValue = proposal.total >= highValueThreshold;
                return (
                  <TableRow
                    key={proposal.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      idx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/50 dark:bg-slate-800/20",
                      isHighValue && "ring-1 ring-inset ring-brand-navy-200 dark:ring-brand-navy-800/50"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-500">{proposal.number || "—"}</span>
                        {isHighValue && (
                          <Sparkles className="h-3 w-3 text-brand-navy-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-900 dark:text-white max-w-[150px] truncate">{proposal.client.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-slate-500">{proposal.project ? (ar ? proposal.project.name : proposal.project.nameEn || proposal.project.name) : "—"}</TableCell>
                    <TableCell className={cn(
                      "text-sm font-medium text-end font-mono tabular-nums",
                      isHighValue ? "text-brand-navy-700 dark:text-brand-navy-400" : "text-slate-900 dark:text-white"
                    )}>
                      {formatCurrency(proposal.total, ar)}
                    </TableCell>
                    <TableCell>
                      <ProbabilityBar probability={probability} ar={ar} />
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                        {ar ? sc.ar : sc.en}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-slate-500">{new Date(proposal.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US")}</TableCell>
                    <TableCell className="text-start">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(proposal)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                        {proposal.status === "ACCEPTED" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-brand-navy-600 hover:text-brand-navy-700" onClick={() => {
                            if (confirm(tAuto('auto.convertProposalToContract'))) {
                              convertMutation.mutate(proposal);
                            }
                          }}>
                            <Send className="h-3.5 w-3.5 me-1" />{tAuto('auto.toContract')}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => {
                          if (confirm(tAuto('auto.deleteProposal'))) deleteMutation.mutate(proposal.id);
                        }} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    {tAuto('auto.noProposalsFound')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog || !!editProposal} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditProposal(null); setFormData(emptyForm); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProposal ? (tAuto('auto.editProposal')) : (tAuto('auto.newProposal'))}</DialogTitle>
            <DialogDescription>{editProposal ? (tAuto('auto.updateProposalDetails')) : (tAuto('auto.createANewProposal'))}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.proposalNo')}</Label>
                <Input value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} placeholder="PRP-001" className="h-8 text-sm rounded-lg" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.client')} *</Label>
                <Select value={formData.clientId} onValueChange={(v) => setFormData({ ...formData, clientId: v })}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={tAuto('auto.selectClient')} /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.project')}</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue placeholder={tAuto('auto.selectProject')} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{tAuto('auto.status1')}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">{tAuto('auto.draft')}</SelectItem>
                    <SelectItem value="SENT">{tAuto('auto.sent')}</SelectItem>
                    <SelectItem value="ACCEPTED">{tAuto('auto.accepted')}</SelectItem>
                    <SelectItem value="REJECTED">{tAuto('auto.rejected')}</SelectItem>
                    <SelectItem value="EXPIRED">{tAuto('auto.expired')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.notes')}</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder={tAuto('auto.additionalNotes')} className="h-8 text-sm rounded-lg" />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">{tAuto('auto.lineItems')}</Label>
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={addLineItem}><Plus className="h-3 w-3 me-1" />{tAuto('auto.addItem1')}</Button>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="text-xs">{tAuto('auto.description')}</TableHead>
                      <TableHead className="text-xs w-24">{tAuto('auto.qty')}</TableHead>
                      <TableHead className="text-xs w-28">{tAuto('auto.unitPrice')}</TableHead>
                      <TableHead className="text-xs w-28 text-end">{tAuto('auto.total')}</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Input value={item.description} onChange={(e) => updateLineItem(idx, "description", e.target.value)} className="h-8 text-xs rounded-lg" /></TableCell>
                        <TableCell><Input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="h-8 text-xs tabular-nums font-mono rounded-lg" /></TableCell>
                        <TableCell><Input type="number" value={item.unitPrice} onChange={(e) => updateLineItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="h-8 text-xs tabular-nums font-mono rounded-lg" /></TableCell>
                        <TableCell className="text-end text-sm font-medium tabular-nums font-mono">{formatCurrency(item.quantity * item.unitPrice, ar)}</TableCell>
                        <TableCell>
                          {formData.items.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeLineItem(idx)} aria-label={tAuto('auto.removeItem')}><X className="h-3.5 w-3.5" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-slate-500">{tAuto('auto.subtotal')}</span><span className="tabular-nums font-mono text-slate-700 dark:text-slate-300">{formatCurrency(calcSubtotal, ar)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">{tAuto('auto.tax5')}</span><span className="tabular-nums font-mono text-slate-700 dark:text-slate-300">{formatCurrency(calcTax, ar)}</span></div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  <div className="flex justify-between text-base font-bold"><span>{tAuto('auto.total')}</span><span className="text-brand-navy-600 dark:text-brand-navy-400 tabular-nums font-mono">{formatCurrency(calcTotal, ar)}</span></div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditProposal(null); setFormData(emptyForm); }}>{tAuto('auto.cancel')}</Button>
            <Button className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white" onClick={handleSave} disabled={!formData.clientId || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? (tAuto('auto.saving')) : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
