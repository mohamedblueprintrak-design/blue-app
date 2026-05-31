"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Package,
} from "lucide-react";
import type { TransmittalItem, TransmittalDetailItem } from "./types";
import { getDeliveryBadge, getStatusBadge, getPurposeBadge } from "./helpers";

interface TransmittalDetailDialogProps {
  ar: boolean;
  transmittal: TransmittalItem;
  onClose: () => void;
}

export function TransmittalDetailDialog({
  ar,
  transmittal,
  onClose,
}: TransmittalDetailDialogProps) {
  const [itemReplies, setItemReplies] = useState<Record<string, { received: boolean; approved: boolean; rejected: boolean; needsRevision: boolean; replyNotes: string }>>(() => {
    const replies: Record<string, { received: boolean; approved: boolean; rejected: boolean; needsRevision: boolean; replyNotes: string }> = {};
    transmittal.items.forEach((item) => {
      replies[item.id] = {
        received: item.received,
        approved: item.approved,
        rejected: item.rejected,
        needsRevision: item.needsRevision,
        replyNotes: item.replyNotes,
      };
    });
    return replies;
  });

  return (
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTransmittal && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-teal-500" />
                  {ar ? "تفاصيل الإحالة" : "Transmittal Details"}
                </DialogTitle>
                <DialogDescription>
                  {selectedTransmittal.number || selectedTransmittal.id.slice(0, 8)} — {selectedTransmittal.subject}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Transmittal Info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{ar ? "المشروع" : "Project"}</div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedTransmittal.project ? (ar ? selectedTransmittal.project.name : selectedTransmittal.project.nameEn || selectedTransmittal.project.name) : "-"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{ar ? "الحالة" : "Status"}</div>
                    {getStatusBadge(selectedTransmittal.status, ar)}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{ar ? "من" : "From"}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedTransmittal.from?.name || "-"} {selectedTransmittal.from?.email && <span className="text-xs text-slate-400">({selectedTransmittal.from.email})</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{ar ? "طريقة التسليم" : "Delivery"}</div>
                    {getDeliveryBadge(selectedTransmittal.deliveryMethod, ar)}
                  </div>
                </div>

                {/* Recipient Info */}
                {(selectedTransmittal.toName || selectedTransmittal.toCompany) && (
                  <Card className="p-3 border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      {ar ? "معلومات المستلم" : "Recipient Information"}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {selectedTransmittal.toName && (
                        <div><span className="text-slate-400">{ar ? "الاسم: " : "Name: "}</span>{selectedTransmittal.toName}</div>
                      )}
                      {selectedTransmittal.toCompany && (
                        <div><span className="text-slate-400">{ar ? "الشركة: " : "Company: "}</span>{selectedTransmittal.toCompany}</div>
                      )}
                      {selectedTransmittal.toEmail && (
                        <div><span className="text-slate-400">{ar ? "البريد: " : "Email: "}</span>{selectedTransmittal.toEmail}</div>
                      )}
                      {selectedTransmittal.toPhone && (
                        <div><span className="text-slate-400">{ar ? "الهاتف: " : "Phone: "}</span>{selectedTransmittal.toPhone}</div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Items Table */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Package className="h-4 w-4" />
                    {ar ? "بنود الإحالة" : "Transmittal Items"} ({selectedTransmittal.items.length})
                  </Label>

                  {selectedTransmittal.items.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                      <p className="text-xs text-slate-400">{ar ? "لا توجد بنود" : "No items"}</p>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                            <TableHead className="text-[10px] font-semibold py-2 px-2">{ar ? "رقم المستند" : "Doc #"}</TableHead>
                            <TableHead className="text-[10px] font-semibold py-2 px-2">{ar ? "العنوان" : "Title"}</TableHead>
                            <TableHead className="text-[10px] font-semibold py-2 px-2">{ar ? "مراجعة" : "Rev"}</TableHead>
                            <TableHead className="text-[10px] font-semibold py-2 px-2">{ar ? "نسخ" : "Copies"}</TableHead>
                            <TableHead className="text-[10px] font-semibold py-2 px-2">{ar ? "الغرض" : "Purpose"}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedTransmittal.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="py-2 px-2 text-xs font-mono">{item.documentNumber}</TableCell>
                              <TableCell className="py-2 px-2 text-xs">{item.title}</TableCell>
                              <TableCell className="py-2 px-2 text-xs">{item.revision}</TableCell>
                              <TableCell className="py-2 px-2 text-xs text-center">{item.copies}</TableCell>
                              <TableCell className="py-2 px-2">{getPurposeBadge(item.purpose, ar)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Reply Section for Each Item */}
                {selectedTransmittal.items.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      {ar ? "قسم الردود" : "Reply Section"}
                    </Label>
                    {selectedTransmittal.items.map((item) => {
                      const reply = itemReplies[item.id];
                      return (
                        <Card key={item.id} className="p-3 border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">{item.documentNumber}</span>
                            <span className="text-xs font-medium text-slate-900 dark:text-white">{item.title}</span>
                            {getPurposeBadge(item.purpose, ar)}
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                checked={reply?.received || false}
                                onCheckedChange={(checked) => {
                                  setItemReplies(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], received: checked === true }
                                  }));
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs text-slate-600">{ar ? "مستلم" : "Received"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                checked={reply?.approved || false}
                                onCheckedChange={(checked) => {
                                  setItemReplies(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], approved: checked === true, rejected: false, needsRevision: false }
                                  }));
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs text-green-600">{ar ? "معتمد" : "Approved"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                checked={reply?.rejected || false}
                                onCheckedChange={(checked) => {
                                  setItemReplies(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], rejected: checked === true, approved: false, needsRevision: false }
                                  }));
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs text-red-600">{ar ? "مرفوض" : "Rejected"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                checked={reply?.needsRevision || false}
                                onCheckedChange={(checked) => {
                                  setItemReplies(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], needsRevision: checked === true, approved: false, rejected: false }
                                  }));
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <span className="text-xs text-amber-600">{ar ? "يحتاج مراجعة" : "Needs Revision"}</span>
                            </div>
                          </div>
                          <Textarea
                            className="text-xs min-h-[60px]"
                            placeholder={ar ? "ملاحظات الرد..." : "Reply notes..."}
                            value={reply?.replyNotes || ""}
                            onChange={(e) => {
                              setItemReplies(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], replyNotes: e.target.value }
                              }));
                            }}
                          />
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
