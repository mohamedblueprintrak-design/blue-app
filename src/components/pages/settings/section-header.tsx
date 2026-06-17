"use client";

import { Building2 } from "lucide-react";

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Building2;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-1 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="h-0.5 w-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" />
    </div>
  );
}
