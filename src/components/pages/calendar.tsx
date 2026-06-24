"use client";


import { useTranslations } from 'next-intl';
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from '@/components/ui/card'
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, CalendarIcon, List, Clock, MapPin, CheckSquare, Users, AlertTriangle, CalendarDays, CalendarClock, Star } from 'lucide-react'

import { useNavStore } from "@/store/nav-store";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  startOfDay,
  endOfWeek as endOfWeekDate,
  startOfWeek as startOfWeekDate,
  addDays,
} from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  language: "ar" | "en";
  projectId?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "task" | "meeting" | "deadline" | "site_visit" | "review" | "holiday";
  status: string;
  projectId?: string;
  subtitle?: string;
  location?: string;
  attendees?: string[];
}

const eventTypeConfig: Record<string, {
  color: string;
  bg: string;
  border: string;
  dot: string;
  ar: string;
  en: string;
  icon: typeof Clock;
}> = {
  meeting: {
    color: "bg-brand-navy-500",
    bg: "bg-brand-navy-50 dark:bg-brand-navy-950",
    border: "border-brand-navy-500",
    dot: "bg-brand-navy-500",
    ar: "اجتماع",
    en: "Meeting",
    icon: Users,
  },
  deadline: {
    color: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-500",
    dot: "bg-red-500",
    ar: "موعد نهائي",
    en: "Deadline",
    icon: AlertTriangle,
  },
  site_visit: {
    color: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-500",
    dot: "bg-amber-500",
    ar: "زيارة موقع",
    en: "Site Visit",
    icon: MapPin,
  },
  review: {
    color: "bg-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950",
    border: "border-violet-500",
    dot: "bg-violet-500",
    ar: "مراجعة",
    en: "Review",
    icon: Star,
  },
  holiday: {
    color: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-500",
    dot: "bg-emerald-500",
    ar: "عطلة",
    en: "Holiday",
    icon: CalendarDays,
  },
  task: {
    color: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-500",
    dot: "bg-blue-500",
    ar: "مهمة",
    en: "Task",
    icon: CheckSquare,
  },
};

