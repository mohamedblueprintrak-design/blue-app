"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Edit3, X, UserCheck, Phone, Mail, MapPin, FileText, Award, Users, Calendar, TrendingUp, Gavel, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getCategoryConfig, getStatusConfig } from "./helpers";
import { RatingStars } from "./rating-stars";
import type { ContractorDetail } from "./types";

interface ContractorDetailPanelProps {
  ar: boolean;
  detail: ContractorDetail;
  onEdit: () => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function ContractorDetailPanel({
  ar,
  detail,
  onEdit,
  onClose,
  onDelete,
}: ContractorDetailPanelProps) {
  return (
    <div className="w-full lg:w-[400px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-white/80" />
            <h3 className="text-sm font-semibold text-white">{ar ? "ملف المقاول" : "Contractor Profile"}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
              onClick={onEdit}
              aria-label="Edit"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10" onClick={onClose} aria-label="Close">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="h-[300px] lg:h-[calc(100vh-340px)]">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {ar ? detail.name : detail.nameEn || detail.name}
            </h4>
            {detail.companyName && (
              <p className="text-sm text-slate-500">{ar ? detail.companyName : detail.companyEn || detail.companyName}</p>
            )}
            <div className="flex items-center gap-2">
              <RatingStars rating={detail.rating} size="md" />
              <span className="text-xs text-slate-400">{detail.rating}/5</span>
            </div>
            <Badge className={cn("text-[10px]", getCategoryConfig(detail.category).color)}>
              {ar ? getCategoryConfig(detail.category).ar : getCategoryConfig(detail.category).en}
            </Badge>
          </div>

          <div className="space-y-2.5">
            {detail.contactPerson && (
              <div className="flex items-start gap-2.5">
                <UserCheck className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "جهة الاتصال" : "Contact"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{detail.contactPerson}</span>
                </div>
              </div>
            )}
            {detail.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300" dir="ltr">{detail.phone}</span>
              </div>
            )}
            {detail.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300" dir="ltr">{detail.email}</span>
              </div>
            )}
            {detail.address && (
              <div className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-700 dark:text-slate-300">{detail.address}</span>
              </div>
            )}
            {detail.crNumber && (
              <div className="flex items-center gap-2.5">
                <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "السجل التجاري" : "CR"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono" dir="ltr">{detail.crNumber}</span>
                </div>
              </div>
            )}
            {detail.licenseNumber && (
              <div className="flex items-center gap-2.5">
                <Award className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "الترخيص" : "License"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono" dir="ltr">{detail.licenseNumber}</span>
                  {detail.licenseExpiry && (
                    <span className="text-[10px] text-slate-400 block ms-4">
                      {ar ? "ينتهي: " : "Expires: "}{new Date(detail.licenseExpiry).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                    </span>
                  )}
                </div>
              </div>
            )}
            {detail.classification && (
              <div className="flex items-center gap-2.5">
                <Award className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "التصنيف" : "Classification"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{detail.classification}</span>
                </div>
              </div>
            )}
            {(detail.workerCount > 0 || detail.engineerCount > 0) && (
              <div className="flex items-center gap-2.5">
                <Users className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "القوى العاملة" : "Workforce"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {detail.workerCount} {ar ? "عامل" : "workers"} / {detail.engineerCount} {ar ? "مهندس" : "engineers"}
                  </span>
                </div>
              </div>
            )}
            {detail.tradeLicense && (
              <div className="flex items-center gap-2.5">
                <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "السجل التجاري" : "Trade License"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono" dir="ltr">{detail.tradeLicense}</span>
                  {detail.tradeLicenseExpiry && (
                    <span className="text-[10px] text-slate-400 block ms-4">
                      {ar ? "ينتهي: " : "Expires: "}{new Date(detail.tradeLicenseExpiry).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                    </span>
                  )}
                </div>
              </div>
            )}
            {detail.vatNumber && (
              <div className="flex items-center gap-2.5">
                <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "الرقم الضريبي" : "VAT No."}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-mono" dir="ltr">{detail.vatNumber}</span>
                </div>
              </div>
            )}
            {detail.establishmentDate && (
              <div className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "تاريخ التأسيس" : "Established"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {new Date(detail.establishmentDate).toLocaleDateString(ar ? "ar-AE" : "en-US")}
                  </span>
                </div>
              </div>
            )}
            {detail.experience && (
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block">{ar ? "الخبرة" : "Experience"}</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{detail.experience}</span>
                </div>
              </div>
            )}
            {detail.specialties && (
              <div className="flex flex-wrap gap-1 pt-1">
                {detail.specialties.split(",").map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">{s.trim()}</Badge>
                ))}
              </div>
            )}
            {detail.notes && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400">{ar ? "ملاحظات" : "Notes"}</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{detail.notes}</p>
              </div>
            )}
          </div>

          {/* Bids */}
          {detail.bids && detail.bids.length > 0 && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Gavel className="h-3.5 w-3.5" />
                {ar ? `العطاءات (${detail.bids.length})` : `Bids (${detail.bids.length})`}
              </h5>
              <div className="space-y-1.5">
                {detail.bids.slice(0, 5).map((b) => {
                  const sc = getStatusConfig(b.status);
                  return (
                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {ar ? b.project.name : b.project.nameEn || b.project.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono tabular-nums">{formatCurrency(b.amount, ar)}</p>
                      </div>
                      <Badge className={cn("text-[9px]", sc.color)}>{ar ? sc.ar : sc.en}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-red-500 hover:text-red-600 rounded-lg"
            onClick={() => {
              if (confirm(ar ? "حذف المقاول؟" : "Delete contractor?")) {
                onDelete(detail.id);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 me-1" />{ar ? "حذف" : "Delete"}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
