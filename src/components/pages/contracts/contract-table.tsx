"use client";

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  FileText,
  DollarSign,
  TrendingUp,
  Sparkles,
  Inbox,
  FileSignature,
} from "lucide-react";
import type { ContractItem, ContractDetail, ClientOption, ProjectOption } from "./types";
import { getStatusConfig } from "./helpers";

interface ContractTableProps {
  ar: boolean;
  contracts: ContractItem[];
  filteredContracts: ContractItem[];
  totalValue: number;
  activeValue: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  onAddClick: () => void;
  selectedContractId: string | null;
  onSelectContract: (contract: ContractItem) => void;
  onEditContract: (contract: ContractItem) => void;
  onDeleteContract: (contract: ContractItem) => void;
  contractDetail: ContractDetail | null | undefined;
  onCloseDetail: () => void;
  onEditFromDetail: () => void;
}

export function ContractTable({
  ar,
  contracts,
  filteredContracts,
  totalValue,
  activeValue,
  isLoading,
  search,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  onAddClick,
  selectedContractId,
  onSelectContract,
  onEditContract,
  onDeleteContract,
  contractDetail,
  onCloseDetail,
  onEditFromDetail,
}: ContractTableProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <FileSignature className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {ar ? "العقود" : "Contracts"}
              </h2>
              <Badge variant="secondary" className="text-[10px] font-medium h-5 px-1.5">
                {contracts.length}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {ar ? "إدارة وتتبع العقود" : "Manage and track contracts"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={ar ? "بحث في العقود..." : "Search contracts..."}
              className="ps-9 h-8 text-sm rounded-lg"
            />
          </div>
          <Select value={filterStatus} onValueChange={onFilterStatusChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
              <SelectValue placeholder={ar ? "الحالة" : "Status"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
              <SelectItem value="DRAFT">{ar ? "مسودة" : "Draft"}</SelectItem>
              <SelectItem value="PENDING_SIGNATURE">{ar ? "بانتظار التوقيع" : "Pending"}</SelectItem>
              <SelectItem value="ACTIVE">{ar ? "نشط" : "Active"}</SelectItem>
              <SelectItem value="EXPIRED">{ar ? "منتهي" : "Expired"}</SelectItem>
              <SelectItem value="COMPLETED">{ar ? "مكتمل" : "Completed"}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
            onClick={onAddClick}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {ar ? "عقد جديد" : "New Contract"}
          </Button>
        </div>
      </div>

      {/* Summary Cards with Gradient Backgrounds */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <FileText className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{ar ? "إجمالي العقود" : "Total Contracts"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {filteredContracts.length}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              {ar ? `${contracts.length} عقد مسجل` : `${contracts.length} registered`}
            </p>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <span className="text-xs text-teal-600 dark:text-teal-400">{ar ? "إجمالي القيمة" : "Total Value"}</span>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatCurrency(totalValue, ar)}
            </div>
            <p className="text-[10px] text-teal-500/60 dark:text-teal-400/60 mt-1">
              {ar ? "جميع العقود" : "All contracts"}
            </p>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{ar ? "العقود النشطة" : "Active Contracts"}</span>
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
              {contracts.filter((c) => c.status === "ACTIVE").length}
            </div>
            <p className="text-[10px] text-emerald-500/60 dark:text-emerald-400/60 mt-1">
              {ar ? "قيد التنفيذ" : "In progress"}
            </p>
          </div>
        </Card>

        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs text-violet-600 dark:text-violet-400">{ar ? "قيمة النشطة" : "Active Value"}</span>
            </div>
            <div className="text-xl font-bold text-violet-700 dark:text-violet-300 font-mono tabular-nums">
              {formatCurrency(activeValue, ar)}
            </div>
            <p className="text-[10px] text-violet-500/60 dark:text-violet-400/60 mt-1">
              {ar ? "عقود سارية المفعول" : "Active value"}
            </p>
          </div>
        </Card>
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className={cn(
          "flex-1 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden shadow-sm",
          selectedContractId && "hidden lg:block"
        )}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-semibold">{ar ? "الرقم" : "No."}</TableHead>
                <TableHead className="text-xs font-semibold">{ar ? "العنوان" : "Title"}</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "العميل" : "Client"}</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">{ar ? "المشروع" : "Project"}</TableHead>
                <TableHead className="text-xs font-semibold">{ar ? "القيمة" : "Value"}</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">{ar ? "الحالة" : "Status"}</TableHead>
                <TableHead className="text-xs font-semibold text-start">{ar ? "الإجراءات" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContracts.map((contract, idx) => {
                const statusCfg = getStatusConfig(contract.status);
                return (
                  <TableRow
                    key={contract.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      idx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "even:bg-slate-50/50 dark:even:bg-slate-800/20",
                      selectedContractId === contract.id && "bg-teal-50/50 dark:bg-teal-950/20"
                    )}
                    onClick={() => onSelectContract(contract)}
                  >
                    <TableCell className="font-mono text-xs text-slate-500">
                      {contract.number || "—"}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                      {contract.title}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-600 dark:text-slate-300 text-xs">
                      {contract.client.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-slate-500 text-xs">
                      {ar ? contract.project.name : contract.project.nameEn || contract.project.name}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-white text-sm font-mono tabular-nums">
                      <span className="text-slate-400 dark:text-slate-500">{ar ? "د.إ" : "AED"} </span>{contract.value.toLocaleString(ar ? "ar-AE" : "en-US")}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium",
                        statusCfg.pill
                      )}>
                        {ar ? statusCfg.ar : statusCfg.en}
                      </span>
                    </TableCell>
                    <TableCell className="text-start">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); onSelectContract(contract); }}
                          aria-label="View"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); onEditContract(contract); }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteContract(contract);
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredContracts.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Inbox className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {ar ? "لا توجد عقود" : "No contracts found"}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {ar ? "أضف عقدًا جديدًا للبدء" : "Add a new contract to get started"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                        onClick={onAddClick}
                      >
                        <Plus className="h-3.5 w-3.5 me-1" />
                        {ar ? "عقد جديد" : "New Contract"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
