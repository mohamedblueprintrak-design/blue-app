"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/use-toast-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UsersRound,
  Plus,
  Search,
  Trash2,
  Shield,
  Mail,
  Phone,
  Building2,
  Briefcase,
  UserCheck,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface UserBasic {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  role: string;
  department: string;
  position: string;
  isActive: boolean;
}

interface AssignmentWithUser {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  createdAt: string;
  user: UserBasic;
}

interface TeamMembersProps {
  language: "ar" | "en";
  projectId?: string;
}

// ===== Helpers =====
const PROJECT_ROLES = [
  "project_manager",
  "engineer",
  "architect",
  "draftsman",
  "supervisor",
  "consultant",
  "TEAM_MEMBER",
] as const;

function getProjectRoleLabel(role: string, ar: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    project_manager: { ar: "مدير المشروع", en: "Project Manager" },
    engineer: { ar: "مهندس", en: "Engineer" },
    architect: { ar: "معماري", en: "Architect" },
    draftsman: { ar: "مساح", en: "Draftsman" },
    supervisor: { ar: "مشرف", en: "Supervisor" },
    consultant: { ar: "استشاري", en: "Consultant" },
    TEAM_MEMBER: { ar: "عضو فريق", en: "Team Member" },
  };
  return labels[role]?.[ar ? "ar" : "en"] || role;
}

