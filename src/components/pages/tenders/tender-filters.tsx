"use client";

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
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <Gavel className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? "المناقصات" : "Tenders"}
            </h2>
            <Badge variant="secondary" className="text-[10px] font-medium h-5 px-1.5">
              {total}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {isAr ? "إدارة وتتبع المناقصات" : "Manage and track tenders"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto flex-wrap">
        <div className="relative flex-1 sm:w-56">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isAr ? "بحث في المناقصات..." : "Search tenders..."}
            className="ps-9 h-8 text-sm rounded-lg"
          />
        </div>
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg">
            <SelectValue placeholder={isAr ? "الحالة" : "Status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "جميع الحالات" : "All Status"}</SelectItem>
            <SelectItem value="IDENTIFIED">{isAr ? "مُحدّدة" : "Identified"}</SelectItem>
            <SelectItem value="PREPARING">{isAr ? "قيد التحضير" : "Preparing"}</SelectItem>
            <SelectItem value="SUBMITTED">{isAr ? "مقدّمة" : "Submitted"}</SelectItem>
            <SelectItem value="QUALIFIED">{isAr ? "مؤهّلة" : "Qualified"}</SelectItem>
            <SelectItem value="WON">{isAr ? "فُزنا" : "Won"}</SelectItem>
            <SelectItem value="LOST">{isAr ? "خسرنا" : "Lost"}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAuthority} onValueChange={onFilterAuthorityChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg">
            <SelectValue placeholder={isAr ? "الجهة" : "Authority"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "جميع الجهات" : "All Authorities"}</SelectItem>
            <SelectItem value="rak_municipality">{isAr ? "البلدية" : "Municipality"}</SelectItem>
            <SelectItem value="rak_properties">RAK Properties</SelectItem>
            <SelectItem value="al_hamra">{isAr ? "الحمراء" : "Al Hamra"}</SelectItem>
            <SelectItem value="marjan">{isAr ? "مرجان" : "Marjan"}</SelectItem>
            <SelectItem value="rakez">RAKEZ</SelectItem>
            <SelectItem value="private">{isAr ? "خاصة" : "Private"}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
          onClick={onAddClick}
        >
          <Plus className="h-3.5 w-3.5 me-1" />
          {isAr ? "مناقصة جديدة" : "New Tender"}
        </Button>
      </div>
    </div>
  );
}
