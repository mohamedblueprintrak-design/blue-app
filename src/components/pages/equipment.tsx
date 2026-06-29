"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Wrench, MapPin, DollarSign, AlertTriangle, CheckCircle2, Building, Settings, Archive } from 'lucide-react'

import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface Equipment {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  status: string;
  location: string;
  dailyRate: number;
  lastMaintenance: string | null;
  nextMaintenance: string | null;
  createdAt: string;
}

interface EquipmentResponse {
  equipment: Equipment[];
  summary: {
    totalEquipment: number;
    availableCount: number;
    inUseCount: number;
    maintenanceCount: number;
  };
}

// ===== Helpers =====
const statusConfig: Record<string, { ar: string; en: string; color: string; bgColor: string; icon: typeof CheckCircle2; dotColor: string }> = {
  AVAILABLE: { ar: "متاح", en: "Available", color: "text-green-700 dark:text-green-300", bgColor: "bg-green-100 dark:bg-green-900/30", icon: CheckCircle2, dotColor: "bg-green-500" },
  IN_USE: { ar: "قيد الاستخدام", en: "In Use", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900/30", icon: Building, dotColor: "bg-blue-500" },
  MAINTENANCE: { ar: "صيانة", en: "Maintenance", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-100 dark:bg-amber-900/30", icon: Settings, dotColor: "bg-amber-500" },
  RETIRED: { ar: "مُتقاعد", en: "Retired", color: "text-slate-500 dark:text-slate-400", bgColor: "bg-slate-100 dark:bg-slate-800", icon: Archive, dotColor: "bg-slate-400" },
};

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null, ar: boolean): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(ar ? "ar-AE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ===== Main Component =====
interface EquipmentPageProps {
  language: "ar" | "en";
}

export default function EquipmentPage({ language }: EquipmentPageProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editEquip, setEditEquip] = useState<Equipment | null>(null);

  // Form state
  const emptyForm = {
    name: "", type: "", model: "", serialNumber: "", status: "AVAILABLE",
    location: "", dailyRate: "0",
    lastMaintenance: "", nextMaintenance: "",
  };
  const [formData, setFormData] = useState(emptyForm);

  // Fetch equipment
  const { data, isLoading } = useQuery<EquipmentResponse>({
    queryKey: ["EQUIPMENT", statusFilter],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/equipment${params}`);
      if (!res.ok) throw new Error("Failed to fetch equipment");
      const json = await res.json(); return json.data || json;
    },
  });

  const equipmentList = data?.equipment || [] as Equipment[];
  const summary = data?.summary || { totalEquipment: 0, availableCount: 0, inUseCount: 0, maintenanceCount: 0 };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          ...data,
          lastMaintenance: data.lastMaintenance || null,
          nextMaintenance: data.nextMaintenance || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create equipment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["EQUIPMENT"] });
      setShowAddDialog(false);
      setFormData(emptyForm);
      toast.created(tAuto('auto.equipment'));
    },
    onError: () => {
      toast.error(tAuto('auto.createEquipment'));
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, string> }) => {
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({
          ...data,
          lastMaintenance: data.lastMaintenance || null,
          nextMaintenance: data.nextMaintenance || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update equipment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["EQUIPMENT"] });
      setEditEquip(null);
      setFormData(emptyForm);
      toast.updated(tAuto('auto.equipment'));
    },
    onError: () => {
      toast.error(tAuto('auto.updateEquipment'));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/equipment/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["EQUIPMENT"] });
      toast.deleted(tAuto('auto.equipment'));
    },
    onError: () => {
      toast.error(tAuto('auto.deleteEquipment'));
    },
  });

  const openEditDialog = (equip: Equipment) => {
    setEditEquip(equip);
    setFormData({
      name: equip.name,
      type: equip.type,
      model: equip.model,
      serialNumber: equip.serialNumber,
      status: equip.status,
      location: equip.location,
      dailyRate: String(equip.dailyRate),
      lastMaintenance: equip.lastMaintenance ? equip.lastMaintenance.split("T")[0] : "",
      nextMaintenance: equip.nextMaintenance ? equip.nextMaintenance.split("T")[0] : "",
    });
  };

  const handleSave = () => {
    if (editEquip) {
      updateMutation.mutate({ id: editEquip.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Collect unique types
  const uniqueTypes = Array.from(new Set(equipmentList.map((e: Equipment) => e.type).filter(Boolean)));

  // Filter
  const filteredEquipment = equipmentList.filter((e: Equipment) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.model.toLowerCase().includes(search.toLowerCase()) ||
      e.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const summaryCards = [
    {
      label: tAuto('auto.total'),
      value: summary.totalEquipment,
      icon: Wrench,
      color: "text-slate-600 dark:text-slate-400",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
    {
      label: tAuto('auto.available'),
      value: summary.availableCount,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: tAuto('auto.inUse'),
      value: summary.inUseCount,
      icon: Building,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: tAuto('auto.maintenance'),
      value: summary.maintenanceCount,
      icon: Settings,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-slate-200 dark:border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {tAuto('auto.equipment')}
          </h2>
          <Badge variant="secondary" className="text-xs">{equipmentList.length}</Badge>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tAuto('auto.search1')}
              className="ps-9 h-8 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue placeholder={tAuto('auto.status1')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{ar ? cfg.ar : cfg.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {uniqueTypes.length > 0 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-8 text-sm">
                <SelectValue placeholder={tAuto('auto.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
                {uniqueTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
            onClick={() => { setFormData(emptyForm); setShowAddDialog(true); }}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {tAuto('auto.add')}
          </Button>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-slate-200 dark:border-slate-700/50">
              <CardContent className="p-5 space-y-3">
                <div className="h-5 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{tAuto('auto.noEquipmentFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEquipment.map((equip: Equipment) => {
            const cfg = statusConfig[equip.status] || statusConfig.available;
            const StatusIcon = cfg.icon;
            const daysUntilMaintenance = getDaysUntil(equip.nextMaintenance);
            const needsMaintenanceWarning = daysUntilMaintenance !== null && daysUntilMaintenance <= 7 && daysUntilMaintenance >= 0;
            const isOverdueMaintenance = daysUntilMaintenance !== null && daysUntilMaintenance < 0;

            return (
              <Card
                key={equip.id}
                className="border-slate-200 dark:border-slate-700/50 hover:shadow-lg transition-all duration-200 hover:scale-[1.01] overflow-hidden group"
              >
                {/* Status bar */}
                <div className={`h-1 ${equip.status === "AVAILABLE" ? "bg-green-500" : equip.status === "IN_USE" ? "bg-blue-500" : equip.status === "MAINTENANCE" ? "bg-amber-500" : "bg-slate-400"} group-hover:h-1.5 transition-all`} />

                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {equip.name}
                        </h3>
                        <StatusIcon className="h-3 w-3 shrink-0" />
                      </div>
                      {equip.type && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{equip.type}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ms-2">
                      <Badge variant="secondary" className={`text-[10px] h-5 ${cfg.bgColor} ${cfg.color} border-0`}>
                        <StatusIcon className="h-3 w-3 me-1" />
                        {ar ? cfg.ar : cfg.en}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={ar ? "start" : "end"}>
                          <DropdownMenuItem onClick={() => openEditDialog(equip)}>
                            <Pencil className="me-2 h-3.5 w-3.5" />
                            {tAuto('auto.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={() => {
                              if (confirm(ar ? `حذف "${equip.name}"؟` : `Delete "${equip.name}"?`)) {
                                deleteMutation.mutate(equip.id);
                              }
                            }}
                          >
                            <Trash2 className="me-2 h-3.5 w-3.5" />
                            {tAuto('auto.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="space-y-2.5">
                    {/* Model & Serial */}
                    <div className="grid grid-cols-2 gap-2">
                      {equip.model && (
                        <div className="flex items-center gap-1.5">
                          <Settings className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                            {equip.model}
                          </span>
                        </div>
                      )}
                      {equip.serialNumber && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">S/N</span>
                          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                            {equip.serialNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Location & Rate */}
                    <div className="flex items-center justify-between">
                      {equip.location ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {equip.location}
                          </span>
                        </div>
                      ) : <span />}
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-brand-navy-500" />
                        <span className="text-xs font-semibold text-brand-navy-700 dark:text-brand-navy-400 tabular-nums font-mono">
                          {formatCurrency(equip.dailyRate, ar)}
                          <span className="text-[10px] text-slate-400 font-normal ms-0.5">/{tAuto('auto.day1')}</span>
                        </span>
                      </div>
                    </div>

                    {/* Maintenance Info */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {tAuto('auto.lastMaintenance')}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {formatDate(equip.lastMaintenance, ar)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {tAuto('auto.nextMaintenance')}
                        </span>
                        <span className={`font-medium ${isOverdueMaintenance ? "text-red-500" : needsMaintenanceWarning ? "text-amber-500" : "text-slate-600 dark:text-slate-400"}`}>
                          {formatDate(equip.nextMaintenance, ar)}
                        </span>
                      </div>

                      {/* Maintenance Warning */}
                      {(needsMaintenanceWarning || isOverdueMaintenance) && (
                        <div className={`flex items-center gap-1.5 mt-1 px-2 py-1.5 rounded-md text-xs ${
                          isOverdueMaintenance
                            ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                            : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                        }`}>
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span>
                            {isOverdueMaintenance
                              ? ar
                                ? `متأخر ${Math.abs(daysUntilMaintenance!)} يوم عن الصيانة`
                                : `${Math.abs(daysUntilMaintenance!)} days overdue for maintenance`
                              : ar
                                ? `الصيانة خلال ${daysUntilMaintenance} أيام`
                                : `Maintenance in ${daysUntilMaintenance} days`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editEquip}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditEquip(null); setFormData(emptyForm); }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editEquip ? (tAuto('auto.editEquipment')) : (tAuto('auto.addEquipment'))}
            </DialogTitle>
            <DialogDescription>
              {editEquip
                ? (tAuto('auto.editEquipmentDetails'))
                : (tAuto('auto.addNewEquipment'))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={tAuto('auto.equipmentName')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.type')}</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder={tAuto('auto.eGCraneExcavator')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.model')}</Label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder={tAuto('auto.model')}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.serialNumber')}</Label>
                <Input
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder={tAuto('auto.serialNumber')}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.status1')}</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{ar ? cfg.ar : cfg.en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.location')}</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder={tAuto('auto.eGSite1Warehouse')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.dailyRate')} ({tAuto('auto.aED')})</Label>
              <Input
                type="number"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.lastMaintenance')}</Label>
                <Input
                  type="date"
                  value={formData.lastMaintenance}
                  onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.nextMaintenance')}</Label>
                <Input
                  type="date"
                  value={formData.nextMaintenance}
                  onChange={(e) => setFormData({ ...formData, nextMaintenance: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAddDialog(false); setEditEquip(null); setFormData(emptyForm); }}
            >
              {tAuto('auto.cancel')}
            </Button>
            <Button
              className="bg-brand-navy-600 hover:bg-brand-navy-700 text-white"
              onClick={handleSave}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? (tAuto('auto.saving'))
                : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
