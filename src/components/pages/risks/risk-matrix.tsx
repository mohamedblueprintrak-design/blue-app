"use client";


import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { getMatrixCellColor, getMatrixDotColor } from "./helpers";
import type { RiskItem } from "./types";

interface RiskMatrixProps {
  ar: boolean;
  risks: RiskItem[];
  onSelectRisk: (risk: RiskItem) => void;
}

export function RiskMatrix({ ar, risks, onSelectRisk }: RiskMatrixProps) {
  const tAuto = useTranslations();
  const matrixData = risks.reduce<Record<string, RiskItem[]>>((acc, risk) => {
    const key = `${risk.probability}-${risk.impact}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(risk);
    return acc;
  }, {});

  const probLabels = [5, 4, 3, 2, 1];
  const impactLabels = [1, 2, 3, 4, 5];
  const probTexts = ar
    ? ["مؤكد تقريباً", "محتمل جداً", "محتمل", "غير محتمل", "نادر"]
    : ["Almost Certain", "Likely", "Possible", "Unlikely", "Rare"];
  const impactTexts = ar
    ? ["ضئيل", "ثانوي", "متوسط", "كبير", "كارثي"]
    : ["Insignificant", "Minor", "Moderate", "Major", "Catastrophic"];

  return (
    <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="h-4 w-4 text-brand-navy-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {tAuto('auto.riskMatrix')}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          <div className="flex">
            {/* Y-axis */}
            <div className="flex flex-col shrink-0">
              <div className="h-6"></div>
              {probLabels.map((prob, idx) => (
                <div key={prob} className="h-14 flex items-center justify-end pe-2">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">{prob}</span>
                    <span className="text-[8px] text-slate-400 block">{probTexts[idx]}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1">
              {/* Header row */}
              <div className="grid grid-cols-5 gap-1 h-6">
                {impactLabels.map((impact, idx) => (
                  <div key={impact} className="text-center">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{impact}</span>
                    <span className="text-[8px] text-slate-400 block">{impactTexts[idx]}</span>
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {probLabels.map((prob) => (
                <div key={prob} className="grid grid-cols-5 gap-1 mb-1">
                  {impactLabels.map((impact) => {
                    const key = `${prob}-${impact}`;
                    const cellRisks = matrixData[key] || [];
                    const scoreVal = prob * impact;
                    return (
                      <div
                        key={key}
                        className={`relative h-14 rounded-md border flex flex-col items-center justify-center transition-all hover:scale-[1.02] cursor-pointer ${getMatrixCellColor(prob, impact)}`}
                        onClick={() => {
                          if (cellRisks[0]) {
                            onSelectRisk(cellRisks[0]);
                          }
                        }}
                      >
                        <span className="text-xs font-bold text-slate-500/70">{scoreVal}</span>
                        {cellRisks.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {cellRisks.slice(0, 4).map((r) => (
                              <div
                                key={r.id}
                                className={`w-2.5 h-2.5 rounded-full ${getMatrixDotColor(prob, impact)} ring-1 ring-white dark:ring-slate-900`}
                                title={r.title}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        {[
          { label: tAuto('auto.low14'), color: "bg-green-500" },
          { label: tAuto('auto.medium59'), color: "bg-yellow-500" },
          { label: tAuto('auto.high1015'), color: "bg-orange-500" },
          { label: tAuto('auto.critical1625'), color: "bg-red-500" },
        ].map((legend) => (
          <div key={legend.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${legend.color}`} />
            <span className="text-[10px] text-slate-500">{legend.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
