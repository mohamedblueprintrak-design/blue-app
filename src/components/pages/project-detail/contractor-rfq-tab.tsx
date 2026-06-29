"use client";


import { useTranslations } from 'next-intl';
import React, { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getMutationHeaders, getCsrfToken } from "@/lib/csrf-client";
import {
  Users,
  HardHat,
  Star,
  Send,
  FileText,
  Upload,
  BarChart3,
  Award,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { getContractorCategoryLabel } from "./helpers";
import type { ContractorRFQBid } from "./types";

// ===== CONTRACTOR RFQ TAB =====
export default function ContractorRFQTab({ projectId, language }: { projectId: string; language: "ar" | "en" }) {
  const tAuto = useTranslations();
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [activeSub, setActiveSub] = useState("rfq");
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const quoteInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  const { data: bids, refetch } = useQuery({
    queryKey: ["project-bids-rfq", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/bids?projectId=${projectId}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return (data.bids || data || []) as ContractorRFQBid[];
    },
    enabled: !!projectId,
  });

  const { data: contractors } = useQuery({
    queryKey: ["contractors-list"],
    queryFn: async () => {
      const res = await fetch("/api/contractors");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      return data.contractors || data || [];
    },
  });

  const rfqMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contractor-rfq`, {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ contractorIds: selectedContractors }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { refetch(); setSelectedContractors([]); toast.success(t("تم إرسال طلب عرض السعر", "RFQ sent")); },
    onError: () => toast.error(t("فشل الإرسال", "Failed to send")),
  });

  const uploadQuoteMutation = useMutation({
    mutationFn: async ({ bidId, file }: { bidId: string; file: File }) => {
      const formData = new FormData();
      formData.append("quoteFile", file);
      const res = await fetch(`/api/projects/${projectId}/contractor-rfq/${bidId}/upload-quote`, {
        method: "POST",
        headers: { 'X-CSRF-Token': getCsrfToken() },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { refetch(); toast.success(t("تم رفع العرض", "Quote uploaded")); },
    onError: () => toast.error(t("فشل رفع العرض", "Failed to upload")),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/contractor-rfq/analyze`, { method: "POST", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_data) => { refetch(); toast.success(t("تم التحليل", "Analysis complete")); },
    onError: () => toast.error(t("فشل التحليل", "Analysis failed")),
  });

  const awardMutation = useMutation({
    mutationFn: async (bidId: string) => {
      const res = await fetch(`/api/projects/${projectId}/contractor-rfq/${bidId}/award`, { method: "POST", headers: getMutationHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { refetch(); toast.success(t("تمت الترسية", "Bid awarded")); },
    onError: () => toast.error(t("فشلت الترسية", "Failed to award")),
  });

  const uploadContractMutation = useMutation({
    mutationFn: async ({ bidId, file }: { bidId: string; file: File }) => {
      const formData = new FormData();
      formData.append("contractFile", file);
      const res = await fetch(`/api/projects/${projectId}/contractor-rfq/${bidId}/upload-contract`, {
        method: "POST",
        headers: { 'X-CSRF-Token': getCsrfToken() },
        body: formData,
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { refetch(); toast.success(t("تم رفع العقد", "Contract uploaded")); },
    onError: () => toast.error(t("فشل رفع العقد", "Failed to upload contract")),
  });

  const rfqBids = bids?.filter(b => b.rfqSentAt) || [];
  const quotesReceived = rfqBids.filter(b => b.quoteFile).length;
  const awardedBid = rfqBids.find(b => b.isAwarded);

  const rfqSubTabs = [
    { id: "rfq", icon: Send, labelAr: "اختيار المقاولين", labelEn: "Select" },
    { id: "quotes", icon: FileText, labelAr: "إدارة العروض", labelEn: "Quotes" },
    { id: "compare", icon: BarChart3, labelAr: "تحليل بالذكاء الاصطناعي", labelEn: "AI Compare" },
    { id: "award", icon: Award, labelAr: "الترسية", labelEn: "Award" },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <Card className="border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 flex items-center gap-2">
              {rfqSubTabs.map((st, idx) => (
                <React.Fragment key={st.id}>
                  <button onClick={() => setActiveSub(st.id)}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      (rfqSubTabs.findIndex(s => s.id === activeSub) >= idx || st.id === activeSub)
                        ? "bg-brand-navy-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                    )}>
                    {rfqSubTabs.findIndex(s => s.id === activeSub) > idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                  </button>
                  {idx < rfqSubTabs.length - 1 && (
                    <div className={cn("flex-1 h-1 rounded", rfqSubTabs.findIndex(s => s.id === activeSub) > idx ? "bg-brand-navy-400" : "bg-slate-200 dark:bg-slate-700")} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 text-xs">
            {rfqSubTabs.map((st) => (
              <button key={st.id} onClick={() => setActiveSub(st.id)}
                className={cn("px-2 py-1 rounded transition-all", activeSub === st.id ? "text-brand-navy-600 font-semibold" : "text-slate-400 hover:text-slate-600")}>
                {isAr ? st.labelAr : st.labelEn}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* RFQ - Select Contractors */}
      {activeSub === "rfq" && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-navy-500" />
              {t("اختيار المقاولين", "Select Contractors")}
              <Badge className="bg-brand-navy-100 text-brand-navy-700 dark:bg-brand-navy-900/30 dark:text-brand-navy-400 text-[10px] border-0 ms-2">
                {selectedContractors.length} {t("محدد", "selected")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {(contractors || []).map((c: { id: string; name: string; companyName: string; category: string; rating: number; phone: string }) => (
                <label key={c.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                  selectedContractors.includes(c.id)
                    ? "bg-brand-navy-50 dark:bg-brand-navy-950/20 border-brand-navy-300 dark:border-brand-navy-800"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                )}>
                  <input type="checkbox" checked={selectedContractors.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedContractors([...selectedContractors, c.id]);
                      else setSelectedContractors(selectedContractors.filter(id => id !== c.id));
                    }}
                    className="rounded border-slate-300" />
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <HardHat className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{c.companyName || c.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{getContractorCategoryLabel(c.category, isAr)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />{c.rating}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <Button onClick={() => rfqMutation.mutate()} disabled={selectedContractors.length === 0 || rfqMutation.isPending}
                className="h-10 px-6 bg-brand-navy-600 hover:bg-brand-navy-700 text-white rounded-xl gap-2 shadow-lg shadow-brand-navy-600/20">
                <Send className="h-4 w-4" />
                {rfqMutation.isPending ? t("جارٍ الإرسال...", "Sending...") : t("إرسال طلب عرض سعر", "Send RFQ")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quotes Management */}
      {activeSub === "quotes" && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              {t("إدارة العروض", "Quote Management")}
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] border-0 ms-2">
                {quotesReceived}/{rfqBids.length} {t("مستلم", "RECEIVED")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rfqBids.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Send className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">{t("لم يتم إرسال طلبات بعد", "No RFQs sent yet")}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {rfqBids.map((bid) => (
                  <div key={bid.id} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    bid.isAwarded ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800" :
                    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  )}>
                    <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <HardHat className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">{bid.contractorName}</span>
                        {bid.isAwarded && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] border-0">{t("الفائز", "Winner")}</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <Badge className={cn(
                          "text-[9px] border-0",
                          bid.rfqStatus === "SENT" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          bid.rfqStatus === "RECEIVED" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                          bid.rfqStatus === "REVIEWING" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                          bid.rfqStatus === "AWARDED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        )}>{bid.rfqStatus}</Badge>
                        {bid.quoteFile && <span className="text-emerald-500">✓ {t("عرض مرفوع", "Quote uploaded")}</span>}
                        {bid.amount > 0 && <span>{bid.amount.toLocaleString()} {tAuto('auto.aED')}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input ref={quoteInputRef} type="file" accept=".pdf" className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadQuoteMutation.mutate({ bidId: bid.id, file });
                          e.target.value = "";
                        }} />
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                        onClick={() => quoteInputRef.current?.click()}>
                        <Upload className="h-3 w-3" />{t("رفع عرض", "Upload")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Compare */}
      {activeSub === "compare" && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              {t("تحليل بالذكاء الاصطناعي", "AI Analysis")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quotesReceived < 2 ? (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">{t("يرجى رفع عرضين على الأقل للمقارنة", "Upload at least 2 quotes to compare")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Button onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}
                  className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white gap-2">
                  <Sparkles className="h-4 w-4" />
                  {analyzeMutation.isPending ? t("جارٍ التحليل...", "Analyzing...") : t("تحليل بالذكاء الاصطناعي", "Analyze with AI")}
                </Button>
                {rfqBids.filter(b => b.aiAnalysis).length > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800/50">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">{t("نتيجة التحليل", "Analysis Result")}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{rfqBids.find(b => b.aiAnalysis)?.aiAnalysis}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Award */}
      {activeSub === "award" && (
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-500" />
              {t("الترسية", "Award")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {awardedBid ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("تمت الترسية", "Awarded")}</p>
                      <p className="text-xs text-slate-600">{awardedBid.contractorName}</p>
                    </div>
                  </div>
                </div>
                {!awardedBid.contractFile && (
                  <div className="flex items-center gap-2">
                    <input ref={contractInputRef} type="file" accept=".pdf" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadContractMutation.mutate({ bidId: awardedBid.id, file });
                        e.target.value = "";
                      }} />
                    <Button onClick={() => contractInputRef.current?.click()}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Upload className="h-4 w-4" />
                      {t("رفع العقد", "Upload Contract")}
                    </Button>
                  </div>
                )}
                {awardedBid.contractFile && (
                  <p className="text-xs text-emerald-600">✓ {t("تم رفع العقد", "Contract uploaded")}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">{t("اختر المقاول الفائز من العروض المستلمة", "Select the winning contractor from received bids")}</p>
                {rfqBids.filter(b => b.quoteFile).map((bid) => (
                  <div key={bid.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                      <p className="text-xs font-medium">{bid.contractorName}</p>
                      {bid.amount > 0 && <p className="text-[10px] text-slate-400">{bid.amount.toLocaleString()} {tAuto('auto.aED')}</p>}
                    </div>
                    <Button size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]"
                      onClick={() => awardMutation.mutate(bid.id)} disabled={awardMutation.isPending}>
                      <Award className="h-3 w-3" />{t("ترسية", "Award")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
