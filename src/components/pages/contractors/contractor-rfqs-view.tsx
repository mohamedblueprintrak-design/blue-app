"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Users, Gavel, FileText, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryConfig, getRFQStatusConfig } from "./helpers";
import type { ContractorItem, RFQItem } from "./types";
import { DEMO_RFQS } from "./types";

// ===== RFQs View (Request for Quotations) =====
function RFQsView({ ar, contractors, onBack, projectId: _projectId }: {
  ar: boolean;
  contractors: ContractorItem[];
  onBack: () => void;
  projectId?: string;
}) {
  const [rfqs] = useState<RFQItem[]>(DEMO_RFQS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRFQ, setNewRFQ] = useState({
    title: "",
    description: "",
    category: "CIVIL",
    deadline: "",
  });

  const filteredRFQs = rfqs.filter((r) => statusFilter === "all" || r.status === statusFilter);

  const statusCounts = rfqs.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const inputCls = "h-9 text-sm rounded-lg border-slate-200 dark:border-slate-700 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Gavel className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? "طلبات العطاءات" : "Request for Quotations"}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{ar ? "إدارة طلبات العطاءات للمقاولين" : "Manage RFQs for contractors"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {ar ? "طلب عطاء جديد" : "New RFQ"}
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={onBack}>
            <ArrowRight className="h-3.5 w-3.5 me-1 rotate-180" />
            {ar ? "العودة للقائمة" : "Back to List"}
          </Button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: "all", ar: "الكل", en: "All" },
          { value: "DRAFT", ar: "مسودة", en: "Draft" },
          { value: "SENT", ar: "مرسل", en: "Sent" },
          { value: "in_review", ar: "قيد المراجعة", en: "In Review" },
          { value: "AWARDED", ar: "تم الترسية", en: "Awarded" },
          { value: "CANCELLED", ar: "ملغي", en: "Cancelled" },
        ].map((s) => (
          <Button
            key={s.value}
            variant={statusFilter === s.value ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-xs rounded-lg",
              statusFilter === s.value
                ? "bg-teal-600 hover:bg-teal-700 text-white"
                : "border-slate-200 dark:border-slate-700"
            )}
            onClick={() => setStatusFilter(s.value)}
          >
            {ar ? s.ar : s.en}
            <span className="ms-1 text-[10px] opacity-70">
              ({s.value === "all" ? rfqs.length : (statusCounts[s.value] || 0)})
            </span>
          </Button>
        ))}
      </div>

      {/* RFQ List */}
      {filteredRFQs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
          <Gavel className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">{ar ? "لا توجد طلبات عطاء" : "No RFQs Found"}</p>
          <p className="text-xs text-slate-400">{ar ? "أنشئ طلب عطاء جديد للبدء" : "Create a new RFQ to get started"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRFQs.map((rfq) => {
            const statusConf = getRFQStatusConfig(rfq.status);
            const catConf = getCategoryConfig(rfq.category);
            return (
              <Card key={rfq.id} className="border-slate-200 dark:border-slate-700/50 hover:shadow-md transition-all overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{rfq.title}</h4>
                        <Badge className={cn("text-[10px]", statusConf.color)}>{ar ? statusConf.ar : statusConf.en}</Badge>
                        <Badge className={cn("text-[10px]", catConf.color)}>{ar ? catConf.ar : catConf.en}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{rfq.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {rfq.projectName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {ar ? "الموعد النهائي" : "Deadline"}: {rfq.deadline}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {rfq.responseCount} {ar ? "استجابة" : "responses"}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg flex-shrink-0">
                      {ar ? "عرض التفاصيل" : "View Details"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create RFQ Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg" dir={ar ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-4.5 w-4.5 text-teal-600" />
              {ar ? "طلب عطاء جديد" : "New Request for Quotation"}
            </DialogTitle>
            <DialogDescription>
              {ar ? "أنشئ طلب عطاء جديد وأرسله للمقاولين المؤهلين" : "Create a new RFQ and send it to qualified contractors"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{ar ? "عنوان الطلب" : "RFQ Title"} <span className="text-red-500">*</span></Label>
              <Input
                value={newRFQ.title}
                onChange={(e) => setNewRFQ({ ...newRFQ, title: e.target.value })}
                className={inputCls}
                placeholder={ar ? "مثال: أعمال الحفر والأساسات" : "e.g., Excavation and Foundation Works"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{ar ? "الوصف" : "Description"} <span className="text-red-500">*</span></Label>
              <Textarea
                value={newRFQ.description}
                onChange={(e) => setNewRFQ({ ...newRFQ, description: e.target.value })}
                className={cn(inputCls, "min-h-[80px]")}
                placeholder={ar ? "وصف تفصيلي لمتطلبات العطاء..." : "Detailed description of the RFQ requirements..."}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{ar ? "الفئة" : "Category"}</Label>
                <Select value={newRFQ.category} onValueChange={(v) => setNewRFQ({ ...newRFQ, category: v })}>
                  <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIVIL">{ar ? "أشغال مدنية" : "Civil"}</SelectItem>
                    <SelectItem value="ELECTRICAL">{ar ? "كهرباء" : "Electrical"}</SelectItem>
                    <SelectItem value="MEP">MEP</SelectItem>
                    <SelectItem value="FINISHING">{ar ? "تشطيبات" : "Finishing"}</SelectItem>
                    <SelectItem value="PLUMBING">{ar ? "سباكة" : "Plumbing"}</SelectItem>
                    <SelectItem value="HVAC">{ar ? "تكييف" : "HVAC"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{ar ? "الموعد النهائي" : "Deadline"}</Label>
                <Input
                  type="date"
                  value={newRFQ.deadline}
                  onChange={(e) => setNewRFQ({ ...newRFQ, deadline: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{ar ? "المقاولون المختارون" : "Selected Contractors"}</Label>
              <div className="text-xs text-slate-400 mb-1">
                {ar ? `${contractors.length} مقاول متاح` : `${contractors.length} contractors available`}
              </div>
              <div className="max-h-[120px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {contractors.slice(0, 5).map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                    <span className="text-xs text-slate-700 dark:text-slate-300">{ar ? c.name : c.nameEn || c.name}</span>
                    <Badge className={cn("text-[9px] ms-auto", getCategoryConfig(c.category).color)}>
                      {ar ? getCategoryConfig(c.category).ar : getCategoryConfig(c.category).en}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-9 rounded-lg" onClick={() => setShowCreateDialog(false)}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white rounded-lg min-w-[120px]"
              disabled={!newRFQ.title || !newRFQ.description}
              onClick={() => {
                // In production this would call the API
                setShowCreateDialog(false);
                setNewRFQ({ title: "", description: "", category: "CIVIL", deadline: "" });
              }}
            >
              {ar ? "إرسال الطلب" : "Submit RFQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { RFQsView };
