"use client";

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
  ar,
  search,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  onNewInvoice,
  invoiceCount,
}: InvoiceHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <Receipt className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "الفواتير" : "Invoices"}</h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {invoiceCount} {ar ? "فاتورة" : "invoices"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder={ar ? "بحث..." : "Search..."} className="ps-9 h-8 text-sm rounded-lg" />
        </div>
        <Select value={filterStatus} onValueChange={onFilterStatusChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
            <SelectItem value="DRAFT">{ar ? "مسودة" : "Draft"}</SelectItem>
            <SelectItem value="SENT">{ar ? "مرسلة" : "Sent"}</SelectItem>
            <SelectItem value="PARTIALLY_PAID">{ar ? "جزئية" : "Partial"}</SelectItem>
            <SelectItem value="PAID">{ar ? "مدفوعة" : "Paid"}</SelectItem>
            <SelectItem value="OVERDUE">{ar ? "متأخرة" : "Overdue"}</SelectItem>
            <SelectItem value="CANCELLED">{ar ? "ملغاة" : "Cancelled"}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={onNewInvoice}>
          <Plus className="h-3.5 w-3.5 me-1" />{ar ? "فاتورة جديدة" : "New Invoice"}
        </Button>
      </div>
    </div>
  );
}
