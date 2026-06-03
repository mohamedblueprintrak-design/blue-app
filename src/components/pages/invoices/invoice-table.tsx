"use client";

import { Receipt, Pencil, Trash2, Printer, FileText, CheckCircle2, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StatusIcon } from "@/components/ui/status-icon";
import { formatCurrency } from "@/lib/formatters";
import { getStatusConfig, getAmountColor } from "./helpers";
import type { Invoice } from "./types";

interface InvoiceTableProps {
  ar: boolean;
  paginatedFiltered: Invoice[];
  filtered: Invoice[];
  totalInvoices: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  onPrint: (inv: Invoice) => void;
  onExportPDF: (inv: Invoice) => void;
  onEdit: (inv: Invoice) => void;
  onDelete: (id: string) => void;
  onRequestApproval: (inv: Invoice) => void;
  onSendWhatsApp?: (inv: Invoice) => void;
  PAGE_SIZE: number;
}

export function InvoiceTable({
  ar,
  paginatedFiltered,
  filtered,
  totalInvoices,
  currentPage,
  totalPages,
  setCurrentPage,
  onPrint,
  onExportPDF,
  onEdit,
  onDelete,
  onRequestApproval,
  onSendWhatsApp,
  PAGE_SIZE,
}: InvoiceTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm relative">
      <ScrollArea className="max-h-[calc(100vh-340px)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold">{ar ? "الرقم" : "No."}</TableHead>
              <TableHead className="text-xs font-semibold">{ar ? "العميل" : "Client"}</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "المشروع" : "Project"}</TableHead>
              <TableHead className="text-xs font-semibold hidden lg:table-cell">{ar ? "تاريخ الإصدار" : "Issue"}</TableHead>
              <TableHead className="text-xs font-semibold hidden lg:table-cell">{ar ? "تاريخ الاستحقاق" : "Due"}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{ar ? "المجموع" : "Total"}</TableHead>
              <TableHead className="text-xs font-semibold text-start hidden sm:table-cell">{ar ? "الضريبة 5%" : "Tax 5%"}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{ar ? "الإجمالي" : "Grand Total"}</TableHead>
              <TableHead className="text-xs font-semibold text-start hidden sm:table-cell">{ar ? "المدفوع" : "Paid"}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{ar ? "المتبقي" : "Remaining"}</TableHead>
              <TableHead className="text-xs font-semibold">{ar ? "الحالة" : "Status"}</TableHead>
              <TableHead className="text-xs font-semibold text-end">{ar ? "إجراءات" : "Actions"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedFiltered.map((inv, idx) => {
              const sc = getStatusConfig(inv.status);
              return (
                <TableRow
                  key={inv.id}
                  className={cn(
                    "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    idx % 2 === 0
                      ? "bg-white dark:bg-slate-900"
                      : "bg-slate-50/50 dark:bg-slate-800/20"
                  )}
                >
                  <TableCell className="font-mono text-xs text-slate-500">{inv.number || "—"}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white max-w-[150px] truncate">{inv.client.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-500">{ar ? inv.project.name : inv.project.nameEn || inv.project.name}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-slate-500">{new Date(inv.issueDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-slate-500">{new Date(inv.dueDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</TableCell>
                  <TableCell className={cn("text-xs text-start tabular-nums font-mono", getAmountColor(inv.status))}>{formatCurrency(inv.subtotal, ar)}</TableCell>
                  <TableCell className={cn("text-xs text-start tabular-nums font-mono hidden sm:table-cell", getAmountColor(inv.status))}>{formatCurrency(inv.tax, ar)}</TableCell>
                  <TableCell className={cn("text-xs text-start font-medium tabular-nums font-mono", getAmountColor(inv.status))}>{formatCurrency(inv.total, ar)}</TableCell>
                  <TableCell className="text-xs text-start text-emerald-600 dark:text-emerald-400 tabular-nums font-mono hidden sm:table-cell">{formatCurrency(inv.paidAmount, ar)}</TableCell>
                  <TableCell className={cn("text-xs text-start font-medium tabular-nums font-mono", inv.remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")}>{formatCurrency(inv.remaining, ar)}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                      <StatusIcon status={inv.status} className="h-3 w-3" />
                      {ar ? sc.ar : sc.en}
                    </span>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center gap-0.5 justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:text-slate-400" onClick={() => onPrint(inv)} aria-label="Print"><Printer className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{ar ? "طباعة" : "Print"}</TooltipContent>
                      </Tooltip>
                      {onSendWhatsApp && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => onSendWhatsApp(inv)} aria-label="Send WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{ar ? "إرسال واتساب" : "Send WhatsApp"}</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:text-slate-400" onClick={() => onExportPDF(inv)} aria-label="Export PDF"><FileText className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{ar ? "تصدير PDF" : "Export PDF"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(inv)} aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{ar ? "تعديل" : "Edit"}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => onDelete(inv.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{ar ? "حذف" : "Delete"}</TooltipContent>
                      </Tooltip>
                      {inv.status === "DRAFT" && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-teal-600 hover:text-teal-700"
                              onClick={() => onRequestApproval(inv)}
                              aria-label="Request approval"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">{ar ? "طلب موافقة" : "Request Approval"}</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-12 text-slate-400">
                  {ar ? "لا توجد فواتير" : "No invoices found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ar ? `صفحة ${currentPage} من ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            <span className="ms-2">({filtered.length} {ar ? "فاتورة" : "invoices"})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              aria-label="Previous page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="icon"
                  className={cn(
                    "h-7 w-7 text-xs",
                    currentPage === pageNum
                      ? "bg-teal-600 hover:bg-teal-700 text-white border-teal-600"
                      : ""
                  )}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              aria-label="Next page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      {/* Quick Total Floating Badge */}
      {filtered.length > 5 && (
        <div className="absolute bottom-3 end-3 z-10 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-teal-600/30 flex items-center gap-2">
          <Receipt className="h-3.5 w-3.5" />
          <span className="text-[11px] font-medium">{ar ? "الإجمالي" : "Total"}</span>
          <span className="text-sm font-bold tabular-nums font-mono">{formatCurrency(totalInvoices, ar)}</span>
        </div>
      )}
    </div>
  );
}
