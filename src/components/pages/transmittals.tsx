"use client";

import { useState, forwardRef, type ComponentPropsWithoutRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TableVirtuoso } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Send,
  Eye,
  Trash2,
  Filter,
  Mail,
  UserCheck,
  Truck,
  Package,
  X,
  ArrowRightLeft,
  Inbox,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Virtuoso Table Components (for virtualized rendering) =====
const VirtuosoTableComponents = {
  Scroller: forwardRef<HTMLDivElement>((props: ComponentPropsWithoutRef<'div'> & { className?: string }, ref) => <div {...props} ref={ref} className={cn("overflow-auto max-h-[calc(100vh-220px)] w-full custom-scrollbar", props.className)} />),
  Table: (props: ComponentPropsWithoutRef<'table'> & { className?: string }) => <Table {...props} className={cn("w-full caption-bottom text-sm", props.className)} />,
  TableHead: forwardRef<HTMLTableSectionElement>((props: ComponentPropsWithoutRef<'thead'> & { className?: string }, ref) => <TableHeader {...props} ref={ref} className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b]" />),
  TableRow: (props: ComponentPropsWithoutRef<'tr'> & { className?: string }) => <TableRow {...props} className={cn("group even:bg-slate-50/50 dark:even:bg-slate-800/20 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors", props.className)} />,
  TableBody: forwardRef<HTMLTableSectionElement>((props: ComponentPropsWithoutRef<'tbody'>, ref) => <TableBody {...props} ref={ref} />),
};

// ===== Types =====
interface TransmittalItem {
  id: string;
  projectId: string;
  number: string;
  subject: string;
  fromId: string;
  toName: string;
  toEmail: string;
  toCompany: string;
  toPhone: string;
  deliveryMethod: string;
  status: string;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  from: { id: string; name: string; email: string } | null;
  items: TransmittalDetailItem[];
}

interface TransmittalDetailItem {
  id: string;
  transmittalId: string;
  documentNumber: string;
  title: string;
  revision: string;
  copies: number;
  purpose: string;
  received: boolean;
  approved: boolean;
  rejected: boolean;
  needsRevision: boolean;
  replyNotes: string;
}

