"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, Target, CheckCircle2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { categories, CATEGORY_VALUES, BAR_COLORS } from "./constants";
import type { RiskItem } from "./types";

interface RiskStatsProps {
  ar: boolean;
  risks: RiskItem[];
}

export function RiskStats({ ar, risks }: RiskStatsProps) {
  const totalRisks = risks.length;
  const criticalRisks = risks.filter((r) => r.score >= 16).length;
  const highRisks = risks.filter((r) => r.score >= 10 && r.score < 16).length;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي المخاطر" : "Total Risks"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalRisks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "عالي / حرج" : "High / Critical"}</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums">{criticalRisks + highRisks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "تم التخفيف" : "Mitigated"}</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{risks.filter(r => r.status === "RESOLVED" || r.status === "CLOSED").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Bar */}
      {risks.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
            {(() => {
              const low = risks.filter(r => r.score <= 4).length;
              const medium = risks.filter(r => r.score >= 5 && r.score <= 9).length;
              const high = risks.filter(r => r.score >= 10 && r.score <= 15).length;
              const critical = risks.filter(r => r.score >= 16).length;
              const total = risks.length || 1;
              return (
                <>
                  {low > 0 && <div className="bg-green-500 h-full" style={{width: `${(low/total)*100}%`}} />}
                  {medium > 0 && <div className="bg-yellow-500 h-full" style={{width: `${(medium/total)*100}%`}} />}
                  {high > 0 && <div className="bg-orange-500 h-full" style={{width: `${(high/total)*100}%`}} />}
                  {critical > 0 && <div className="bg-red-500 h-full" style={{width: `${(critical/total)*100}%`}} />}
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            {[{color: "bg-green-500", label: ar ? "منخفض" : "Low"}, {color: "bg-yellow-500", label: ar ? "متوسط" : "Medium"}, {color: "bg-orange-500", label: ar ? "عالي" : "High"}, {color: "bg-red-500", label: ar ? "حرج" : "Critical"}].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-[10px] text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Distribution Mini Chart */}
      {risks.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-teal-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {ar ? "توزيع المخاطر" : "Risk Distribution"}
              </h3>
            </div>
            <div className="flex items-end gap-2 h-20">
              {CATEGORY_VALUES.map((cat) => {
                const count = risks.filter(r => r.category === cat).length;
                const maxCount = Math.max(...CATEGORY_VALUES.map(c => risks.filter(r => r.category === c).length), 1);
                const catCfg = categories.find(c => c.value === cat);
                return (
                  <div key={cat} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 tabular-nums">{count}</span>
                    <div className="w-full rounded-t-sm bg-slate-100 dark:bg-slate-800 relative" style={{height: "56px"}}>
                      <div className={cn("absolute bottom-0 w-full rounded-t-sm", BAR_COLORS[cat])} style={{height: `${(count/maxCount)*100}%`, minHeight: count > 0 ? "4px" : "0"}} />
                    </div>
                    <span className="text-[8px] text-slate-400 text-center leading-tight">{catCfg ? (ar ? catCfg.ar : catCfg.en) : cat}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
