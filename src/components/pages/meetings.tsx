"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { meetingSchema, getErrorMessage, type MeetingFormData } from "@/lib/validations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Video,
  Eye,
  Trash2,
  Filter,
  MapPin,
  Clock,
  Users,
  Calendar,
  Monitor,
  Building2,
  FileText,
  X,
  ListChecks,
  Zap,
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

// ===== Types =====
interface MeetingItem {
  id: string;
  projectId: string | null;
  title: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  type: string;
  notes: string;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
  attendees: MeetingAttendee[];
  agenda: MeetingAgendaItem[];
}

interface MeetingAttendee {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; avatar: string } | null;
}

interface MeetingAgendaItem {
  id: string;
  topic: string;
  duration: number;
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
  EMAIL: string;
}

// ===== Helpers =====
function getTypeBadge(type: string, ar: boolean) {
  const configs: Record<string, { label: string; labelEn: string; color: string; icon: typeof Monitor }> = {
    ONSITE: { label: "حضوري", labelEn: "On-site", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300", icon: Building2 },
    ONLINE: { label: "عن بُعد", labelEn: "Online", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300", icon: Monitor },
  };
  const cfg = configs[type] || configs.ONSITE;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", cfg.color)}>
      <Icon className="h-3 w-3" />
      {ar ? cfg.label : cfg.labelEn}
    </span>
  );
}

function formatDuration(minutes: number, ar: boolean) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}${ar ? " دقيقة" : " min"}`;
  if (mins === 0) return `${hours}${ar ? " ساعة" : "h"}`;
  return `${hours}${ar ? "س " : "h "}${mins}${ar ? "د" : "m"}`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300",
    "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300",
    "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300",
    "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
    "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
    "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ===== Main Component =====
interface MeetingsProps {
  language: "ar" | "en";
  projectId?: string;
}

export default function Meetings({ language, projectId }: MeetingsProps) {
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");
  useEffect(() => {
    if (projectId) setFilterProject(projectId);
  }, [projectId]);
  const [filterType, setFilterType] = useState<string>("all");

  // Fetch meetings
  const { data: meetings = [], isLoading } = useQuery<MeetingItem[]>({
    queryKey: ["meetings", projectId, filterProject, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      const res = await fetch(`/api/meetings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch users
  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ["users-simple"],
    queryFn: async () => {
      const res = await fetch("/api/users-simple");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/meetings/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- zodResolver + react-hook-form type mismatch
    defaultValues: {
      projectId: projectId || "",
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      duration: 60,
      location: "",
      type: "ONSITE",
      notes: "",
    },
  });
  const { register, handleSubmit: rhfHandleSubmit, formState: { errors }, reset, setValue, watch } = form;

  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<Array<{ topic: string; duration: number }>>([]);

  const resetForm = () => {
    reset();
    setSelectedAttendeeIds([]);
    setAgendaItems([]);
  };

  const toggleAttendee = (userId: string) => {
    setSelectedAttendeeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, { topic: "", duration: 15 }]);
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const updateAgendaItem = (index: number, field: string, value: string | number) => {
    const updated = [...agendaItems];
    updated[index] = { ...updated[index], [field]: value };
    setAgendaItems(updated);
  };

  const totalAgendaDuration = agendaItems.reduce((sum, item) => sum + item.duration, 0);

  const onSubmit = (data: MeetingFormData) => {
    createMutation.mutate({
      ...data,
      projectId: data.projectId || null,
      attendeeIds: selectedAttendeeIds,
      agendaItems,
    });
  };

  // Filter meetings by type on client
  const filteredMeetings = filterType === "all"
    ? meetings
    : meetings.filter((m) => m.type === filterType);

  // Weekly schedule strip helper
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Stats
  const totalThisWeek = meetings.filter((m) => {
    const md = new Date(m.date);
    md.setHours(0, 0, 0, 0);
    return md >= today && md <= weekEnd;
  }).length;
  const now = new Date();
  const upcoming24h = meetings.filter((m) => {
    const mdt = new Date(`${m.date}T${m.time}`);
    return mdt > now && mdt.getTime() - now.getTime() < 24 * 3600000;
  }).length;
  const completedThisWeek = meetings.filter((m) => {
    const md = new Date(m.date);
    const mdt = new Date(`${m.date}T${m.time}`);
    md.setHours(0, 0, 0, 0);
    return md >= today && md <= weekEnd && mdt < now;
  }).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
              <Video className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {ar ? "الاجتماعات" : "Meetings"}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {meetings.length} {ar ? "اجتماع" : "meetings"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
            {!projectId && (
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
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

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg">
                <SelectValue placeholder={ar ? "النوع" : "Type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? "الكل" : "All"}</SelectItem>
                <SelectItem value="ONSITE">{ar ? "حضوري" : "On-site"}</SelectItem>
                <SelectItem value="ONLINE">{ar ? "عن بُعد" : "Online"}</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-3.5 w-3.5 me-1" />
              {ar ? "اجتماع جديد" : "New Meeting"}
            </Button>
          </div>
        </div>

        {/* Weekly Schedule Strip */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekDays.map((d, i) => {
            const isToday = d.toDateString() === now.toDateString();
            const dayMeetings = meetings.filter((m) => m.date === d.toISOString().split("T")[0]);
            return (
              <button
                key={i}
                className={cn(
                  "flex flex-col items-center min-w-[52px] px-2 py-2.5 rounded-xl border transition-all duration-200 shrink-0",
                  isToday
                    ? "bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 hover:border-teal-200 dark:hover:border-teal-800"
                )}
              >
                <span className={cn(
                  "text-[10px] font-medium",
                  isToday ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"
                )}>
                  {d.toLocaleDateString(ar ? "ar-AE" : "en-US", { weekday: "short" })}
                </span>
                <span className={cn(
                  "text-lg font-bold mt-0.5",
                  isToday ? "text-teal-700 dark:text-teal-300" : "text-slate-700 dark:text-slate-300"
                )}>
                  {d.getDate()}
                </span>
                {dayMeetings.length > 0 && (
                  <span className={cn(
                    "mt-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center",
                    isToday
                      ? "bg-teal-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  )}>
                    {dayMeetings.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Meeting Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{totalThisWeek}</div>
                <div className="text-[10px] text-slate-500">{ar ? "هذا الأسبوع" : "This Week"}</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Zap className="h-4 w-4 text-teal-500" />
              </div>
              <div>
                <div className="text-lg font-bold text-teal-600 dark:text-teal-400">{upcoming24h}</div>
                <div className="text-[10px] text-slate-500">{ar ? "خلال 24 ساعة" : "Next 24h"}</div>
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ListChecks className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{completedThisWeek}</div>
                <div className="text-[10px] text-slate-500">{ar ? "مكتملة" : "Completed"}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Meeting Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse rounded-xl">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </Card>
            ))}
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Video className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              {ar ? "لا توجد اجتماعات" : "No meetings"}
            </h3>
            <p className="text-sm text-slate-500">
              {ar ? "ابدأ بجدولة اجتماع جديد" : "Start by scheduling a new meeting"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeetings.map((meeting) => {
              const meetingDate = new Date(meeting.date);
              const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
              const isToday = meetingDate.toDateString() === now.toDateString();
              const isWithin24h = meetingDateTime > now && meetingDateTime.getTime() - now.getTime() < 24 * 3600000;
              const isWithin1h = meetingDateTime > now && meetingDateTime.getTime() - now.getTime() < 3600000;
              const isPast = meetingDateTime < now;

              return (
                <Card
                  key={meeting.id}
                  className={cn(
                    "rounded-xl p-0 border overflow-hidden bg-white dark:bg-slate-900 shadow-sm",
                    "hover:shadow-md transition-all group cursor-pointer",
                    isToday ? "ring-2 ring-teal-500/50" : "",
                    meeting.type === "ONSITE"
                      ? "border-s-teal-400 border-s-4"
                      : "border-s-sky-400 border-s-4",
                    meeting.type === "ONSITE"
                      ? "border-teal-200/80 dark:border-teal-800/60"
                      : "border-sky-200/80 dark:border-sky-800/60"
                  )}
                  onClick={() => { setSelectedMeeting(meeting); setShowDetailDialog(true); }}
                >
                  <div className="p-4">
                    {/* Top: Date + Coming Up badge + Actions */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isWithin1h && !isPast && (
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500" />
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="font-medium">
                            {meetingDate.toLocaleDateString(ar ? "ar-AE" : "en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>
                        {isWithin24h && !isPast && !isWithin1h && (
                          <Badge className="text-[9px] h-5 px-1.5 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-0 animate-pulse gap-0.5">
                            <Zap className="h-2.5 w-2.5" />
                            {ar ? "موعد قريب" : "Coming Up"}
                          </Badge>
                        )}
                        {isToday && !isWithin24h && (
                          <Badge className="text-[8px] h-5 px-1 bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 border-0">
                            {ar ? "اليوم" : "Today"}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={ar ? "start" : "end"} className="w-36">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedMeeting(meeting); setShowDetailDialog(true); }}>
                            <Eye className="h-3.5 w-3.5 me-2" />
                            {ar ? "عرض" : "View"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 dark:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(ar ? "هل أنت متأكد من الحذف؟" : "Delete this meeting?")) {
                                deleteMutation.mutate(meeting.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 me-2" />
                            {ar ? "حذف" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5 truncate">
                      {meeting.title}
                    </h3>

                    {/* Time + Duration + Type badges */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        <Clock className="h-3 w-3" />
                        <span>{meeting.time}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                        {formatDuration(meeting.duration, ar)}
                      </span>
                      {getTypeBadge(meeting.type, ar)}
                    </div>

                    {/* Location */}
                    {meeting.location && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{meeting.location}</span>
                      </div>
                    )}

                    {/* Agenda count */}
                    {meeting.agenda.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <ListChecks className="h-3 w-3" />
                        <span>{meeting.agenda.length} {ar ? "بنود جدول أعمال" : "agenda items"}</span>
                      </div>
                    )}

                    {/* Bottom: Attendees + Project */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        {/* Avatar Stack */}
                        <div className="flex items-center gap-1">
                          <div className="flex -space-x-2">
                            {meeting.attendees.slice(0, 4).map((att) => (
                              <Tooltip key={att.id}>
                                <TooltipTrigger asChild>
                                  <div className="relative">
                                    <Avatar className="h-7 w-7 border-2 border-white dark:border-slate-900 ring-1 ring-slate-200 dark:ring-slate-700">
                                      <AvatarImage src={att.user?.avatar} alt={att.user?.name || ""} />
                                      <AvatarFallback className={cn("text-[9px] font-medium", getAvatarColor(att.user?.name || "U"))}>
                                        {getInitials(att.user?.name || "U")}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                  {att.user?.name || "—"}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                          {meeting.attendees.length > 4 && (
                            <span className="text-[10px] text-slate-400 ms-1 font-medium">+{meeting.attendees.length - 4}</span>
                          )}
                        </div>
                        {meeting.project && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">
                              {ar ? meeting.project.name : meeting.project.nameEn || meeting.project.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-teal-500" />
                {ar ? "اجتماع جديد" : "New Meeting"}
              </DialogTitle>
              <DialogDescription>
                {ar ? "جدولة اجتماع جديد مع الفريق" : "Schedule a new meeting with the team"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={rhfHandleSubmit(onSubmit as (data: unknown) => void)} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">{ar ? "عنوان الاجتماع *" : "Meeting Title *"}</Label>
                <Input {...register("title")} placeholder={ar ? "عنوان الاجتماع" : "Meeting title"} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{getErrorMessage(errors.title.message || "", ar)}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "التاريخ *" : "Date *"}</Label>
                  <Input
                    type="date"
                    {...register("date")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "الوقت" : "Time"}</Label>
                  <Input
                    type="time"
                    {...register("time")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "المدة (دقيقة)" : "Duration (min)"}</Label>
                  <Input
                    type="number"
                    {...register("duration", { valueAsNumber: true })}
                    min={15}
                    step={15}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "المشروع" : "Project"}</Label>
                  {/* eslint-disable-next-line react-hooks/incompatible-library */}
                  <Select value={watch("projectId")} onValueChange={(v) => setValue("projectId", v)}>
                    <SelectTrigger><SelectValue placeholder={ar ? "اختياري" : "Optional"} /></SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "النوع" : "Type"}</Label>
                  <Select value={watch("type")} onValueChange={(v) => setValue("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONSITE">{ar ? "حضوري" : "On-site"}</SelectItem>
                      <SelectItem value="ONLINE">{ar ? "عن بُعد" : "Online"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{ar ? "المكان" : "Location"}</Label>
                  <Input
                    {...register("location")}
                    placeholder={watch("type") === "ONLINE" ? "Zoom/Teams link" : (ar ? "قاعة الاجتماعات" : "Meeting room")}
                  />
                </div>
              </div>

              <Separator />

              {/* Attendees */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {ar ? "الحضور" : "Attendees"} ({selectedAttendeeIds.length})
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto scrollbar-thin">
                  {users.map((user) => {
                    const isSelected = selectedAttendeeIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border text-start transition-colors",
                          isSelected
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}
                        onClick={() => toggleAttendee(user.id)}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className={cn("text-[8px]", getAvatarColor(user.name))}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs truncate">{user.name}</span>
                        {isSelected && (
                          <span className="ms-auto text-teal-500 text-xs">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Agenda Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" />
                    {ar ? "جدول الأعمال" : "Agenda"}
                    {totalAgendaDuration > 0 && (
                      <span className="text-[10px] text-slate-400 ms-1">
                        ({formatDuration(totalAgendaDuration, ar)})
                      </span>
                    )}
                  </Label>
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={addAgendaItem}>
                    <Plus className="h-3 w-3 me-1" />
                    {ar ? "إضافة بند" : "Add Item"}
                  </Button>
                </div>

                {agendaItems.length === 0 ? (
                  <div className="text-center py-3 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                    <p className="text-xs text-slate-400">{ar ? "لم يتم إضافة بنود" : "No agenda items"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agendaItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-5 shrink-0">{index + 1}.</span>
                        <Input
                          className="h-7 text-xs flex-1 rounded-lg"
                          value={item.topic}
                          onChange={(e) => updateAgendaItem(index, "topic", e.target.value)}
                          placeholder={ar ? "الموضوع" : "Topic"}
                        />
                        <Input
                          className="h-7 text-xs w-20 rounded-lg"
                          type="number"
                          value={item.duration}
                          onChange={(e) => updateAgendaItem(index, "duration", Number(e.target.value) || 15)}
                          min={5}
                          step={5}
                        />
                        <span className="text-[10px] text-slate-400">{ar ? "د" : "m"}</span>
                        <button onClick={() => removeAgendaItem(index)} className="p-0.5 text-slate-400 hover:text-red-500 shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{ar ? "ملاحظات" : "Notes"}</Label>
                <Textarea
                  {...register("notes")}
                  placeholder={ar ? "ملاحظات إضافية" : "Additional notes"}
                  rows={2}
                />
              </div>
            </form>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                {ar ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (ar ? "جارٍ الإنشاء..." : "Creating...") : (ar ? "إنشاء" : "Create")}
              </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedMeeting && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-teal-500" />
                    {selectedMeeting.title}
                  </DialogTitle>
                  <DialogDescription>
                    {new Date(selectedMeeting.date).toLocaleDateString(ar ? "ar-AE" : "en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Meeting Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{selectedMeeting.time}</div>
                      <div className="text-[10px] text-slate-500">{formatDuration(selectedMeeting.duration, ar)}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                      {getTypeBadge(selectedMeeting.type, ar)}
                      <div className="text-[10px] text-slate-500 mt-1">{ar ? "النوع" : "Type"}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                      <MapPin className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <div className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {selectedMeeting.location || (ar ? "غير محدد" : "Not set")}
                      </div>
                      <div className="text-[10px] text-slate-500">{ar ? "المكان" : "Location"}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center">
                      <Users className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{selectedMeeting.attendees.length}</div>
                      <div className="text-[10px] text-slate-500">{ar ? "حضور" : "Attendees"}</div>
                    </div>
                  </div>

                  {/* Project */}
                  {selectedMeeting.project && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                      <Building2 className="h-4 w-4 text-teal-500" />
                      <div>
                        <div className="text-[10px] text-slate-500">{ar ? "المشروع" : "Project"}</div>
                        <div className="text-xs font-medium text-slate-900 dark:text-white">
                          {ar ? selectedMeeting.project.name : selectedMeeting.project.nameEn || selectedMeeting.project.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attendees */}
                  {selectedMeeting.attendees.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {ar ? "قائمة الحضور" : "Attendees"}
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedMeeting.attendees.map((att) => (
                          <div key={att.id} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-full pl-1 pr-3 py-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={att.user?.avatar} alt={att.user?.name || ""} />
                              <AvatarFallback className={cn("text-[7px]", getAvatarColor(att.user?.name || "U"))}>
                                {getInitials(att.user?.name || "U")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-slate-700 dark:text-slate-300">{att.user?.name || "-"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agenda */}
                  {selectedMeeting.agenda.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <ListChecks className="h-4 w-4" />
                        {ar ? "جدول الأعمال" : "Agenda"} ({selectedMeeting.agenda.length})
                      </Label>
                      <div className="space-y-1.5">
                        {selectedMeeting.agenda.map((item, idx) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-slate-900 dark:text-white flex-1">{item.topic}</span>
                            <span className="text-[10px] text-slate-400">{formatDuration(item.duration, ar)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedMeeting.notes && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        {ar ? "ملاحظات" : "Notes"}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 whitespace-pre-wrap">
                        {selectedMeeting.notes}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
