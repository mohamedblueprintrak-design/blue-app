"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Search, Gavel, ClipboardCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";
import type { ContractorFull } from "./types";
import { getCategoryConfig } from "./types";
import { RatingStars } from "./rating-stars";

export function ContractorsTab({
  ar,
  projectId,
  onSelectContractor,
}: {
  ar: boolean;
  projectId?: string;
  onSelectContractor: (c: ContractorFull) => void;
}) {
  const tAuto = useTranslations();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "", nameEn: "", companyName: "", companyEn: "", contactPerson: "",
    phone: "", email: "", address: "", crNumber: "", licenseNumber: "",
    licenseExpiry: "", category: "CIVIL", rating: "3", specialties: "",
    experience: "", bankName: "", bankAccount: "", iban: "", notes: "",
  });

  const emptyForm = {
    name: "", nameEn: "", companyName: "", companyEn: "", contactPerson: "",
    phone: "", email: "", address: "", crNumber: "", licenseNumber: "",
    licenseExpiry: "", category: "CIVIL", rating: "3", specialties: "",
    experience: "", bankName: "", bankAccount: "", iban: "", notes: "",
  };

  const { data: contractors = [], isLoading } = useQuery<ContractorFull[]>({
    queryKey: ["contractors", projectId, search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectId) params.set("projectId", projectId);
      if (search) params.set("search", search);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      const res = await fetch(`/api/contractors?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setShowDialog(false);
      setFormData(emptyForm);
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden"><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tAuto('auto.searchContractors')}
            className="ps-9 h-8 text-sm rounded-lg"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAuto('auto.allCategories')}</SelectItem>
            <SelectItem value="CIVIL">{tAuto('auto.civil')}</SelectItem>
            <SelectItem value="ELECTRICAL">{tAuto('auto.electrical')}</SelectItem>
            <SelectItem value="MEP">{tAuto('auto.mEP')}</SelectItem>
            <SelectItem value="FINISHING">{tAuto('auto.finishing')}</SelectItem>
            <SelectItem value="PLUMBING">{tAuto('auto.plumbing')}</SelectItem>
            <SelectItem value="HVAC">{tAuto('auto.hVAC')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
          onClick={() => { setFormData(emptyForm); setShowDialog(true); }}
        >
          <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.addContractor')}
        </Button>
      </div>

      {/* Grid */}
      {contractors.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{tAuto('auto.noContractorsFound')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contractors.map((c) => {
            const catConf = getCategoryConfig(c.category);
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden border-slate-200 dark:border-slate-700/50"
                onClick={() => onSelectContractor(c)}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {ar ? c.name : c.nameEn || c.name}
                      </h4>
                      {c.companyName && (
                        <p className="text-xs text-slate-500 truncate">{ar ? c.companyName : c.companyEn || c.companyName}</p>
                      )}
                    </div>
                    <Badge className={cn("text-[10px] flex-shrink-0 ms-2", catConf.color)}>
                      {ar ? catConf.ar : catConf.en}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingStars rating={c.rating} />
                    <span className="text-xs text-slate-400">{c.rating}/5</span>
                  </div>
                  {c.specialties && (
                    <div className="flex flex-wrap gap-1">
                      {c.specialties.split(",").map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                          {s.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1">
                      <Gavel className="h-3 w-3" />{c._count.bids}
                    </span>
                    <span className="flex items-center gap-1">
                      <ClipboardCheck className="h-3 w-3" />{c._count.evaluations}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Contractor Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setFormData(emptyForm); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              {tAuto('auto.addNewContractor')}
            </DialogTitle>
            <DialogDescription>{tAuto('auto.completeContractorProfile')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs">{tAuto('auto.nameAr')} *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs">{tAuto('auto.nameEn')}</Label>
              <Input value={formData.nameEn} onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })} className="h-8 text-sm rounded-lg" dir="ltr" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs">{tAuto('auto.companyAr')}</Label>
              <Input value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs">{tAuto('auto.companyEn')}</Label>
              <Input value={formData.companyEn} onChange={(e) => setFormData({ ...formData, companyEn: e.target.value })} className="h-8 text-sm rounded-lg" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.category')}</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CIVIL">{tAuto('auto.civil')}</SelectItem>
                  <SelectItem value="ELECTRICAL">{tAuto('auto.electrical')}</SelectItem>
                  <SelectItem value="MEP">MEP</SelectItem>
                  <SelectItem value="FINISHING">{tAuto('auto.finishing')}</SelectItem>
                  <SelectItem value="PLUMBING">{tAuto('auto.plumbing')}</SelectItem>
                  <SelectItem value="HVAC">{tAuto('auto.hVAC')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.rating15')}</Label>
              <Select value={formData.rating} onValueChange={(v) => setFormData({ ...formData, rating: v })}>
                <SelectTrigger className="h-8 text-sm rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((r) => (
                    <SelectItem key={r} value={String(r)}>{r} ★</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.contactPerson')}</Label>
              <Input value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.phone')}</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-8 text-sm rounded-lg" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.email')}</Label>
              <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-8 text-sm rounded-lg" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.address')}</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.cRNumber')}</Label>
              <Input value={formData.crNumber} onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })} className="h-8 text-sm rounded-lg" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.licenseNumber')}</Label>
              <Input value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className="h-8 text-sm rounded-lg" dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.licenseExpiry')}</Label>
              <Input type="date" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.experience')}</Label>
              <Input value={formData.experience} onChange={(e) => setFormData({ ...formData, experience: e.target.value })} placeholder={tAuto('auto.yearsOfExperience')} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">{tAuto('auto.specialties')}</Label>
              <Input value={formData.specialties} onChange={(e) => setFormData({ ...formData, specialties: e.target.value })} placeholder={tAuto('auto.commaSeparated')} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tAuto('auto.bankName')}</Label>
              <Input value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} className="h-8 text-sm rounded-lg" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">IBAN</Label>
              <Input value={formData.iban} onChange={(e) => setFormData({ ...formData, iban: e.target.value })} className="h-8 text-sm rounded-lg font-mono" dir="ltr" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">{tAuto('auto.notes')}</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="text-sm min-h-[50px] rounded-lg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setFormData(emptyForm); }}>{tAuto('auto.cancel')}</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
              onClick={() => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? (tAuto('auto.saving')) : (tAuto('auto.save'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
