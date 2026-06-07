"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoicePrintContent } from "./invoice-print-content";
import type { Invoice } from "./types";

interface InvoicePrintDialogProps {
  ar: boolean;
  printInvoice: Invoice | null;
  onClose: () => void;
}

export function InvoicePrintDialog({
  ar,
  printInvoice,
  onClose,
}: InvoicePrintDialogProps) {
  if (!printInvoice) return null;

  return (
    <>
      {/* Print Invoice Dialog */}
      <Dialog open={!!printInvoice} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-teal-500" />
              {ar ? "طباعة الفاتورة" : "Print Invoice"} — {printInvoice.number}
            </DialogTitle>
          </DialogHeader>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <InvoicePrintContent invoice={printInvoice} ar={ar} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {ar ? "إغلاق" : "Close"}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              {ar ? "طباعة" : "Print"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden Print Content */}
      <div className="print-only">
        <InvoicePrintContent invoice={printInvoice} ar={ar} />
      </div>
    </>
  );
}
