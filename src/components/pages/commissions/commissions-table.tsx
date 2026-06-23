"use client";


import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getMutationHeaders } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle, Wallet, MoreVertical, Trash2, ArrowUpRight, Gift, XCircle } from "lucide-react";
import { getCommissionStatusConfig, getCommissionTypeConfig, getReferralStatusConfig } from "./types";
import type { CommissionItem, ReferralItem } from "./types";

// ===== Commissions Table =====
interface CommissionsTableProps {
  language: "ar" | "en";
  commissions: CommissionItem[];
  isLoading: boolean;
}

export function CommissionsTable({ language, commissions, isLoading }: CommissionsTableProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/commissions/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["commissions"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/commissions/${id}`, { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["commissions"] }); },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Card key={i} className="py-0 gap-0"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <ScrollArea className="max-h-[calc(100vh-380px)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold">{tAuto('auto.employee')}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.type')}</TableHead>
              <TableHead className="text-xs font-semibold text-end">{tAuto('auto.amount')}</TableHead>
              <TableHead className="text-xs font-semibold text-end">{ar ? "النسبة" : "%"}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
              <TableHead className="text-xs font-semibold hidden lg:table-cell">{tAuto('auto.date')}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{tAuto('auto.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((c, idx) => {
              const sc = getCommissionStatusConfig(c.status);
              const tc = getCommissionTypeConfig(c.type);
              return (
                <TableRow key={c.id} className={cn("transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50", idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{c.user.name}</TableCell>
                  <TableCell className="text-xs text-slate-500">{ar ? tc.ar : tc.en}</TableCell>
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white text-end font-mono tabular-nums">{formatCurrency(c.amount, ar)}</TableCell>
                  <TableCell className="text-xs text-slate-500 text-end font-mono tabular-nums">{c.percentage}%</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                      {ar ? sc.ar : sc.en}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US")}</TableCell>
                  <TableCell className="text-start">
                    <div className="flex items-center gap-1">
                      {c.status === "PENDING" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/30" onClick={() => statusMutation.mutate({ id: c.id, status: "APPROVED" })}>
                          <CheckCircle className="h-3 w-3 me-0.5" />{tAuto('auto.approve')}
                        </Button>
                      )}
                      {c.status === "APPROVED" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => statusMutation.mutate({ id: c.id, status: "PAID" })}>
                          <Wallet className="h-3 w-3 me-0.5" />{tAuto('auto.pay')}
                        </Button>
                      )}
                      {(c.status === "PENDING" || c.status === "APPROVED") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400" aria-label="More options"><MoreVertical className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={ar ? "start" : "end"}>
                            <DropdownMenuItem className="text-red-500" onClick={() => deleteMutation.mutate(c.id)}>
                              <Trash2 className="h-3.5 w-3.5 me-1.5" />{tAuto('auto.delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {commissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  {tAuto('auto.noCommissionsFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ===== Referrals Table =====
interface ReferralsTableProps {
  language: "ar" | "en";
  referrals: ReferralItem[];
  isLoading: boolean;
}

export function ReferralsTable({ language, referrals, isLoading }: ReferralsTableProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/referrals/${id}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["referrals"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/referrals/${id}`, { method: "DELETE", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["referrals"] }); },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => <Card key={i} className="py-0 gap-0"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
        </div>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <ScrollArea className="max-h-[calc(100vh-380px)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
              <TableHead className="text-xs font-semibold">{tAuto('auto.referrer')}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.referred')}</TableHead>
              <TableHead className="text-xs font-semibold hidden md:table-cell">{tAuto('auto.project')}</TableHead>
              <TableHead className="text-xs font-semibold">{tAuto('auto.status1')}</TableHead>
              <TableHead className="text-xs font-semibold text-end">{tAuto('auto.reward')}</TableHead>
              <TableHead className="text-xs font-semibold text-start">{tAuto('auto.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.map((r, idx) => {
              const sc = getReferralStatusConfig(r.status);
              return (
                <TableRow key={r.id} className={cn("transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50", idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white">{r.referrer.name}</TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">{r.referredName || "—"}</p>
                      <p className="text-[10px] text-slate-400">{r.referredPhone || r.referredEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-500">{r.project ? (ar ? r.project.name : r.project.nameEn || r.project.name) : "—"}</TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium", sc.color)}>
                      {ar ? sc.ar : sc.en}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-slate-900 dark:text-white text-end font-mono tabular-nums">
                    {r.rewardAmount > 0 ? formatCurrency(r.rewardAmount, ar) : "—"}
                  </TableCell>
                  <TableCell className="text-start">
                    <div className="flex items-center gap-1">
                      {r.status === "PENDING" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30" onClick={() => statusMutation.mutate({ id: r.id, status: "CONVERTED" })}>
                          <ArrowUpRight className="h-3 w-3 me-0.5" />{tAuto('auto.convert')}
                        </Button>
                      )}
                      {r.status === "CONVERTED" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30" onClick={() => statusMutation.mutate({ id: r.id, status: "rewarded" })}>
                          <Gift className="h-3 w-3 me-0.5" />{tAuto('auto.reward')}
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400" aria-label="More options"><MoreVertical className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={ar ? "start" : "end"}>
                          {r.status === "PENDING" && (
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: r.id, status: "EXPIRED" })}>
                              <XCircle className="h-3.5 w-3.5 me-1.5 text-slate-400" />{tAuto('auto.expire')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-500" onClick={() => deleteMutation.mutate(r.id)}>
                            <Trash2 className="h-3.5 w-3.5 me-1.5" />{tAuto('auto.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {referrals.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400">
                  {tAuto('auto.noReferralsFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
