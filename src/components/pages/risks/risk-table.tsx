"use client";


import { useTranslations } from 'next-intl';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShieldAlert, Eye, Trash2, TrendingDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryBadge, getStrategyBadge, getStatusBadge, getScoreColor } from "./helpers";
import type { RiskItem } from "./types";
import { UseMutateFunction } from "@tanstack/react-query";

interface RiskTableProps {
  ar: boolean;
  isLoading: boolean;
  filteredRisks: RiskItem[];
  onSelectRisk: (risk: RiskItem) => void;
  onDeleteRisk: (id: string) => void;
  onUpdateStatus: UseMutateFunction<unknown, Error, { id: string; status: string }, unknown>;
}

export function RiskTable({
  ar,
  isLoading,
  filteredRisks,
  onSelectRisk,
  onDeleteRisk,
  onUpdateStatus,
}: RiskTableProps) {
  const tAuto = useTranslations();
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (filteredRisks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
          <ShieldAlert className="h-7 w-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
          {tAuto('auto.noRisks')}
        </h3>
        <p className="text-sm text-slate-500">
          {tAuto('auto.startByAddingANewRisk')}
        </p>
      </div>
    );
  }

  return (
    <Card className="border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
      <ScrollArea className="max-h-[calc(100vh-500px)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold py-2.5 px-3">{tAuto('auto.title')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3 hidden lg:table-cell">{tAuto('auto.project')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3">{tAuto('auto.category')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3 text-center">{tAuto('auto.prob')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3 text-center">{tAuto('auto.impact')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3 text-center">{tAuto('auto.score')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3">{tAuto('auto.strategy')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3">{tAuto('auto.status1')}</TableHead>
              <TableHead className="text-xs font-semibold py-2.5 px-3 w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRisks.map((risk) => (
              <TableRow
                key={risk.id}
                className={cn("group even:bg-slate-50/50 dark:even:bg-slate-800/20 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors", risk.score >= 16 && "border-s-2 border-s-red-200 dark:border-s-red-800/50")}
                onClick={() => onSelectRisk(risk)}
              >
                <TableCell className="py-2.5 px-3">
                  <span className="text-xs font-medium truncate max-w-[180px] block">{risk.title}</span>
                </TableCell>
                <TableCell className="py-2.5 px-3 hidden lg:table-cell">
                  <span className="text-xs truncate max-w-[120px] block">
                    {risk.project ? (ar ? risk.project.name : risk.project.nameEn || risk.project.name) : "-"}
                  </span>
                </TableCell>
                <TableCell className="py-2.5 px-3">
                  {getCategoryBadge(risk.category, ar)}
                </TableCell>
                <TableCell className="py-2.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    {Array.from({length: 5}).map((_, i) => (
                      <div key={i} className={`w-1.5 h-3 rounded-sm ${i < risk.probability ? (risk.probability >= 4 ? "bg-red-500" : risk.probability >= 3 ? "bg-amber-500" : "bg-green-500") : "bg-slate-200 dark:bg-slate-700"}`} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-2.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    {Array.from({length: 5}).map((_, i) => (
                      <div key={i} className={`w-1.5 h-3 rounded-sm ${i < risk.impact ? (risk.impact >= 4 ? "bg-red-500" : risk.impact >= 3 ? "bg-amber-500" : "bg-green-500") : "bg-slate-200 dark:bg-slate-700"}`} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-2.5 px-3 text-center">
                  <Badge className={`text-[10px] h-6 w-8 flex items-center justify-center font-bold ${getScoreColor(risk.score)} text-white border-0`}>
                    {risk.score}
                  </Badge>
                </TableCell>
                <TableCell className="py-2.5 px-3">
                  {getStrategyBadge(risk.strategy, ar)}
                </TableCell>
                <TableCell className="py-2.5 px-3">
                  {getStatusBadge(risk.status, ar)}
                </TableCell>
                <TableCell className="py-2.5 px-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={ar ? "start" : "end"} className="w-36">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectRisk(risk); }}>
                        <Eye className="h-3.5 w-3.5 me-2" />
                        {tAuto('auto.view')}
                      </DropdownMenuItem>
                      {risk.status === "OPEN" && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus({ id: risk.id, status: "mitigating" }); }}>
                          <ShieldAlert className="h-3.5 w-3.5 me-2" />
                          {tAuto('auto.mitigate')}
                        </DropdownMenuItem>
                      )}
                      {(risk.status === "OPEN" || risk.status === "mitigating") && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus({ id: risk.id, status: "RESOLVED" }); }}>
                          <TrendingDown className="h-3.5 w-3.5 me-2" />
                          {tAuto('auto.resolve')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600 dark:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(tAuto('auto.deleteThisRisk'))) {
                            onDeleteRisk(risk.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 me-2" />
                        {tAuto('auto.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
