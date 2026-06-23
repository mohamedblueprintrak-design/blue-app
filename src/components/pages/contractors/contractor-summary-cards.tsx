"use client";


import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { Users, Star, Gavel, Building2 } from "lucide-react";
import { RatingStars } from "./rating-stars";
import type { ContractorItem } from "./types";
import { getCategoryConfig } from "./helpers";
import { useMemo } from "react";

interface ContractorSummaryCardsProps {
  ar: boolean;
  contractors: ContractorItem[];
}

export function ContractorSummaryCards({ ar, contractors }: ContractorSummaryCardsProps) {
  const tAuto = useTranslations();
  const totalContractors = contractors.length;
  const avgRating = totalContractors > 0
    ? (contractors.reduce((s, c) => s + c.rating, 0) / totalContractors).toFixed(1)
    : "0";
  const totalBids = contractors.reduce((s, c) => s + c._count.bids, 0);
  const topCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    contractors.forEach((c) => { if (c.category) counts[c.category] = (counts[c.category] || 0) + 1; });
    const max = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return max ? getCategoryConfig(max[0]) : null;
  }, [contractors]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Users className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-slate-100">{tAuto('auto.totalContractors')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{totalContractors}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Star className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-amber-100">{tAuto('auto.avgRating')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white tabular-nums">{avgRating}</span>
            <RatingStars rating={Math.round(Number(avgRating))} />
          </div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Gavel className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-teal-100">{tAuto('auto.totalBids')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{totalBids}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Building2 className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-purple-100">{tAuto('auto.topCategory')}</span>
          </div>
          <div className="text-sm font-bold text-white">
            {topCategory ? (ar ? topCategory.ar : topCategory.en) : (ar ? "—" : "—")}
          </div>
        </div>
      </Card>
    </div>
  );
}
