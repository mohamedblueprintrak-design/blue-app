"use client";


import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ActivityRecord, actionLabels, entityLabels, getAvatarColor, formatTime } from "./types";

interface AuditLogProps {
  isAr: boolean;
  activities: ActivityRecord[];
  activitiesLoading: boolean;
  activityFilter: string;
  setActivityFilter: (filter: string) => void;
}

export function AuditLog({
  isAr,
  activities,
  activitiesLoading,
  activityFilter,
  setActivityFilter,
}: AuditLogProps) {
  const tAuto = useTranslations();
  return (
    <TabsContent value="activity" className="mt-2">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              {tAuto('auto.activityLog')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-40 h-9 text-xs rounded-lg">
                  <SelectValue placeholder={tAuto('auto.allActions')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tAuto('auto.all')}</SelectItem>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {isAr ? label.ar : label.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">
                {tAuto('auto.noActivitiesRecorded')}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-xs font-semibold">{tAuto('auto.user')}</TableHead>
                    <TableHead className="text-xs font-semibold">{tAuto('auto.action')}</TableHead>
                    <TableHead className="text-xs font-semibold hidden md:table-cell">{tAuto('auto.entity')}</TableHead>
                    <TableHead className="text-xs font-semibold hidden lg:table-cell">{tAuto('auto.details')}</TableHead>
                    <TableHead className="text-xs font-semibold">{tAuto('auto.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((act, idx) => {
                    const actionInfo = actionLabels[act.action] || { ar: act.action, en: act.action };
                    const entityInfo = entityLabels[act.entityType] || { ar: act.entityType, en: act.entityType };
                    const actionColors: Record<string, string> = {
                      CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
                      UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                      DELETE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
                      APPROVE: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
                      REJECT: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                    };
                    return (
                      <TableRow
                        key={act.id}
                        className={cn(
                          "hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors",
                          idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20"
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={cn("text-[10px] font-semibold", getAvatarColor(act.user?.name || ""))}>
                                {act.user?.name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm truncate max-w-32 text-slate-900 dark:text-white">{act.user?.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-[10px] h-5 px-1.5 border-0 font-medium", actionColors[act.action] || "bg-slate-100 text-slate-700")}>
                            {isAr ? actionInfo.ar : actionInfo.en}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                          {isAr ? entityInfo.ar : entityInfo.en}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-slate-500 max-w-48 truncate">
                          {act.details || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {formatTime(act.createdAt, isAr)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