interface ProjectOption {
  id: string;
  name: string;
  nameEn: string;
  number: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

// ===== Helpers =====
function getDeliveryBadge(method: string, ar: boolean) {
  const configs: Record<string, { icon: typeof Mail; label: string; labelEn: string; color: string }> = {
    EMAIL: { icon: Mail, label: "بريد إلكتروني", labelEn: "Email", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    MANUAL: { icon: UserCheck, label: "يدوي", labelEn: "Manual", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    COURIER: { icon: Truck, label: "ساعي", labelEn: "Courier", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  };
  const cfg = configs[method] || configs.EMAIL;
  const Icon = cfg.icon;
  return (
    <Badge variant="secondary" className={`text-[10px] h-5 gap-1 ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {ar ? cfg.label : cfg.labelEn}
    </Badge>
  );
}

function getStatusBadge(status: string, ar: boolean) {
  const configs: Record<string, { label: string; labelEn: string; gradient: string }> = {
    SENT: { label: "مرسل", labelEn: "Sent", gradient: "bg-gradient-to-r from-blue-500 to-blue-600" },
    RECEIVED: { label: "مستلم", labelEn: "Received", gradient: "bg-gradient-to-r from-emerald-500 to-emerald-600" },
    REPLIED: { label: "تم الرد", labelEn: "Replied", gradient: "bg-gradient-to-r from-amber-500 to-amber-600" },
    CLOSED: { label: "مغلق", labelEn: "Closed", gradient: "bg-gradient-to-r from-slate-400 to-slate-500" },
  };
  const cfg = configs[status] || configs.SENT;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-white rounded-full px-2 py-0.5 ${cfg.gradient}`}>
      {status === "SENT" && <ArrowRight className={cn("h-3 w-3", ar && "rotate-180")} />}
      {status === "RECEIVED" && <ArrowLeft className={cn("h-3 w-3", ar && "rotate-180")} />}
      {status === "REPLIED" && <CheckCircle2 className="h-3 w-3" />}
      {status === "CLOSED" && <XCircle className="h-3 w-3" />}
      {ar ? cfg.label : cfg.labelEn}
    </span>
  );
}

function getPurposeBadge(purpose: string, ar: boolean) {
  const configs: Record<string, { label: string; labelEn: string; color: string }> = {
    REVIEW: { label: "مراجعة", labelEn: "Review", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
    APPROVAL: { label: "اعتماد", labelEn: "Approval", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
    INFORMATION: { label: "معلومات", labelEn: "Info", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    EXECUTION: { label: "تنفيذ", labelEn: "Execution", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  };
  const cfg = configs[purpose] || configs.REVIEW;
  return (
    <Badge variant="secondary" className={`text-[9px] h-4 px-1 ${cfg.color}`}>
      {ar ? cfg.label : cfg.labelEn}
    </Badge>
  );
}

// ===== Main Component =====
interface TransmittalsProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function Transmittals({ language, projectId }: TransmittalsProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTransmittal, setSelectedTransmittal] = useState<TransmittalItem | null>(null);
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [itemReplies, setItemReplies] = useState<Record<string, { received: boolean; approved: boolean; rejected: boolean; needsRevision: boolean; replyNotes: string }>>({});

  // Fetch transmittals
  const { data: transmittals = [], isLoading } = useQuery<TransmittalItem[]>({
    queryKey: ["transmittals", filterProject, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/transmittals?${params}`);
      if (!res.ok) throw new Error("Failed to fetch transmittals");
      const json = await res.json(); return json.data || json;
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  // Fetch users
  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-simple"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/transmittals", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create transmittal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transmittals"] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/transmittals/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transmittals"] });
    },
  });

  // Update item reply mutation
  const _updateItemMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/transmittals/items/${itemId}`, {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transmittals"] });
    },
  });



  const [formData, setFormData] = useState({
    projectId: projectId || "",
    subject: "",
    fromId: "",
    toName: "",
    toEmail: "",
    toCompany: "",
    toPhone: "",
    deliveryMethod: "EMAIL",
  });

  const [newItems, setNewItems] = useState<
    Array<{ documentNumber: string; title: string; revision: string; copies: number; purpose: string }>
  >([]);

  const resetForm = () => {
    setFormData({
      projectId: projectId || (filterProject !== "all" ? filterProject : ""),
      subject: "",
      fromId: "",
      toName: "",
      toEmail: "",
      toCompany: "",
      toPhone: "",
      deliveryMethod: "EMAIL",
    });
    setNewItems([]);
  };

  const addNewItem = () => {
    setNewItems([...newItems, { documentNumber: "", title: "", revision: "0", copies: 1, purpose: "REVIEW" }]);
  };

  const removeNewItem = (index: number) => {
    setNewItems(newItems.filter((_, i) => i !== index));
  };

  const updateNewItem = (index: number, field: string, value: string | number) => {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  };

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      items: newItems.length > 0 ? newItems : [],
    });
  };

  const handleOpenDetail = (transmittal: TransmittalItem) => {
    setSelectedTransmittal(transmittal);
    setShowDetailDialog(true);
    // Initialize item replies from existing data
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
    setItemReplies(replies);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <ArrowRightLeft className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {ar ? "الإحالات" : "Transmittals"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ar ? `إجمالي ${transmittals.length} إحالة` : `${transmittals.length} total transmittals`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={ar ? "المشروع" : "Project"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "جميع المشاريع" : "All Projects"}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {ar ? p.name : p.nameEn || p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="SENT">{ar ? "مرسل" : "Sent"}</SelectItem>
              <SelectItem value="RECEIVED">{ar ? "مستلم" : "Received"}</SelectItem>
              <SelectItem value="REPLIED">{ar ? "تم الرد" : "Replied"}</SelectItem>
              <SelectItem value="CLOSED">{ar ? "مغلق" : "Closed"}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {ar ? "إحالة جديدة" : "New Transmittal"}
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي الإحالات" : "Total Transmittals"}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{transmittals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "مرسلة" : "Sent"}</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{transmittals.filter(t => t.status === "SENT").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Inbox className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "مستلمة" : "Received"}</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{transmittals.filter(t => t.status === "RECEIVED").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? "بانتظار الرد" : "Pending Response"}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{transmittals.filter(t => t.status === "SENT" || t.status === "RECEIVED").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Bar */}
      {transmittals.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex">
            {(() => {
              const sent = transmittals.filter(t => t.status === "SENT").length;
              const received = transmittals.filter(t => t.status === "RECEIVED").length;
              const replied = transmittals.filter(t => t.status === "REPLIED").length;
              const closed = transmittals.filter(t => t.status === "CLOSED").length;
              const total = transmittals.length || 1;
              return (
                <>
                  {sent > 0 && <div className="bg-blue-500 h-full" style={{width: `${(sent/total)*100}%`}} />}
                  {received > 0 && <div className="bg-emerald-500 h-full" style={{width: `${(received/total)*100}%`}} />}
                  {replied > 0 && <div className="bg-amber-500 h-full" style={{width: `${(replied/total)*100}%`}} />}
                  {closed > 0 && <div className="bg-slate-400 h-full" style={{width: `${(closed/total)*100}%`}} />}
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            {[{color: "bg-blue-500", label: ar ? "مرسل" : "Sent"}, {color: "bg-emerald-500", label: ar ? "مستلم" : "Received"}, {color: "bg-amber-500", label: ar ? "تم الرد" : "Replied"}, {color: "bg-slate-400", label: ar ? "مغلق" : "Closed"}].map(item => (
              <div key={item.label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-[10px] text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        </Card>
      ) : transmittals.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <Send className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            {ar ? "لا توجد إحالات" : "No transmittals"}
          </h3>
          <p className="text-sm text-slate-500">
            {ar ? "ابدأ بإضافة إحالة جديدة" : "Start by adding a new transmittal"}
          </p>
        </div>
      ) : (
        <Card className="border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden">
          <TableVirtuoso
            data={transmittals}
            components={VirtuosoTableComponents}
            fixedHeaderContent={() => (
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold py-2.5 px-3">{ar ? "رقم" : "Number"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3">{ar ? "المشروع" : "Project"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3">{ar ? "الموضوع" : "Subject"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3">{ar ? "إلى" : "To"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3">{ar ? "طريقة التسليم" : "Delivery"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 hidden md:table-cell">{ar ? "التاريخ" : "Date"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 text-center">{ar ? "البنود" : "Items"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3">{ar ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3">{ar ? "الرد" : "Reply"}</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 w-10"></TableHead>
              </TableRow>
            )}
            itemContent={(_, t) => (
              <>
                <TableCell className="py-2.5 px-3" onClick={() => handleOpenDetail(t)}>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    {t.number || t.id.slice(0, 8)}
                  </span>
                </TableCell>
                <TableCell className="py-2.5 px-3" onClick={() => handleOpenDetail(t)}>
                  <span className="text-xs truncate max-w-[120px] block">
                    {t.project ? (ar ? t.project.name : t.project.nameEn || t.project.name) : "-"}
                  </span>
                </TableCell>
                <TableCell className="py-2.5 px-3" onClick={() => handleOpenDetail(t)}>
                  <span className="text-xs font-medium truncate max-w-[150px] block">{t.subject}</span>
                </TableCell>
                <TableCell className="py-2.5 px-3" onClick={() => handleOpenDetail(t)}>
                  <span className="text-xs truncate max-w-[100px] block">{t.toName || t.toCompany || "-"}</span>
                </TableCell>
                <TableCell className="py-2.5 px-3" onClick={() => handleOpenDetail(t)}>
                  {getDeliveryBadge(t.deliveryMethod, ar)}
                </TableCell>
                <TableCell className="py-2.5 px-3 hidden md:table-cell" onClick={() => handleOpenDetail(t)}>
                  <span className="text-xs text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", day: "numeric" })}
                  </span>
                </TableCell>
                <TableCell className="py-2.5 px-3 text-center" onClick={() => handleOpenDetail(t)}>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                    <Package className="h-3 w-3" />
                    {t.items.length}
                  </span>
                </TableCell>
                <TableCell className="py-2.5 px-3" onClick={() => handleOpenDetail(t)}>
                  {getStatusBadge(t.status, ar)}
                </TableCell>
                <TableCell className="py-2.5 px-3" onClick={() => handleOpenDetail(t)}>
                  {(() => {
                    const hasResponse = t.items.some(i => i.approved || i.rejected || i.needsRevision);
                    return hasResponse ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-full px-1.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                        {ar ? "تم الرد" : "Responded"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-full px-1.5 py-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {ar ? "بانتظار الرد" : "Awaiting"}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="py-2.5 px-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1 text-slate-400 hover:text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={ar ? "start" : "end"} className="w-36">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDetail(t); }}>
                        <Eye className="h-3.5 w-3.5 me-2" />
                        {ar ? "عرض" : "View"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 dark:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(ar ? "هل أنت متأكد من الحذف؟" : "Delete this transmittal?")) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 me-2" />
                        {ar ? "حذف" : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </>
            )}
          />
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-teal-500" />
              {ar ? "إحالة جديدة" : "New Transmittal"}
            </DialogTitle>
            <DialogDescription>
              {ar ? "إنشاء إحالة مستندات جديدة وإرسالها" : "Create and send a new document transmittal"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "المشروع *" : "Project *"}</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger><SelectValue placeholder={ar ? "اختر مشروع" : "Select project"} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "طريقة التسليم" : "Delivery Method"}</Label>
                <Select value={formData.deliveryMethod} onValueChange={(v) => setFormData({ ...formData, deliveryMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">{ar ? "بريد إلكتروني" : "Email"}</SelectItem>
                    <SelectItem value="MANUAL">{ar ? "يدوي" : "Manual"}</SelectItem>
                    <SelectItem value="COURIER">{ar ? "ساعي" : "Courier"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{ar ? "الموضوع *" : "Subject *"}</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder={ar ? "موضوع الإحالة" : "Transmittal subject"}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "من (المرسل) *" : "From *"}</Label>
                <Select value={formData.fromId} onValueChange={(v) => setFormData({ ...formData, fromId: v })}>
                  <SelectTrigger><SelectValue placeholder={ar ? "اختر المرسل" : "Select sender"} /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "إلى (الاسم)" : "To (Name)"}</Label>
                <Input
                  value={formData.toName}
                  onChange={(e) => setFormData({ ...formData, toName: e.target.value })}
                  placeholder={ar ? "اسم المستلم" : "Recipient name"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "البريد الإلكتروني" : "Email"}</Label>
                <Input
                  value={formData.toEmail}
                  onChange={(e) => setFormData({ ...formData, toEmail: e.target.value })}
                  placeholder="email@example.com"
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الشركة" : "Company"}</Label>
                <Input
                  value={formData.toCompany}
                  onChange={(e) => setFormData({ ...formData, toCompany: e.target.value })}
                  placeholder={ar ? "اسم الشركة" : "Company name"}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "الهاتف" : "Phone"}</Label>
                <Input
                  value={formData.toPhone}
                  onChange={(e) => setFormData({ ...formData, toPhone: e.target.value })}
                  placeholder={ar ? "رقم الهاتف" : "Phone number"}
                />
              </div>
            </div>

            <Separator />

            {/* Transmittal Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Package className="h-4 w-4" />
                  {ar ? "بنود الإحالة" : "Transmittal Items"}
                </Label>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addNewItem}>
                  <Plus className="h-3 w-3 me-1" />
                  {ar ? "إضافة بند" : "Add Item"}
                </Button>
              </div>

              {newItems.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  <p className="text-xs text-slate-400">
                    {ar ? "لم يتم إضافة بنود بعد" : "No items added yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newItems.map((item, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {ar ? "بند" : "Item"} {index + 1}
                        </span>
                        <button
                          onClick={() => removeNewItem(index)}
                          className="p-0.5 text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          className="h-7 text-xs"
                          value={item.documentNumber}
                          onChange={(e) => updateNewItem(index, "documentNumber", e.target.value)}
                          placeholder={ar ? "رقم المستند" : "Doc Number"}
                        />
                        <Input
                          className="h-7 text-xs"
                          value={item.title}
                          onChange={(e) => updateNewItem(index, "title", e.target.value)}
                          placeholder={ar ? "العنوان" : "Title"}
                        />
                        <Input
                          className="h-7 text-xs"
                          value={item.revision}
                          onChange={(e) => updateNewItem(index, "revision", e.target.value)}
                          placeholder={ar ? "المراجعة" : "Rev"}
                        />
                        <Select value={item.purpose} onValueChange={(v) => updateNewItem(index, "purpose", v)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REVIEW">{ar ? "مراجعة" : "Review"}</SelectItem>
                            <SelectItem value="APPROVAL">{ar ? "اعتماد" : "Approval"}</SelectItem>
                            <SelectItem value="INFORMATION">{ar ? "معلومات" : "Information"}</SelectItem>
                            <SelectItem value="EXECUTION">{ar ? "تنفيذ" : "Execution"}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSubmit}
              disabled={!formData.projectId || !formData.subject || !formData.fromId || createMutation.isPending}
            >
              {createMutation.isPending ? (ar ? "جارٍ الإنشاء..." : "Creating...") : (ar ? "إنشاء وإرسال" : "Create & Send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
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
