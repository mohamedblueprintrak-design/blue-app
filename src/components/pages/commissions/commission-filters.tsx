"use client";


import { useTranslations } from 'next-intl';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";

// ===== Commission Filters =====
interface CommissionFiltersProps {
  language: "ar" | "en";
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  onNew: () => void;
}

export function CommissionFilters({
  language, search, onSearchChange, filterStatus, onFilterStatusChange, onNew,
}: CommissionFiltersProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder={tAuto('auto.search1')} className="ps-9 h-8 text-sm rounded-lg" />
      </div>
      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
          <SelectItem value="PENDING">{tAuto('auto.pending')}</SelectItem>
          <SelectItem value="APPROVED">{tAuto('auto.approved')}</SelectItem>
          <SelectItem value="PAID">{tAuto('auto.paid')}</SelectItem>
          <SelectItem value="CANCELLED">{tAuto('auto.cancelled')}</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={onNew}>
        <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newCommission')}
      </Button>
    </div>
  );
}

// ===== Referral Filters =====
interface ReferralFiltersProps {
  language: "ar" | "en";
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  onNew: () => void;
}

export function ReferralFilters({
  language, search, onSearchChange, filterStatus, onFilterStatusChange, onNew,
}: ReferralFiltersProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder={tAuto('auto.search1')} className="ps-9 h-8 text-sm rounded-lg" />
      </div>
      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
          <SelectItem value="PENDING">{tAuto('auto.pending')}</SelectItem>
          <SelectItem value="CONVERTED">{tAuto('auto.converted')}</SelectItem>
          <SelectItem value="rewarded">{tAuto('auto.rewarded')}</SelectItem>
          <SelectItem value="EXPIRED">{tAuto('auto.expired')}</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={onNew}>
        <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newReferral')}
      </Button>
    </div>
  );
}
