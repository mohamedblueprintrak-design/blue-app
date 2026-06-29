"use client";


import { useTranslations } from 'next-intl';
import { Building2 } from "lucide-react";
import { StatusIcon } from "@/components/ui/status-icon";
import { getStatusConfig } from "./helpers";
import type { Invoice } from "./types";

export function InvoicePrintContent({ invoice, ar }: { invoice: Invoice; ar: boolean }) {
  const tAuto = useTranslations();
  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 space-y-5" dir={ar ? "rtl" : "ltr"}>
      {/* Company Header */}
      <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-navy-500 to-cyan-600 flex items-center justify-center shadow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold">BluePrint</div>
            <div className="text-xs text-slate-500">{tAuto('auto.engineeringConsultancyManagement')}</div>
            <div className="text-xs text-slate-400 mt-0.5">{tAuto('auto.unitedArabEmirates')}</div>
          </div>
        </div>
        <div className="text-end">
          <div className="text-xs text-slate-500">{tAuto('auto.taxInvoice')}</div>
          <div className="text-2xl font-bold font-mono text-brand-navy-600 dark:text-brand-navy-400">{invoice.number}</div>
        </div>
      </div>

      {/* Dates & Client Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{tAuto('auto.clientInfo')}</div>
          <div className="text-sm font-semibold">{invoice.client.name}</div>
          {invoice.client.company && <div className="text-xs text-slate-500">{invoice.client.company}</div>}
          <div className="text-xs text-slate-400 mt-1">{tAuto('auto.project')}: {ar ? invoice.project.name : invoice.project.nameEn || invoice.project.name}</div>
        </div>
        <div className="space-y-1 text-end">
          <div className="text-xs">
            <span className="text-slate-500">{tAuto('auto.issueDate')}: </span>
            <span className="font-medium">{new Date(invoice.issueDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</span>
          </div>
          <div className="text-xs">
            <span className="text-slate-500">{tAuto('auto.dueDate')}: </span>
            <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</span>
          </div>
          <div className="text-xs">
            <span className="text-slate-500">{tAuto('auto.status1')}: </span>
            <span className="font-medium inline-flex items-center gap-1"><StatusIcon status={invoice.status} className="h-3 w-3" />{getStatusConfig(invoice.status)[ar ? "ar" : "en"]}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50">
              <th className="px-3 py-2 text-start text-xs font-semibold text-slate-600 dark:text-slate-300">{tAuto('auto.description')}</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 w-16">{tAuto('auto.qty')}</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 w-24">{tAuto('auto.unitPrice')}</th>
              <th className="px-3 py-2 text-end text-xs font-semibold text-slate-600 dark:text-slate-300 w-28">{tAuto('auto.total')}</th>
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
            <span className="text-slate-500">{tAuto('auto.subtotal')}</span>
            <span className="font-mono tabular-nums">{invoice.subtotal.toLocaleString()} AED</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{tAuto('auto.vAT5')}</span>
            <span className="font-mono tabular-nums">{invoice.tax.toLocaleString()} AED</span>
          </div>
          <div className="border-t-2 border-brand-navy-500 dark:border-brand-navy-400 pt-1.5 flex justify-between text-base font-bold">
            <span>{tAuto('auto.total')}</span>
            <span className="text-brand-navy-600 dark:text-brand-navy-400 font-mono tabular-nums">{invoice.total.toLocaleString()} AED</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tAuto('auto.thankYouForYourBusiness')}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          BluePrint — {tAuto('auto.unitedArabEmirates')}
        </p>
      </div>
    </div>
  );
}
