"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Download,
  Upload,
  FileText,
  Clock,
  User,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface VersionEntry {
  id: string;
  version: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  changeSummary: string | null;
  uploadedBy: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  createdAt: string;
  isCurrent: boolean;
}

interface VersionHistoryData {
  documentId: string;
  documentName: string;
  currentVersion: number;
  versions: VersionEntry[];
}

// ===== Helpers =====
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ===== Version Timeline Entry =====
function VersionTimelineEntry({
  entry,
  language,
  documentId,
}: {
  entry: VersionEntry;
  language: "ar" | "en";
  documentId: string;
}) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const isCurrent = entry.isCurrent;

  return (
    <div className="flex gap-3 relative">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors",
            isCurrent
              ? "bg-teal-100 dark:bg-teal-900/30 border-teal-500 text-teal-600 dark:text-teal-400"
              : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400"
          )}
        >
          <span className="text-xs font-bold">{entry.version}</span>
        </div>
        <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 min-h-[20px]" />
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 pb-4 min-w-0",
        isCurrent ? "" : "opacity-80"
      )}>
        <div className={cn(
          "rounded-lg border p-3 transition-colors",
          isCurrent
            ? "border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-950/10"
            : "border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900"
        )}>
          {/* Header row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className={cn("h-3.5 w-3.5 shrink-0", isCurrent ? "text-teal-500" : "text-slate-400")} />
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                {entry.fileName}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isCurrent && (
                <Badge variant="outline" className="text-[9px] h-5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/40">
                  {t("الحالي", "Current")}
                </Badge>
              )}
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                v{entry.version}
              </span>
            </div>
          </div>

          {/* Change summary */}
          {entry.changeSummary && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
              {entry.changeSummary}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
              {entry.uploadedBy && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {entry.uploadedBy.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(entry.createdAt).toLocaleDateString(isAr ? "ar-AE" : "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>{formatFileSize(entry.fileSize)}</span>
            </div>

            {/* Download button */}
            {!isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[10px] text-slate-500 hover:text-teal-600"
                onClick={() => {
                  window.open(`/api/documents/${documentId}/versions/${entry.version}`, "_blank");
                }}
              >
                <Download className="h-3 w-3" />
                {t("تحميل", "Download")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Upload New Version Dialog =====
function UploadVersionDialog({
  documentId,
  documentName,
  open,
  onOpenChange,
  language,
}: {
  documentId: string;
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "ar" | "en";
}) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const queryClient = useQueryClient();
  const [changeSummary, setChangeSummary] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { ...getMutationHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: documentName,
          filePath: "",
          fileSize: 0,
          mimeType: "",
          changeSummary: changeSummary || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to upload version");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-versions", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setChangeSummary("");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-teal-500" />
            {t("رفع إصدار جديد", "Upload New Version")}
          </DialogTitle>
          <DialogDescription>
            {t("أضف إصداراً جديداً من المستند", "Add a new version of the document")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500">{t("المستند", "Document")}</Label>
            <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5 truncate">
              {documentName}
            </p>
          </div>
          <div>
            <Label className="text-xs text-slate-500">{t("ملخص التغييرات", "Change Summary")}</Label>
            <Input
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder={t("ما الذي تغير في هذا الإصدار؟", "What changed in this version?")}
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8">
            {t("إلغاء", "Cancel")}
          </Button>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => uploadMutation.mutate()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending
              ? t("جاري الرفع...", "Uploading...")
              : t("رفع الإصدار", "Upload Version")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Main Component =====
interface DocumentVersionHistoryProps {
  documentId: string;
  documentName: string;
  currentVersion: number;
  language: "ar" | "en";
  onClose?: () => void;
}

export default function DocumentVersionHistory({
  documentId,
  documentName,
  currentVersion,
  language,
  onClose,
}: DocumentVersionHistoryProps) {
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const { data: versionData, isLoading } = useQuery<VersionHistoryData>({
    queryKey: ["document-versions", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
    enabled: !!documentId,
  });

  const versions = versionData?.versions || [];

  // Add current version if it's not in the version records
  const currentVersionEntry: VersionEntry = {
    id: "current",
    version: currentVersion,
    fileName: documentName,
    fileSize: 0,
    mimeType: "",
    changeSummary: isAr ? "الإصدار الحالي" : "Current version",
    uploadedBy: null,
    createdAt: new Date().toISOString(),
    isCurrent: true,
  };

  // Merge current version with existing versions
  const allVersions: VersionEntry[] = (() => {
    if (versions.some((v) => v.isCurrent)) return versions;
    // Add current version entry at the beginning
    return [currentVersionEntry, ...versions.filter((v) => !v.isCurrent)];
  })();

  if (isLoading) {
    return (
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-teal-500" />
            {t("سجل الإصدارات", "Version History")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-700/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4 text-teal-500" />
              {t("سجل الإصدارات", "Version History")}
              <Badge variant="secondary" className="text-[10px] h-5">
                {allVersions.length} {t("إصدار", "versions")}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                className="h-7 gap-1 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => setShowUploadDialog(true)}
              >
                <Plus className="h-3 w-3" />
                {t("إصدار جديد", "New Version")}
              </Button>
              {onClose && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allVersions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t("لا توجد إصدارات سابقة", "No previous versions")}</p>
              <p className="text-xs mt-1">
                {t("الإصدار الحالي هو v", "Current version is v")}{currentVersion}
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-0">
                {allVersions.map((entry) => (
                  <VersionTimelineEntry
                    key={entry.id}
                    entry={entry}
                    language={language}
                    documentId={documentId}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <UploadVersionDialog
        documentId={documentId}
        documentName={documentName}
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        language={language}
      />
    </>
  );
}
