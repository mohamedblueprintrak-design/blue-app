"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, X, Phone, Mail, MapPin, FileText, Award, TrendingUp, Gavel, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import type { BidItem, ContractorFull } from "./types";
import { getStatusConfig, getCategoryConfig } from "./types";
import { RatingStars } from "./rating-stars";

export function ContractorDetailPanel({
  contractorId,
  ar,
  onClose,
}: {
  contractorId: string;
  ar: boolean;
  onClose: () => void;
}) {
  const { data: contractor, isLoading } = useQuery<ContractorFull & { bids: BidItem[] }>({
    queryKey: ["contractor-detail", contractorId],
    queryFn: async () => {
      const res = await fetch(`/api/contractors/${contractorId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!contractorId,
  });

  if (isLoading) {
    return (
      <div className="w-full lg:w-[400px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 px-4 py-3">
          <Skeleton className="h-5 w-32 bg-white/20" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      </div>
    );
  }

  if (!contractor) return null;

  const catConf = getCategoryConfig(contractor.category);

  return (
    <div className="w-full lg:w-[400px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-white/80" />
            <h3 className="text-sm font-semibold text-white">{ar ? "ملف المقاول" : "Contractor Profile"}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="h-[300px] lg:h-[calc(100vh-340px)]">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {ar ? contractor.name : contractor.nameEn || contractor.name}
            </h4>
            {contractor.companyName && (
              <p className="text-sm text-slate-500">{ar ? contractor.companyName : contractor.companyEn || contractor.companyName}</p>
            )}
            <div className="flex items-center gap-2">
              <RatingStars rating={contractor.rating} size="md" />
              <span className="text-xs text-slate-400">{contractor.rating}/5</span>
            </div>
            <Badge className={cn("text-[10px]", catConf.color)}>{ar ? catConf.ar : catConf.en}</Badge>
          </div>

          {/* Details */}
          <div className="space-y-2.5">
            {contractor.contactPerson && (
              <div className="flex items-start gap-2.5">
                <UserCheck className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "جهة الاتصال" : "Contact"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{contractor.contactPerson}</span>
                </div>
              </div>
            )}
            {contractor.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300" dir="ltr">{contractor.phone}</span>
              </div>
            )}
            {contractor.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300" dir="ltr">{contractor.email}</span>
              </div>
            )}
            {contractor.address && (
              <div className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300">{contractor.address}</span>
              </div>
            )}
            {contractor.crNumber && (
              <div className="flex items-center gap-2.5">
                <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "السجل التجاري" : "CR"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono" dir="ltr">{contractor.crNumber}</span>
                </div>
              </div>
            )}
            {contractor.licenseNumber && (
              <div className="flex items-center gap-2.5">
                <Award className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "الترخيص" : "License"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono" dir="ltr">{contractor.licenseNumber}</span>
                  {contractor.licenseExpiry && (
                    <span className="text-[10px] text-slate-400 block ms-4">
                      {ar ? "ينتهي: " : "Expires: "}{new Date(contractor.licenseExpiry).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                    </span>
                  )}
                </div>
              </div>
            )}
            {contractor.experience && (
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "الخبرة" : "Experience"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{contractor.experience}</span>
                </div>
              </div>
            )}
            {contractor.specialties && (
              <div className="flex flex-wrap gap-1 pt-1">
                {contractor.specialties.split(",").map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{s.trim()}</Badge>
                ))}
              </div>
            )}
            {contractor.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400">{ar ? "ملاحظات" : "Notes"}</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{contractor.notes}</p>
              </div>
            )}
          </div>

          {/* Contractor Bids */}
          {contractor.bids && contractor.bids.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Gavel className="h-3.5 w-3.5" />
                {ar ? `العطاءات (${contractor.bids.length})` : `Bids (${contractor.bids.length})`}
              </h5>
              <div className="space-y-1.5">
                {contractor.bids.slice(0, 5).map((b) => {
                  const sc = getStatusConfig(b.status);
                  return (
                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {ar ? b.project.name : b.project.nameEn || b.project.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono tabular-nums">{formatCurrency(b.amount, ar)}</p>
                      </div>
                      <Badge className={cn("text-[9px]", sc.color)}>{ar ? sc.ar : sc.en}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