function getProjectRoleColor(role: string) {
  const colors: Record<string, string> = {
    project_manager: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    engineer: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    architect: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    draftsman: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    supervisor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    consultant: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    TEAM_MEMBER: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return colors[role] || colors.team_member;
}

function getProjectRoleIcon(role: string) {
  switch (role) {
    case "project_manager": return Shield;
    case "engineer": return Briefcase;
    case "architect": return Building2;
    case "draftsman": return UserCheck;
    default: return UsersRound;
  }
}

function getHashColor(name: string): string {
  const colors = [
    "bg-teal-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500",
    "bg-violet-500", "bg-rose-500", "bg-sky-500", "bg-lime-500",
    "bg-orange-500", "bg-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}


function getDepartmentLabel(dept: string, ar: boolean) {
  if (!dept) return ar ? "غير محدد" : "Not specified";
  const labels: Record<string, { ar: string; en: string }> = {
    ARCHITECTURAL: { ar: "القسم المعماري", en: "Architectural" },
    STRUCTURAL: { ar: "القسم الإنشائي", en: "Structural" },
    ELECTRICAL: { ar: "الكهرباء", en: "Electrical" },
    MEP: { ar: "الميكانيك", en: "MEP" },
    management: { ar: "الإدارة", en: "Management" },
    hr: { ar: "الموارد البشرية", en: "HR" },
    finance: { ar: "المالية", en: "Finance" },
    DESIGN: { ar: "التصميم", en: "Design" },
  };
  return labels[dept]?.[ar ? "ar" : "en"] || dept;
}

// ===== Avatar Component =====
function UserAvatar({
  user,
  size = "md",
  showStatus = false,
}: {
  user: { name: string; avatar: string; isActive: boolean };
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}) {
  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-14 h-14 text-lg",
  };

  if (user.avatar) {
    return (
      <div className="relative">
        <Image
          src={user.avatar}
          alt={user.name}
          className={cn("rounded-full object-cover ring-2 ring-white dark:ring-slate-900", sizeClasses[size])}
          width={size === "sm" ? 32 : size === "md" ? 36 : 56}
          height={size === "sm" ? 32 : size === "md" ? 36 : 56}
        />
        {showStatus && (
          <span className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-slate-900",
            size === "sm" ? "w-2 h-2" : "w-3 h-3",
            user.isActive ? "bg-emerald-500" : "bg-slate-400"
          )} />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={cn(
        "rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-900",
        sizeClasses[size],
        getHashColor(user.name)
      )}>
        {user.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
      {showStatus && (
        <span className={cn(
          "absolute bottom-0 right-0 block rounded-full ring-2 ring-white dark:ring-slate-900",
          size === "sm" ? "w-2 h-2" : "w-3 h-3",
          user.isActive ? "bg-emerald-500" : "bg-slate-400"
        )} />
      )}
    </div>
  );
}

// ===== Main Component =====
export default function TeamMembers({ language, projectId }: TeamMembersProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const toast = useToastFeedback({ ar });
  const t = (arText: string, enText: string) => (ar ? arText : enText);

  // States
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("TEAM_MEMBER");
  const [_removingId, _setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);

  // Fetch assignments for this project
  const { data: assignments = [], isLoading } = useQuery<AssignmentWithUser[]>({
    queryKey: ["project-assignments", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/project-assignments?projectId=${projectId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  // Fetch all users (for add dialog)
  const { data: allUsersData } = useQuery<UserBasic[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || json;
    },
  });
  const allUsers = Array.isArray(allUsersData) ? allUsersData : [];

  // Add member mutation
  const addMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch("/api/project-assignments", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify({ projectId, userId, role }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-assignments", projectId] });
      setShowAddDialog(false);
      setSelectedUserId("");
      setSelectedRole("TEAM_MEMBER");
      toast.created(t("عضو فريق", "team member"));
    },
    onError: () => toast.error(t("إضافة عضو", "Add member")),
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch("/api/project-assignments", {
        method: "PUT",
        headers: getMutationHeaders(),
        body: JSON.stringify({ id, role }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-assignments", projectId] });
      setOpenRoleDropdown(null);
      toast.updated(t("دور العضو", "member role"));
    },
    onError: () => toast.error(t("تحديث الدور", "Update role")),
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/project-assignments", {
        method: "DELETE",
        headers: getMutationHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-assignments", projectId] });
      setConfirmRemoveId(null);
      toast.deleted(t("عضو فريق", "team member"));
    },
    onError: () => toast.error(t("حذف العضو", "Remove member")),
  });

  // Available users (not already assigned)
  const assignedUserIds = new Set(assignments.map((a) => a.userId));
  const availableUsers = allUsers.filter(
    (u) => u.isActive && !assignedUserIds.has(u.id)
  );

  // Summary stats
  const totalMembers = assignments.length;

  // Filtered assignments
  const filtered = (() => {
    return assignments.filter((a) => {
      const matchSearch =
        !search ||
        a.user?.name.toLowerCase().includes(search.toLowerCase()) ||
        a.user?.email.toLowerCase().includes(search.toLowerCase()) ||
        a.user?.department.toLowerCase().includes(search.toLowerCase()) ||
        a.user?.position.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === "all" || a.role === filterRole;
      return matchSearch && matchRole;
    });
  })();

  // Department breakdown
  const departmentBreakdown = (() => {
    const depts: Record<string, number> = {};
    assignments.forEach((a) => {
      const dept = a.user?.department || "other";
      depts[dept] = (depts[dept] || 0) + 1;
    });
    return Object.entries(depts).sort(([, a], [, b]) => b - a);
  })();

  // Role counts for filter chips
  const roleCounts = (() => {
    const counts: Record<string, number> = { all: totalMembers };
    assignments.forEach((a) => {
      counts[a.role] = (counts[a.role] || 0) + 1;
    });
    return counts;
  })();

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="py-0 gap-0">
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===== Header ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <UsersRound className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("فريق المشروع", "Project Team")}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {totalMembers} {t("عضو", "members")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("بحث بالاسم أو القسم...", "Search by name or department...")}
              className="ps-9 h-8 text-sm rounded-lg"
            />
          </div>
          <Button
            size="sm"
            className="h-8 bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm shadow-violet-600/20"
            onClick={() => setShowAddDialog(true)}
            disabled={availableUsers.length === 0}
          >
            <Plus className="h-3.5 w-3.5 me-1" />
            {t("إضافة عضو", "Add Member")}
          </Button>
        </div>
      </div>

      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Members */}
        <Card className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                <UsersRound className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-xs text-violet-100">
                {t("إجمالي الأعضاء", "Total Members")}
              </span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{totalMembers}</div>
            <p className="text-[10px] text-white/60 mt-1">
              {t("عضو في المشروع", "project members")}
            </p>
          </div>
        </Card>

        {/* Department Breakdown - top departments */}
        {departmentBreakdown.slice(0, 3).map(([dept, count], idx) => {
          const gradients = [
            "from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700",
            "from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600",
            "from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700",
          ];
          const icons = [Building2, Briefcase, Shield];
          const Icon = icons[idx] || UsersRound;

          return (
            <Card key={dept} className="py-0 gap-0 border-0 shadow-sm overflow-hidden">
              <div className={cn("bg-gradient-to-br p-4", gradients[idx] || gradients[0])}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-xs text-white/80 line-clamp-1">
                    {getDepartmentLabel(dept, ar)}
                  </span>
                </div>
                <div className="text-xl font-bold text-white tabular-nums">{count}</div>
                <p className="text-[10px] text-white/60 mt-1">
                  {t("عضو", "members")}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ===== Role Filter Chips ===== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {["all", ...PROJECT_ROLES].map((role) => {
          const isActive = filterRole === role;
          const count = roleCounts[role] || 0;
          if (role !== "all" && count === 0) return null;

          return (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                isActive
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {role === "all" ? (
                <UsersRound className="h-3 w-3" />
              ) : (
                (() => {
                  const Icon = getProjectRoleIcon(role);
                  return <Icon className="h-3 w-3" />;
                })()
              )}
              {role === "all" ? t("الكل", "All") : getProjectRoleLabel(role, ar)}
              {count > 0 && (
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===== Members List ===== */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 flex items-center justify-center mb-4">
            <UsersRound className="h-8 w-8 text-violet-300 dark:text-violet-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {search || filterRole !== "all"
              ? t("لا توجد نتائج", "No results found")
              : t("لا يوجد أعضاء", "No team members")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
            {search || filterRole !== "all"
              ? t("لا توجد أعضاء تطابق البحث أو الفلتر", "No members match the search or filter")
              : t("لم تتم إضافة أعضاء إلى هذا المشروع بعد", "No members have been added to this project yet")}
          </p>
          {!search && filterRole === "all" && (
            <Button
              onClick={() => setShowAddDialog(true)}
              className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 shadow-md shadow-violet-500/20"
              disabled={availableUsers.length === 0}
            >
              <Plus className="h-4 w-4" />
              {t("إضافة عضو جديد", "Add New Member")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-440px)] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map((assignment, _idx) => {
            const RoleIcon = getProjectRoleIcon(assignment.role);
            const isConfirming = confirmRemoveId === assignment.id;

            return (
              <Card
                key={assignment.id}
                className={cn(
                  "border rounded-xl transition-all duration-200 hover:shadow-md overflow-hidden",
                  isConfirming
                    ? "border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20"
                    : "border-slate-200 dark:border-slate-700/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <UserAvatar user={assignment.user} size="lg" showStatus />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + Role Badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {assignment.user.name}
                        </h3>
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0",
                          getProjectRoleColor(assignment.role)
                        )}>
                          <RoleIcon className="h-2.5 w-2.5" />
                          {getProjectRoleLabel(assignment.role, ar)}
                        </span>
                      </div>

                      {/* Position + Department */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        {assignment.user.position && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Briefcase className="h-3 w-3" />
                            {assignment.user.position}
                          </div>
                        )}
                        {assignment.user.department && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Building2 className="h-3 w-3" />
                            {getDepartmentLabel(assignment.user.department, ar)}
                          </div>
                        )}
                      </div>

                      {/* Contact */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {assignment.user.email && (
                          <a
                            href={`mailto:${assignment.user.email}`}
                            className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[180px]">{assignment.user.email}</span>
                          </a>
                        )}
                        {assignment.user.phone && (
                          <a
                            href={`tel:${assignment.user.phone}`}
                            dir="ltr"
                            className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            <Phone className="h-3 w-3" />
                            {assignment.user.phone}
                          </a>
                        )}
                      </div>

                      {/* Confirm removal */}
                      {isConfirming && (
                        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
                          <p className="text-xs text-red-700 dark:text-red-300 mb-2">
                            {t(
                              `هل تريد حذف "${assignment.user.name}" من المشروع؟`,
                              `Remove "${assignment.user.name}" from the project?`
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="h-7 bg-red-600 hover:bg-red-700 text-white text-xs border-0"
                              disabled={removeMutation.isPending}
                              onClick={() => removeMutation.mutate(assignment.id)}
                            >
                              {t("تأكيد الحذف", "Confirm Remove")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setConfirmRemoveId(null)}
                            >
                              {t("إلغاء", "Cancel")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {!isConfirming && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Role change dropdown */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            onClick={() => setOpenRoleDropdown(openRoleDropdown === assignment.id ? null : assignment.id)}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                          {openRoleDropdown === assignment.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenRoleDropdown(null)}
                              />
                              <div className="absolute end-0 top-full mt-1 z-50 w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                                <div className="p-1.5 border-b border-slate-100 dark:border-slate-800">
                                  <p className="text-[10px] text-slate-500 px-2 font-medium">
                                    {t("تغيير الدور", "Change Role")}
                                  </p>
                                </div>
                                {PROJECT_ROLES.map((role) => (
                                  <button
                                    key={role}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-2.5 py-2 text-xs transition-colors",
                                      assignment.role === role
                                        ? "bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    )}
                                    onClick={() => {
                                      if (assignment.role !== role) {
                                        updateRoleMutation.mutate({ id: assignment.id, role });
                                      }
                                      setOpenRoleDropdown(null);
                                    }}
                                  >
                                    {(() => {
                                      const Icon = getProjectRoleIcon(role);
                                      return <Icon className="h-3.5 w-3.5" />;
                                    })()}
                                    {getProjectRoleLabel(role, ar)}
                                    {assignment.role === role && (
                                      <span className="ms-auto text-violet-500">
                                        {t("✓", "✓")}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Remove button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setConfirmRemoveId(assignment.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Add Member Dialog ===== */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setSelectedUserId(""); setSelectedRole("TEAM_MEMBER"); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              {t("إضافة عضو جديد", "Add New Member")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "اختر عضو من قائمة الموظفين وأضفه إلى فريق المشروع",
                "Select a member from the employee list and add them to the project team"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search users */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={selectedUserId ? "" : undefined}
                onChange={(_e) => setSelectedUserId("")}
                placeholder={t("اختر عضو الفريق...", "Select team member...")}
                className="ps-9 h-9 text-sm rounded-lg"
                disabled={!!selectedUserId}
              />
            </div>

            {/* Selected user info or user list */}
            {selectedUserId ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40">
                {(() => {
                  const user = allUsers.find((u) => u.id === selectedUserId);
                  if (!user) return null;
                  return (
                    <>
                      <UserAvatar user={user} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.position || user.role}</p>
                        {user.department && (
                          <p className="text-xs text-slate-400">{getDepartmentLabel(user.department, ar)}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                        onClick={() => setSelectedUserId("")}
                      >
                        ✕
                      </Button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <ScrollArea className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="p-1">
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400">
                      {t("جميع الموظفين أعضاء بالفعل", "All employees are already members")}
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <button
                        key={user.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-start"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <UserAvatar user={user} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {user.position || user.role}
                            {user.department ? ` · ${getDepartmentLabel(user.department, ar)}` : ""}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}

            {/* Role selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {t("الدور في المشروع", "Project Role")} *
              </label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-9 text-sm rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const Icon = getProjectRoleIcon(role);
                          return <Icon className="h-3.5 w-3.5 text-slate-400" />;
                        })()}
                        {getProjectRoleLabel(role, ar)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setSelectedUserId("");
                setSelectedRole("TEAM_MEMBER");
              }}
            >
              {t("إلغاء", "Cancel")}
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
              disabled={!selectedUserId || addMutation.isPending}
              onClick={() => {
                if (selectedUserId) {
                  addMutation.mutate({ userId: selectedUserId, role: selectedRole });
                }
              }}
            >
              {addMutation.isPending
                ? t("جارٍ الإضافة...", "Adding...")
                : t("إضافة", "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
