"use client";


import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Gavel, ClipboardCheck, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryConfig } from "./helpers";
import { RatingStars } from "./rating-stars";
import type { ContractorItem } from "./types";

interface ContractorGridProps {
  ar: boolean;
  contractors: ContractorItem[];
  selectedContractor: string | null;
  onSelectContractor: (id: string) => void;
  onAddContractor: () => void;
}

export function ContractorGrid({
  ar,
  contractors,
  selectedContractor,
  onSelectContractor,
  onAddContractor,
}: ContractorGridProps) {
  const tAuto = useTranslations();
  if (contractors.length === 0) {
    return (
      <div className="flex-1">
        <div className="text-center py-16 text-slate-400 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{tAuto('auto.noContractorsFound')}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 rounded-lg"
            onClick={onAddContractor}
          >
            <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.addContractor')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {contractors.map((c) => {
          const catConf = getCategoryConfig(c.category);
          const isSelected = selectedContractor === c.id;
          return (
            <Card
              key={c.id}
              className={cn(
                "cursor-pointer hover:shadow-md transition-all overflow-hidden border-slate-200 dark:border-slate-700/50",
                isSelected && "ring-2 ring-teal-500 border-teal-500"
              )}
              onClick={() => onSelectContractor(c.id)}
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {ar ? c.name : c.nameEn || c.name}
                    </h4>
                    {c.companyName && (
                      <p className="text-xs text-slate-500 truncate">{ar ? c.companyName : c.companyEn || c.companyName}</p>
                    )}
                  </div>
                  <Badge className={cn("text-[10px] flex-shrink-0 ms-2", catConf.color)}>
                    {ar ? catConf.ar : catConf.en}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <RatingStars rating={c.rating} />
                  <span className="text-xs text-slate-400">{c.rating}/5</span>
                </div>
                {c.specialties && (
                  <div className="flex flex-wrap gap-1">
                    {c.specialties.split(",").slice(0, 3).map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                        {s.trim()}
                      </Badge>
                    ))}
                    {c.specialties.split(",").length > 3 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        +{c.specialties.split(",").length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Gavel className="h-3 w-3" />{c._count.bids}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClipboardCheck className="h-3 w-3" />{c._count.evaluations}
                  </span>
                  {c.phone && (
                    <span className="flex items-center gap-1 ms-auto" dir="ltr">
                      <Phone className="h-3 w-3" />{c.phone}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
