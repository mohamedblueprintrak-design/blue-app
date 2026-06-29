"use client";


import { useTranslations } from 'next-intl';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusIcon } from "@/components/ui/status-icon";
import { Eye, Pencil, Trash2, Users } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { Employee } from "./types";
import { getStatusConfig, getAvatarColor, getInitials, departmentColors } from "./utils";

interface EmployeeTableProps {
  employees: Employee[];
  ar: boolean;
  isLoading: boolean;
  selectedEmployee: Employee | null;
  onSelectEmployee: (emp: Employee | null) => void;
  onEditEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string, name: string) => void;
}

export function EmployeeTable({
  employees,
  ar,
  isLoading,
  selectedEmployee,
  onSelectEmployee,
  onEditEmployee,
  onDeleteEmployee,
}: EmployeeTableProps) {
  const tAuto = useTranslations();
  return (
    <div className={`flex-1 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 overflow-hidden ${selectedEmployee ? "hidden lg:block" : ""}`}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{tAuto('auto.name')}</TableHead>
            <TableHead className="hidden md:table-cell">{tAuto('auto.email')}</TableHead>
            <TableHead className="hidden lg:table-cell">{tAuto('auto.department')}</TableHead>
            <TableHead className="hidden sm:table-cell">{tAuto('auto.position')}</TableHead>
            <TableHead className="hidden md:table-cell">{tAuto('auto.salary')}</TableHead>
            <TableHead>{tAuto('auto.status1')}</TableHead>
            <TableHead className="hidden lg:table-cell">{tAuto('auto.hireDate')}</TableHead>
            <TableHead className="text-start">{tAuto('auto.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((emp) => {
            const statusCfg = getStatusConfig(emp.employmentStatus);
            const deptColor = departmentColors[emp.department] || "bg-slate-400";
            return (
              <TableRow
                key={emp.id}
                className={`group even:bg-slate-50/50 dark:even:bg-slate-800/20 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selectedEmployee?.id === emp.id ? "bg-brand-navy-50/50 dark:bg-brand-navy-950/20" : ""}`}
                onClick={() => onSelectEmployee(emp)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={emp.user.avatar} alt={emp.user.name} />
                      <AvatarFallback className={`text-xs font-semibold ${getAvatarColor(emp.user.name)}`}>
                        {getInitials(emp.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {emp.user.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-slate-500">
                  {emp.user.email || "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${deptColor}`} />
                    {emp.department || "—"}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-slate-600 dark:text-slate-300">
                  {emp.position || "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  {formatCurrency(emp.salary, ar)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={emp.employmentStatus} className="h-3 w-3" />
                    <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 flex items-center gap-1 ${statusCfg.color}`}>
                      {ar ? statusCfg.ar : statusCfg.en}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-slate-500">
                  {emp.hireDate
                    ? new Date(emp.hireDate).toLocaleDateString(ar ? "ar-AE" : "en-US")
                    : "—"}
                </TableCell>
                <TableCell className="text-start" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onSelectEmployee(emp)}
                      aria-label="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEditEmployee(emp)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      onClick={() => onDeleteEmployee(emp.id, emp.user.name)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {employees.length === 0 && !isLoading && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                {tAuto('auto.noEmployeesFound')}
              </TableCell>
            </TableRow>
          )}
          {isLoading && (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                {tAuto('auto.loading')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
