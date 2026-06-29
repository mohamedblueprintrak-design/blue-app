"use client";


import { useTranslations } from 'next-intl';
import { Receipt, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InvoiceHeaderProps {
  ar: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  onNewInvoice: () => void;
  invoiceCount: number;
}

export function InvoiceHeader({
  ar: _ar,
  search,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  onNewInvoice,
  invoiceCount,
}: InvoiceHeaderProps) {
  const tAuto = useTranslations();
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
          <Receipt className="h-4.5 w-4.5 text-brand-navy-600 dark:text-brand-navy-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.invoices1')}</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {invoiceCount} {tAuto('auto.invoices')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder={tAuto('auto.search1')} className="ps-9 h-8 text-sm rounded-lg" />
        </div>
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
            <SelectItem value="DRAFT">{tAuto('auto.draft')}</SelectItem>
            <SelectItem value="SENT">{tAuto('auto.sent')}</SelectItem>
            <SelectItem value="PARTIALLY_PAID">{tAuto('auto.partial')}</SelectItem>
            <SelectItem value="PAID">{tAuto('auto.paid')}</SelectItem>
            <SelectItem value="OVERDUE">{tAuto('auto.overdue')}</SelectItem>
            <SelectItem value="CANCELLED">{tAuto('auto.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-lg shadow-sm shadow-brand-navy-600/20" onClick={onNewInvoice}>
          <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newInvoice')}
        </Button>
      </div>
    </div>
  );
}
