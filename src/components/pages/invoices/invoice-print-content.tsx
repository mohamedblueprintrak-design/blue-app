"use client";

import { Building2 } from "lucide-react";
import { StatusIcon } from "@/components/ui/status-icon";
import { getStatusConfig } from "./helpers";
import type { Invoice } from "./types";

export function InvoicePrintContent({ invoice, ar }: { invoice: Invoice; ar: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 space-y-5" dir={ar ? "rtl" : "ltr"}>
      {/* Company Header */}
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold">BluePrint</div>
            <div className="text-xs text-slate-500">{ar ? "نظام إدارة مكاتب الاستشارات الهندسية" : "Engineering Consultancy Management"}</div>
            <div className="text-xs text-slate-400 mt-0.5">{ar ? "الإمارات العربية المتحدة" : "United Arab Emirates"}</div>
          </div>
        </div>
        <div className="text-end">
          <div className="text-xs text-slate-500">{ar ? "فاتورة ضريبية" : "Tax Invoice"}</div>
          <div className="text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">{invoice.number}</div>
        </div>
      </div>

      {/* Dates & Client Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{ar ? "معلومات العميل" : "Client Info"}</div>
          <div className="text-sm font-semibold">{invoice.client.name}</div>
          {invoice.client.company && <div className="text-xs text-slate-500">{invoice.client.company}</div>}
          <div className="text-xs text-slate-400 mt-1">{ar ? "المشروع" : "Project"}: {ar ? invoice.project.name : invoice.project.nameEn || invoice.project.name}</div>
        </div>
        <div className="space-y-1 text-end">
          <div className="text-xs">
            <span className="text-slate-500">{ar ? "تاريخ الإصدار" : "Issue Date"}: </span>
            <span className="font-medium">{new Date(invoice.issueDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</span>
          </div>
          <div className="text-xs">
            <span className="text-slate-500">{ar ? "تاريخ الاستحقاق" : "Due Date"}: </span>
            <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</span>
          </div>
          <div className="text-xs">
            <span className="text-slate-500">{ar ? "الحالة" : "Status"}: </span>
            <span className="font-medium inline-flex items-center gap-1"><StatusIcon status={invoice.status} className="h-3 w-3" />{getStatusConfig(invoice.status)[ar ? "ar" : "en"]}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-3 py-2 text-start text-xs font-semibold text-slate-600 dark:text-slate-300">{ar ? "الوصف" : "Description"}</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 w-16">{ar ? "الكمية" : "Qty"}</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 w-24">{ar ? "سعر الوحدة" : "Unit Price"}</th>
              <th className="px-3 py-2 text-end text-xs font-semibold text-slate-600 dark:text-slate-300 w-28">{ar ? "الإجمالي" : "Total"}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-800/20" : ""}>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2 text-center font-mono tabular-nums">{item.quantity}</td>
                <td className="px-3 py-2 text-center font-mono tabular-nums">{item.unitPrice.toLocaleString()} AED</td>
                <td className="px-3 py-2 text-end font-mono tabular-nums font-medium">{item.total.toLocaleString()} AED</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{ar ? "المجموع الفرعي" : "Subtotal"}</span>
            <span className="font-mono tabular-nums">{invoice.subtotal.toLocaleString()} AED</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{ar ? "ضريبة القيمة المضافة (5%)" : "VAT (5%)"}</span>
            <span className="font-mono tabular-nums">{invoice.tax.toLocaleString()} AED</span>
          </div>
          <div className="border-t-2 border-teal-500 dark:border-teal-400 pt-1.5 flex justify-between text-base font-bold">
            <span>{ar ? "الإجمالي" : "Total"}</span>
            <span className="text-teal-600 dark:text-teal-400 font-mono tabular-nums">{invoice.total.toLocaleString()} AED</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {ar ? "شكراً لتعاملكم معنا" : "Thank you for your business"}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          BluePrint — {ar ? "الإمارات العربية المتحدة" : "United Arab Emirates"}
        </p>
      </div>
    </div>
  );
}
