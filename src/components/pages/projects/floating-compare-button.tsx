"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows } from "lucide-react";
import { MAX_COMPARE } from "./types";

interface FloatingCompareButtonProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  selectedIdsSize: number;
  onShowCompare: () => void;
}

export function FloatingCompareButton({
  isAr: _isAr,
  t,
  selectedIdsSize,
  onShowCompare,
}: FloatingCompareButtonProps) {
  if (selectedIdsSize < 2) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      <Button
        onClick={onShowCompare}
        disabled={selectedIdsSize > MAX_COMPARE}
        className="bg-gradient-to-l from-brand-navy-500 to-cyan-500 hover:from-brand-navy-600 hover:to-cyan-600 text-white shadow-xl shadow-brand-navy-500/30 rounded-full px-6 h-12 gap-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GitCompareArrows className="h-4 w-4" />
        {selectedIdsSize > MAX_COMPARE
          ? t(`يمكنك مقارنة ${MAX_COMPARE} مشاريع فقط`, `Max ${MAX_COMPARE} projects for comparison`)
          : t("مقارنة المشاريع", "Compare Projects")}
        <Badge className="bg-white/20 text-white border-0 text-xs h-5 min-w-[20px] justify-center rounded-full">
          {Math.min(selectedIdsSize, MAX_COMPARE)}
        </Badge>
      </Button>
    </div>
  );
}
