"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignaturePad from "./signature-pad";
import { FileText, Loader2 } from "lucide-react";

interface SignDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  signerName?: string;
  signerRole?: string;
  language?: "ar" | "en";
  onSigned?: (signature: { signatureImage: string; signerName: string; signerRole: string }) => void;
}

export default function SignDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  signerName = "",
  signerRole = "",
  language = "ar",
  onSigned,
}: SignDocumentDialogProps) {
  const isAr = language === "ar";
  const [name, setName] = useState(signerName);
  const [role, setRole] = useState(signerRole);
  const [saving, setSaving] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const handleSignatureConfirm = (dataUrl: string) => {
    setSignatureData(dataUrl);
  };

  const _handleSignatureCancel = () => {
    setSignatureData(null);
  };

  const handleSave = async () => {
    if (!signatureData || !name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl: signatureData,
          signerName: name.trim(),
          signerRole: role.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (isAr ? "فشل في حفظ التوقيع" : "Failed to save signature"));
      }

      const _result = await res.json().catch(() => ({}));
      onSigned?.({
        signatureImage: signatureData,
        signerName: name.trim(),
        signerRole: role.trim(),
      });
      onOpenChange(false);
      setSignatureData(null);
    } catch (err) {
      console.error("Error saving signature:", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
        dir={isAr ? "rtl" : "ltr"}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#133371]" />
            {isAr ? "توقيع المستند" : "Sign Document"}
          </DialogTitle>
          <DialogDescription>
            {documentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">
                {isAr ? "اسم الموقّع" : "Signer Name"}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isAr ? "أدخل اسمك" : "Enter your name"}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">
                {isAr ? "الصفة / الدور" : "Role / Title"}
              </Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder={isAr ? "مثال: مدير المشاريع" : "e.g., Project Manager"}
              />
            </div>
          </div>

          {/* Signature Pad */}
          {!signatureData ? (
            <SignaturePad
              onConfirm={handleSignatureConfirm}
              onCancel={() => onOpenChange(false)}
              language={language}
            />
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {isAr ? "معاينة التوقيع" : "Signature Preview"}
              </Label>
              <div className="border rounded-lg p-2 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signatureData}
                  alt={isAr ? "التوقيع" : "Signature"}
                  className="max-h-32 mx-auto"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setSignatureData(null)}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  {isAr ? "إعادة التوقيع" : "Re-sign"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium bg-[#133371] hover:bg-[#0f2855] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isAr ? "حفظ التوقيع" : "Save Signature"}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
