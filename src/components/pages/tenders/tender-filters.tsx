"use client";


import { useTranslations } from 'next-intl';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Gavel } from "lucide-react";

interface TenderFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  filterAuthority: string;
  onFilterAuthorityChange: (value: string) => void;
  total: number;
  isAr: boolean;
  onAddClick: () => void;
}

export function TenderFilters({
  search,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  filterAuthority,
  onFilterAuthorityChange,
  total,
  isAr,
  onAddClick,
}: TenderFiltersProps) {
  const tAuto = useTranslations();
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
          <Gavel className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {tAuto('auto.tenders')}
            </h2>
            <Badge variant="secondary" className="text-[10px] font-medium h-5 px-1.5">
              {total}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {tAuto('auto.manageAndTrackTenders')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto flex-wrap">
        <div className="relative flex-1 sm:w-56">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tAuto('auto.searchTenders')}
            className="ps-9 h-8 text-sm rounded-lg"
          />
        </div>
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg">
            <SelectValue placeholder={tAuto('auto.status1')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAuto('auto.allStatus')}</SelectItem>
            <SelectItem value="IDENTIFIED">{tAuto('auto.identified')}</SelectItem>
            <SelectItem value="PREPARING">{tAuto('auto.preparing')}</SelectItem>
            <SelectItem value="SUBMITTED">{tAuto('auto.submitted')}</SelectItem>
            <SelectItem value="QUALIFIED">{tAuto('auto.qualified')}</SelectItem>
            <SelectItem value="WON">{tAuto('auto.won')}</SelectItem>
            <SelectItem value="LOST">{tAuto('auto.lost')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAuthority} onValueChange={onFilterAuthorityChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg">
            <SelectValue placeholder={tAuto('auto.authority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAuto('auto.allAuthorities')}</SelectItem>
            <SelectItem value="rak_municipality">{tAuto('auto.municipality')}</SelectItem>
            <SelectItem value="rak_properties">RAK Properties</SelectItem>
            <SelectItem value="al_hamra">{tAuto('auto.alHamra')}</SelectItem>
            <SelectItem value="marjan">{tAuto('auto.marjan')}</SelectItem>
            <SelectItem value="rakez">RAKEZ</SelectItem>
            <SelectItem value="private">{tAuto('auto.private')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20"
          onClick={onAddClick}
        >
          <Plus className="h-3.5 w-3.5 me-1" />
          {tAuto('auto.newTender')}
        </Button>
      </div>
    </div>
  );
}
