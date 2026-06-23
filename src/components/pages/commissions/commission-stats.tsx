"use client";


import { useTranslations } from 'next-intl';
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, BadgeCheck, Users, Gift, Megaphone, DollarSign, Target, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

// ===== Commission Stats =====
interface CommissionStatsProps {
  language: "ar" | "en";
  totalPaid: number;
  totalPending: number;
  totalApproved: number;
}

export function CommissionStats({ language, totalPaid, totalPending, totalApproved }: CommissionStatsProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><CheckCircle className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-emerald-100">{tAuto('auto.paid')}</span>
          </div>
          <div className="text-lg font-bold text-white font-mono tabular-nums">{formatCurrency(totalPaid, ar)}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Clock className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-amber-100">{tAuto('auto.pending')}</span>
          </div>
          <div className="text-lg font-bold text-white font-mono tabular-nums">{formatCurrency(totalPending, ar)}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-sky-500 to-cyan-600 dark:from-sky-600 dark:to-cyan-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><BadgeCheck className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-sky-100">{tAuto('auto.approved')}</span>
          </div>
          <div className="text-lg font-bold text-white font-mono tabular-nums">{formatCurrency(totalApproved, ar)}</div>
        </div>
      </Card>
    </div>
  );
}

// ===== Referral Stats =====
interface ReferralStatsProps {
  language: "ar" | "en";
  activeReferrals: number;
  totalReferrals: number;
  totalRewards: number;
}

export function ReferralStats({ language, activeReferrals, totalReferrals, totalRewards }: ReferralStatsProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Users className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-teal-100">{tAuto('auto.activeReferrals')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{activeReferrals}</div>
          <p className="text-[10px] text-white/60 mt-1">{totalReferrals} {tAuto('auto.totalReferrals')}</p>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Gift className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-violet-100">{tAuto('auto.totalRewards')}</span>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">{formatCurrency(totalRewards, ar)}</div>
        </div>
      </Card>
    </div>
  );
}

// ===== Campaign Stats =====
interface CampaignStatsProps {
  language: "ar" | "en";
  campaignCount: number;
  totalBudget: number;
  totalLeads: number;
  totalConversions: number;
}

export function CampaignStats({ language, campaignCount, totalBudget, totalLeads, totalConversions }: CampaignStatsProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Megaphone className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-teal-100">{tAuto('auto.campaigns')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{campaignCount}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><DollarSign className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-amber-100">{tAuto('auto.budget')}</span>
          </div>
          <div className="text-xl font-bold text-white font-mono tabular-nums">{formatCurrency(totalBudget, ar)}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 dark:from-sky-600 dark:to-blue-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><Target className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-sky-100">{tAuto('auto.leads')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{totalLeads}</div>
        </div>
      </Card>
      <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm"><TrendingUp className="h-3.5 w-3.5 text-white" /></div>
            <span className="text-xs text-emerald-100">{tAuto('auto.conversions')}</span>
          </div>
          <div className="text-xl font-bold text-white tabular-nums">{totalConversions}</div>
          <p className="text-[10px] text-white/60 mt-1">
            {totalLeads > 0 ? `${((totalConversions / totalLeads) * 100).toFixed(1)}%` : "—"} {tAuto('auto.convRate')}
          </p>
        </div>
      </Card>
    </div>
  );
}
