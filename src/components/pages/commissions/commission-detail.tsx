"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit2, Clock, Trash2, ArrowUpRight, MoreVertical } from "lucide-react";
import { getCampaignStatusConfig, getCampaignTypeConfig } from "./types";
import type { CampaignItem } from "./types";

// ===== Campaign Detail Card =====
interface CampaignDetailCardProps {
  language: "ar" | "en";
  campaign: CampaignItem;
  onEdit: (campaign: CampaignItem) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function CampaignDetailCard({ language, campaign, onEdit, onStatusChange, onDelete }: CampaignDetailCardProps) {
  const ar = language === "ar";
  const sc = getCampaignStatusConfig(campaign.status);
  const tc = getCampaignTypeConfig(campaign.type);
  const roi = campaign.spent > 0 ? (((campaign.conversions * 5000) - campaign.spent) / campaign.spent * 100) : 0;
  const budgetPercent = campaign.budget > 0 ? Math.min((campaign.spent / campaign.budget) * 100, 100) : 0;

  return (
    <Card className="border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{campaign.name}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{ar ? tc.ar : tc.en}</p>
          </div>
          <div className="flex items-center gap-1.5 ms-2">
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
              {ar ? sc.ar : sc.en}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400" aria-label="More options"><MoreVertical className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={ar ? "start" : "end"}>
                <DropdownMenuItem onClick={() => onEdit(campaign)}>
                  <Edit2 className="h-3.5 w-3.5 me-1.5" />{ar ? "تعديل" : "Edit"}
                </DropdownMenuItem>
                {campaign.status === "ACTIVE" && (
                  <DropdownMenuItem onClick={() => onStatusChange(campaign.id, "PAUSED")}>
                    <Clock className="h-3.5 w-3.5 me-1.5" />{ar ? "إيقاف" : "Pause"}
                  </DropdownMenuItem>
                )}
                {campaign.status === "PAUSED" && (
                  <DropdownMenuItem onClick={() => onStatusChange(campaign.id, "ACTIVE")}>
                    <ArrowUpRight className="h-3.5 w-3.5 me-1.5" />{ar ? "تفعيل" : "Activate"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-red-500" onClick={() => onDelete(campaign.id)}>
                  <Trash2 className="h-3.5 w-3.5 me-1.5" />{ar ? "حذف" : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">{ar ? "المصروف من الميزانية" : "Budget Spent"}</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 tabular-nums">{budgetPercent.toFixed(0)}%</span>
          </div>
          <Progress value={budgetPercent} className="h-1.5" />
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 font-mono tabular-nums">{formatCurrency(campaign.spent, ar)}</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono tabular-nums">{formatCurrency(campaign.budget, ar)}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-sky-600 dark:text-sky-400 tabular-nums">{campaign.leads}</p>
            <p className="text-[9px] text-slate-500">{ar ? "محتملين" : "Leads"}</p>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{campaign.conversions}</p>
            <p className="text-[9px] text-slate-500">{ar ? "تحويلات" : "Conv."}</p>
          </div>
          <div className="text-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className={cn("text-lg font-bold tabular-nums", roi >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
              {roi >= 0 ? "+" : ""}{roi.toFixed(0)}%
            </p>
            <p className="text-[9px] text-slate-500">ROI</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
