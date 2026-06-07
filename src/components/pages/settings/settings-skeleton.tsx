"use client";

import { Card, CardContent } from "@/components/ui/card";

export function SettingsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
