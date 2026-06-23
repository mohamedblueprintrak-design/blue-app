"use client";


import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Eye, Clock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo, getStatusBadge, getAlertIcon, getAlertIconColor, getAlertBorderColor, getAlertBgColor } from "./helpers";
import type { RecentProject, DashboardAlert } from "./types";

interface RecentProjectsAlertsProps {
  recentProjects: RecentProject[];
  alerts: DashboardAlert[];
  isAr: boolean;
  onProjectClick: (projectId: string) => void;
}

export function RecentProjectsAlerts({ recentProjects, alerts, isAr, onProjectClick }: RecentProjectsAlertsProps) {
  const tAuto = useTranslations();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Recent Projects */}
      <Card className="lg:col-span-2 rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
            {tAuto('auto.recentProjects')}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            {tAuto('auto.lastUpdatedProjects')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 pb-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-4">
                  {tAuto('auto.number')}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {tAuto('auto.project')}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden md:table-cell">
                  {tAuto('auto.client')}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {tAuto('auto.status1')}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">
                  {tAuto('auto.progress')}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentProjects.map((project) => (
                <TableRow
                  key={project.id}
                  className="border-slate-100 dark:border-slate-800 cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
                  onClick={() => onProjectClick(project.id)}
                >
                  <TableCell className="px-4">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {project.number}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {isAr ? project.name : (project.nameEn || project.name)}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {timeAgo(project.updatedAt, isAr)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {project.clientCompany || project.clientName}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(project.status, isAr)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-[60px] h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            project.progress >= 80 ? "bg-emerald-500" :
                            project.progress >= 40 ? "bg-teal-500" :
                            project.progress >= 20 ? "bg-amber-500" : "bg-slate-400"
                          )}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums w-8 text-start">
                        {Math.round(project.progress)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        onProjectClick(project.id);
                      }}
                      aria-label="View project"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/50 relative">
          {/* Teal accent line */}
          <div className="absolute top-0 start-0 end-0 h-[3px] rounded-t-xl bg-gradient-to-l from-teal-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
                {tAuto('auto.importantAlerts')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tAuto('auto.requiresYourImmediateAttention')}
              </CardDescription>
            </div>
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                {alerts.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShieldCheck className="h-8 w-8 text-emerald-400 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tAuto('auto.noAlertsAtThisTime')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alert) => {
                const IconComponent = getAlertIcon(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors hover:brightness-95 dark:hover:brightness-110",
                      getAlertBorderColor(alert.severity),
                      getAlertBgColor(alert.severity)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                        getAlertIconColor(alert.severity)
                      )}>
                        <IconComponent className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                          {isAr ? alert.titleAr : alert.titleEn}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                          {isAr ? alert.descriptionAr : alert.descriptionEn}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(alert.timestamp, isAr)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* View All Link */}
              <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 mt-1">
                {tAuto('auto.viewAll')}
                <ArrowUpRight className="h-3 w-3 ms-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
