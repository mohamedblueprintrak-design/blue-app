"use client";


import { useTranslations } from 'next-intl';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Building2,
  User,
  Plug,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./section-header";

interface BillingTabProps {
  isAr: boolean;
}

export function BillingTab({ isAr }: BillingTabProps) {
  const tAuto = useTranslations();
  return (
    <Card>
      <CardContent className="p-6">
        <SectionHeader
          icon={CreditCard}
          title={tAuto('auto.billingSubscription')}
          subtitle={tAuto('auto.manageYourPlanAndSubscription')}
        />

        <div className="rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 p-5 text-white shadow-lg shadow-teal-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm opacity-80">
              {tAuto('auto.currentPlan')}
            </span>
            <Badge className="bg-white/20 text-white border-0">
              {tAuto('auto.professional')}
            </Badge>
          </div>
          <h3 className="text-2xl font-bold mb-1">
            {tAuto('auto.professionalPlan')}
          </h3>
          <p className="text-sm opacity-80 mb-4">
            {tAuto('auto.upTo50UsersAndUnlimitedProjects')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: tAuto('auto.users'), value: "8/50", icon: User, color: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400" },
            { label: tAuto('auto.projects'), value: "5", icon: Building2, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" },
            { label: tAuto('auto.storage'), value: "2.4 GB", icon: CreditCard, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
            { label: tAuto('auto.aPICalls'), value: "1,240", icon: Plug, color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center"
            >
              <div className={cn("w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center", stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Admin contact message for billing changes */}
        <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {tAuto('auto.subscriptionChanges')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {tAuto('auto.toUpgradeYourPlanOrManageBillingPleaseCo')}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
