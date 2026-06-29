"use client";


import { useTranslations } from 'next-intl';
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, Award, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BidItem } from "./types";
import { getStatusConfig, EVALUATION_CRITERIA } from "./types";

export function ComparisonMatrix({
  bids,
  ar,
}: {
  bids: BidItem[];
  ar: boolean;
}) {
  const tAuto = useTranslations();
  const [sortBy, setSortBy] = useState<"totalScore" | "amount" | "technicalScore">("totalScore");

  const sorted = useMemo(() => {
    return [...bids].sort((a, b) => {
      if (sortBy === "amount") return b.amount - a.amount;
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });
  }, [bids, sortBy]);

  const topBid = sorted.length > 0 && sorted[0].totalScore > 0 ? sorted[0] : null;

  const chartData = useMemo(() => {
    return sorted.map((b) => ({
      name: b.contractorName.substring(0, 15),
      [tAuto('auto.tech')]: b.technicalScore,
      [tAuto('auto.fin')]: b.financialScore,
      [tAuto('auto.total')]: Math.round(b.totalScore),
    }));
  }, [sorted, tAuto]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">{tAuto('auto.sortBy')}</span>
        <div className="flex gap-1.5">
          {[
            { key: "totalScore" as const, ar: "المجموع", en: "Total" },
            { key: "technicalScore" as const, ar: "فني", en: "Technical" },
            { key: "amount" as const, ar: "المبلغ", en: "Amount" },
          ].map((s) => (
            <Button
              key={s.key}
              variant={sortBy === s.key ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 text-xs rounded-lg",
                sortBy === s.key ? "bg-brand-navy-600 hover:bg-brand-navy-700 text-white" : ""
              )}
              onClick={() => setSortBy(s.key)}
            >
              <ArrowUpDown className="h-3 w-3 me-1" />
              {ar ? s.ar : s.en}
            </Button>
          ))}
        </div>
      </div>

      {/* Criteria Legend */}
      <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {tAuto('auto.evaluationCriteria')}
        </span>
        {EVALUATION_CRITERIA.map((c) => (
          <Badge key={c.key} variant="secondary" className="text-[10px]">
            {ar ? c.ar : c.en} ({c.weight}%)
          </Badge>
        ))}
      </div>

      {/* Chart */}
      {sorted.length > 0 && sorted.some((b) => b.totalScore > 0) && (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <h4 className="text-xs font-semibold text-slate-500 mb-3">
              {tAuto('auto.visualComparison')}
            </h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-slate-100)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(value: number) => [`${value}`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey={tAuto('auto.tech')} fill="var(--color-amber-500)" radius={[0, 2, 2, 0]} barSize={12} />
                  <Bar dataKey={tAuto('auto.fin')} fill="var(--color-cyan-500)" radius={[0, 2, 2, 0]} barSize={12} />
                  <Bar dataKey={tAuto('auto.total')} fill="var(--color-brand-navy-600)" radius={[0, 2, 2, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
        <ScrollArea className="max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold w-8">#</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.contractor')}</TableHead>
                <TableHead className="text-xs font-semibold text-end">{tAuto('auto.amount')}</TableHead>
                <TableHead className="text-xs font-semibold text-end">{tAuto('auto.technical')}</TableHead>
                <TableHead className="text-xs font-semibold text-end">{tAuto('auto.financial')}</TableHead>
                <TableHead className="text-xs font-semibold text-end">{tAuto('auto.total')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
                <TableHead className="text-xs font-semibold">{tAuto('auto.recommend')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((bid, idx) => {
                const sc = getStatusConfig(bid.status);
                const isTop = topBid && bid.id === topBid.id && bid.totalScore > 0;
                return (
                  <TableRow
                    key={bid.id}
                    className={cn(
                      "transition-colors",
                      idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20",
                      isTop && "bg-brand-navy-50/50 dark:bg-brand-navy-950/20"
                    )}
                  >
                    <TableCell className="text-xs font-bold text-slate-400">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isTop && <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0" />}
                        <div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">{bid.contractorName}</span>
                          {bid.contractor && (
                            <div className="text-[10px] text-slate-400">{ar ? bid.contractor.companyName : bid.contractor.companyEn || bid.contractor.companyName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium font-mono tabular-nums text-end">
                      {formatCurrency(bid.amount, ar)}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("text-xs font-bold tabular-nums", bid.technicalScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : bid.technicalScore >= 40 ? "text-amber-600" : "text-red-500")}>
                          {bid.technicalScore}
                        </span>
                        <Progress value={bid.technicalScore} className="w-16 h-1 [&>div]:bg-amber-500" />
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("text-xs font-bold tabular-nums", bid.financialScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : bid.financialScore >= 40 ? "text-amber-600" : "text-red-500")}>
                          {bid.financialScore}
                        </span>
                        <Progress value={bid.financialScore} className="w-16 h-1 [&>div]:bg-cyan-500" />
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn("text-sm font-bold tabular-nums", bid.totalScore >= 70 ? "text-emerald-600 dark:text-emerald-400" : bid.totalScore >= 40 ? "text-amber-600" : "text-red-500")}>
                          {Math.round(bid.totalScore)}
                        </span>
                        <Progress value={bid.totalScore} className="w-20 h-1.5 [&>div]:bg-brand-navy-500" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                        {ar ? sc.ar : sc.en}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isTop && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 text-[10px]">
                          <Award className="h-3 w-3 me-1" />
                          {tAuto('auto.recommended')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    {tAuto('auto.noBidsToCompare')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
