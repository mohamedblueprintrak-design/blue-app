"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import SignDocumentDialog from "@/components/common/sign-document-dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pencil,
  X,
  Calendar,
  Building2,
  FileText,
  User,
  DollarSign,
} from "lucide-react";
import type { ContractDetail } from "./types";
import { getStatusConfig, getTypeLabel, getAmendmentStatus } from "./helpers";

export function ContractDetailPanel({ contract, ar, onClose, onEdit }: { contract: ContractDetail; ar: boolean; onClose: () => void; onEdit: () => void }) {
  const tAuto = useTranslations();
  const statusCfg = getStatusConfig(contract.status);
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  return (
    <div className="w-full lg:w-[420px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {tAuto('auto.contractDetails')}
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="p-4 space-y-4">
          {/* Contract Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex-1 truncate">
                {contract.title}
              </h4>
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0",
                statusCfg.pill
              )}>
                {ar ? statusCfg.ar : statusCfg.en}
              </span>
            </div>

            {/* Contract Value - Teal Accent */}
            <div className="bg-gradient-to-br from-brand-navy-50 to-cyan-50 dark:from-brand-navy-900/20 dark:to-cyan-900/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-brand-navy-500 dark:text-brand-navy-400" />
                <span className="text-xs text-brand-navy-600 dark:text-brand-navy-400">
                  {tAuto('auto.contractValue')}
                </span>
              </div>
              <div className="text-2xl font-bold text-brand-navy-700 dark:text-brand-navy-300 font-mono tabular-nums">
                {contract.value.toLocaleString(ar ? "ar-AE" : "en-US")} <span className="text-sm font-medium">{tAuto('auto.aED')}</span>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              {contract.number && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{tAuto('auto.no')}</span>
                    <span className="font-mono text-xs">{contract.number}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{tAuto('auto.client')}</span>
                  <span className="text-xs">{contract.client.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{tAuto('auto.project')}</span>
                  <span className="text-xs">{ar ? contract.project.name : contract.project.nameEn || contract.project.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-slate-400 block">{tAuto('auto.duration')}</span>
                  <span className="text-xs">
                    {contract.startDate && (
                      <>{new Date(contract.startDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                      {contract.endDate && (
                        <> — {new Date(contract.endDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}</>
                      )}</>
                    )}
                    {!contract.startDate && (tAuto('auto.notSpecified'))}
                  </span>
                </div>
              </div>
              {/* Contract Timeline Visual */}
              {contract.startDate && contract.endDate && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1.5">
                    <span>{new Date(contract.startDate).toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", year: "2-digit" })}</span>
                    <span>{new Date(contract.endDate).toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", year: "2-digit" })}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    {/* Full bar */}
                    <div className={cn(
                      "absolute inset-y-0 start-0 rounded-full",
                      contract.status === "EXPIRED"
                        ? "bg-red-200 dark:bg-red-900/40"
                        : contract.status === "COMPLETED"
                          ? "bg-emerald-200 dark:bg-emerald-900/40"
                          : "bg-brand-navy-200 dark:bg-brand-navy-900/40"
                    )} />
                    {/* Elapsed portion */}
                    {(() => {
                      const start = new Date(contract.startDate).getTime();
                      const end = new Date(contract.endDate).getTime();
                      const now = Date.now();
                      const elapsed = Math.min(Math.max((now - start) / (end - start), 0), 1);
                      return (
                        <div
                          className={cn(
                            "absolute inset-y-0 start-0 rounded-full transition-all",
                            contract.status === "EXPIRED"
                              ? "bg-red-500"
                              : contract.status === "COMPLETED"
                                ? "bg-emerald-500"
                                : "bg-brand-navy-500"
                          )}
                          style={{ width: `${elapsed * 100}%` }}
                        />
                      );
                    })()}
                    {/* Today marker */}
                    {(() => {
                      const start = new Date(contract.startDate).getTime();
                      const end = new Date(contract.endDate).getTime();
                      const now = Date.now();
                      const pct = Math.min(Math.max((now - start) / (end - start), 0), 1);
                      if (pct > 0 && pct < 1) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10"
                            style={{ left: `${pct * 100}%` }}
                          />
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs rounded-full">
                  {getTypeLabel(contract.type, ar)}
                </Badge>
              </div>

              <div className="flex flex-col gap-2 w-full mt-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" className="w-full justify-start text-[#133371] border-[#133371]/20 hover:bg-[#133371]/5 dark:text-blue-400 dark:border-blue-900/50 dark:hover:bg-blue-900/20" onClick={() => setSignDialogOpen(true)}>
                  <Pencil className="h-4 w-4 me-2" />
                  {tAuto('auto.eSignContract')}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Amendments Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.amendments')}
              </h5>
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                contract._count?.amendments > 2
                  ? "bg-red-500 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              )}>
                {contract._count?.amendments || 0}
              </span>
            </div>
            {contract.amendments.length > 0 ? (
              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute start-[15px] top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700" />
                {contract.amendments.map((amendment, idx) => (
                  <div
                    key={amendment.id}
                    className="relative ps-10 pb-4 last:pb-0"
                  >
                    {/* Numbered circle */}
                    <div className={cn(
                      "absolute start-0 top-0.5 w-[31px] h-[31px] rounded-full flex items-center justify-center text-[10px] font-bold z-10 border-2",
                      amendment.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800"
                        : amendment.status === "REJECTED"
                          ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800"
                          : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          {amendment.number || (ar ? `تعديل ${idx + 1}` : `Amendment ${idx + 1}`)}
                        </span>
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium",
                          amendment.status === "APPROVED"
                            ? "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-700 dark:from-emerald-900/50 dark:to-emerald-800/50 dark:text-emerald-300"
                            : amendment.status === "REJECTED"
                              ? "bg-gradient-to-r from-red-100 to-red-200 text-red-700 dark:from-red-900/50 dark:to-red-800/50 dark:text-red-300"
                              : "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-700 dark:from-amber-900/50 dark:to-amber-800/50 dark:text-amber-300"
                        )}>
                          {getAmendmentStatus(amendment.status, ar)}
                        </span>
                      </div>
                      {amendment.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {amendment.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(amendment.date).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-2">
                  <FileText className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {tAuto('auto.noAmendments')}
                </p>
                <p className="text-[10px] text-slate-400/60 dark:text-slate-500/60 mt-0.5">
                  {tAuto('auto.amendmentsWillAppearHereWhenAdded')}
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <SignDocumentDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        documentId={contract.id}
        documentName={contract.title}
        language={ar ? "ar" : "en"}
      />
    </div>
  );
}