const avatarColors = [
  "bg-brand-navy-100 dark:bg-brand-navy-900 text-brand-navy-700 dark:text-brand-navy-300",
  "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
  "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
  "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
  "bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300",
  "bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300",
  "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
  "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CalendarPage({ language: lang, projectId }: Props) {
  const tAuto = useTranslations();
  const isAr = lang === "ar";
  const locale = isAr ? ar : enUS;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { setCurrentPage, setCurrentProjectId } = useNavStore();

  // Fetch tasks
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["calendar-tasks", projectId],
    queryFn: () =>
      fetch(`/api/tasks?status=IN_PROGRESS&limit=50${projectId ? `&projectId=${projectId}` : ''}`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data : data.tasks || [])),
  });

  // Fetch meetings
  const { data: meetings = [], isLoading: isLoadingMeetings } = useQuery({
    queryKey: ["calendar-meetings", projectId],
    queryFn: () =>
      fetch(`/api/meetings?limit=50${projectId ? `&projectId=${projectId}` : ''}`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data : [])),
  });

  // Fetch invoices for deadlines
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["calendar-invoices", projectId],
    queryFn: () =>
      fetch(`/api/invoices?status=OVERDUE&limit=50${projectId ? `&projectId=${projectId}` : ''}`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data : data.invoices || [])),
  });

  // Fetch site visits
  const { data: siteVisits = [], isLoading: isLoadingSiteVisits } = useQuery({
    queryKey: ["calendar-site-visits", projectId],
    queryFn: () =>
      fetch(`/api/site-visits?limit=50${projectId ? `&projectId=${projectId}` : ''}`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data : [])),
  });

  // Build calendar events
  const events = useMemo(() => {
    const evts: CalendarEvent[] = [];

    tasks.forEach((t: Record<string, unknown>) => {
      if (t.dueDate) {
        evts.push({
          id: t.id as string,
          title: (t.title as string) || "",
          date: t.dueDate as string,
          type: "task",
          status: t.status as string,
          projectId: t.projectId as string,
          subtitle: t.priority as string,
          attendees: (t.assignee as string) ? [(t.assignee as string)] : undefined,
        });
      }
    });

    meetings.forEach((m: Record<string, unknown>) => {
      if (m.date) {
        evts.push({
          id: m.id as string,
          title: (m.title as string) || "",
          date: m.date as string,
          type: "meeting",
          status: "",
          projectId: m.projectId as string,
          subtitle: (m.time as string) ? `${m.time} - ${m.duration || 60}${tAuto('auto.min')}` : undefined,
          location: m.location as string,
          attendees: (m.attendees as string[]) || undefined,
        });
      }
    });

    invoices.forEach((inv: Record<string, unknown>) => {
      if (inv.dueDate) {
        evts.push({
          id: inv.id as string,
          title: `${tAuto('auto.invoice')} ${inv.number || ""}`,
          date: inv.dueDate as string,
          type: "deadline",
          status: inv.status as string,
        });
      }
    });

    siteVisits.forEach((sv: Record<string, unknown>) => {
      if (sv.date) {
        evts.push({
          id: sv.id as string,
          title: `${tAuto('auto.siteVisit')} - ${sv.municipality || ""}`,
          date: sv.date as string,
          type: "site_visit",
          status: sv.status as string,
          projectId: sv.projectId as string,
          location: sv.address as string,
        });
      }
    });

    return evts;
  }, [tasks, meetings, invoices, siteVisits, isAr, tAuto]);

  // Stat calculations
  const todayEvents = useMemo(() => {
    const today = new Date();
    return events.filter((e) => isSameDay(new Date(e.date), today));
  }, [events]);

  const weekTasks = useMemo(() => {
    const now = startOfDay(new Date());
    const weekEnd = endOfWeekDate(now, { weekStartsOn: isAr ? 6 : 0 });
    const weekStart = startOfWeekDate(now, { weekStartsOn: isAr ? 6 : 0 });
    return events.filter((e) => {
      const d = new Date(e.date);
      return !isBefore(d, weekStart) && !isAfter(d, weekEnd);
    });
  }, [events, isAr]);

  const overdueDeadlines = useMemo(() => {
    const now = startOfDay(new Date());
    return events.filter((e) => e.type === "deadline" && isBefore(new Date(e.date), now));
  }, [events]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const weekStart = startOfWeek(monthStart, { weekStartsOn: isAr ? 6 : 0 });
    const weekEnd = endOfWeek(monthEnd, { weekStartsOn: isAr ? 6 : 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentMonth, isAr]);

  // Upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => {
        const d = new Date(e.date);
        return !isBefore(d, startOfDay(now)) && !isAfter(d, addDays(now, 7));
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [events]);

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.date), day));

  const getSelectedDayEvents = () =>
    selectedDate ? getEventsForDay(selectedDate) : [];

  const weekDays = isAr
    ? ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
    : ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

  const handleEventClick = (event: CalendarEvent) => {
    if (event.projectId && (event.type === "task" || event.type === "meeting" || event.type === "site_visit")) {
      setCurrentProjectId(event.projectId);
      setCurrentPage("projects");
    } else if (event.type === "deadline") {
      setCurrentPage("financial-invoices");
    }
  };

  // Loading state
  if (isLoadingTasks || isLoadingMeetings || isLoadingInvoices || isLoadingSiteVisits) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-navy-100 dark:bg-brand-navy-900/30 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-brand-navy-600 dark:text-brand-navy-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tAuto('auto.todaySEvents')}
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {todayEvents.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tAuto('auto.thisWeekTasks')}
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {weekTasks.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tAuto('auto.overdueDeadlines')}
                </p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {overdueDeadlines.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Header with Gradient */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-navy-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {format(currentMonth, tAuto('auto.mMMMYyyy'), { locale })}
              </h2>
              <p className="text-sm text-brand-navy-100">
                {isAr ? `${events.length} حدث مسجل` : `${events.length} events scheduled`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              aria-label={tAuto('auto.previousMonth')}
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(null);
              }}
              className="h-9 bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm"
            >
              {tAuto('auto.today')}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-9 w-9 bg-white/20 text-white border-0 hover:bg-white/30 backdrop-blur-sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              aria-label={tAuto('auto.nextMonth')}
            >
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 flex flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800">
          {Object.entries(eventTypeConfig).map(([key, config]) => {
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {isAr ? config.ar : config.en}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
          {/* Calendar Grid */}
          <div className="lg:col-span-3 p-4">
            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-px mb-px">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden">
              {calendarDays.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isWeekend = day.getDay() === 5;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "relative min-h-[80px] md:min-h-[100px] p-1.5 text-start transition-all",
                      inMonth
                        ? "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        : "bg-slate-50 dark:bg-slate-950",
                      today && !isSelected && "ring-2 ring-brand-navy-500 ring-inset bg-brand-navy-50/50 dark:bg-brand-navy-950/30",
                      isSelected && "bg-brand-navy-50 dark:bg-brand-navy-950",
                      isWeekend && inMonth && !today && !isSelected && "bg-slate-50/50 dark:bg-slate-900/50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-medium inline-flex h-6 w-6 items-center justify-center rounded-full",
                        !inMonth
                          ? "text-slate-300 dark:text-slate-600"
                          : today
                            ? "bg-brand-navy-600 text-white shadow-sm shadow-brand-navy-500/30"
                            : "text-slate-700 dark:text-slate-300"
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Event indicators */}
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt) => {
                        const config = eventTypeConfig[evt.type];
                        return (
                          <div
                            key={evt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(evt);
                            }}
                            className={cn(
                              "flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer hover:opacity-80 transition-opacity text-start",
                              config?.bg || "bg-slate-100"
                            )}
                          >
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", config?.dot || "bg-slate-400")} />
                            <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate leading-tight">
                              {evt.title}
                            </span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-brand-navy-600 dark:text-brand-navy-400 font-medium px-1">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar: Selected Day Events + Upcoming */}
          <div className="hidden lg:flex flex-col border-s border-slate-100 dark:border-slate-800">
            {/* Selected Day Events */}
            <div className="flex-1 border-b border-slate-100 dark:border-slate-800">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-brand-navy-600" />
                  {selectedDate
                    ? format(selectedDate, tAuto('auto.eEEEMMMMD'), { locale })
                    : tAuto('auto.selectADay')}
                </h3>
              </div>
              <div className="p-3 max-h-64 overflow-y-auto">
                {selectedDate ? (
                  getSelectedDayEvents().length > 0 ? (
                    <div className="space-y-2">
                      {getSelectedDayEvents()
                        .sort((a, b) => {
                          const priority: Record<string, number> = { deadline: 0, MEETING: 1, REVIEW: 2, site_visit: 3, holiday: 4, task: 5 };
                          return (priority[a.type] || 6) - (priority[b.type] || 6);
                        })
                        .map((evt) => {
                          const config = eventTypeConfig[evt.type];
                          if (!config) return null;
                          const Icon = config.icon;
                          return (
                            <button
                              key={evt.id}
                              onClick={() => handleEventClick(evt)}
                              className="w-full text-start"
                            >
                              <div
                                className={cn(
                                  "rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-sm transition-all p-3",
                                  `border-s-4 ${config.border}`
                                )}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                                    <Icon className={cn("h-4 w-4", config.color.replace("bg-", "text-"))} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                                      {evt.title}
                                    </p>
                                    {evt.subtitle && (
                                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {evt.subtitle}
                                      </p>
                                    )}
                                    {evt.location && (
                                      <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {evt.location}
                                      </p>
                                    )}
                                    <Badge
                                      className={cn(
                                        "mt-1.5 text-[10px] h-5 px-1.5 border-0",
                                        config.bg,
                                        config.color.replace("bg-", "text-")
                                      )}
                                    >
                                      {isAr ? config.ar : config.en}
                                    </Badge>
                                  </div>
                                </div>
                                {/* Attendee avatars */}
                                {evt.attendees && evt.attendees.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    {evt.attendees.slice(0, 3).map((a, idx) => (
                                      <div
                                        key={idx}
                                        className={cn(
                                          "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-slate-900 -me-1.5",
                                          getAvatarColor(a)
                                        )}
                                      >
                                        {getInitials(a)}
                                      </div>
                                    ))}
                                    {evt.attendees.length > 3 && (
                                      <span className="text-[10px] text-slate-400 ms-2">
                                        +{evt.attendees.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <CalendarIcon className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500">
                        {tAuto('auto.noEvents')}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <List className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs text-slate-500">
                      {tAuto('auto.clickADay')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Events Sidebar */}
            <div className="flex-1">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {tAuto('auto.upcoming')}
                </h3>
              </div>
              <div className="p-3 max-h-64 overflow-y-auto">
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingEvents.map((evt) => {
                      const config = eventTypeConfig[evt.type];
                      if (!config) return null;
                      const Icon = config.icon;
                      const evtDate = new Date(evt.date);
                      const daysUntil = Math.ceil((evtDate.getTime() - new Date().getTime()) / 86400000);
                      return (
                        <button
                          key={evt.id}
                          onClick={() => {
                            setSelectedDate(evtDate);
                            handleEventClick(evt);
                          }}
                          className={cn(
                            "w-full text-start flex items-center gap-2.5 p-2 rounded-lg border-s-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                            config.border
                          )}
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                            <Icon className={cn("h-3.5 w-3.5", config.color.replace("bg-", "text-"))} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                              {evt.title}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {format(evtDate, tAuto('auto.mMMD'), { locale })}
                              {daysUntil === 0
                                ? tAuto('auto.Today')
                                : daysUntil === 1
                                  ? tAuto('auto.Tomorrow')
                                  : ` — ${daysUntil}${isAr ? " يوم" : "d"}`}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs text-slate-500">
                      {tAuto('auto.noUpcomingEvents')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
