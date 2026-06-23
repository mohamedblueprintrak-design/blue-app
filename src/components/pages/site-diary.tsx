"use client";


import { useTranslations } from 'next-intl';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  BookOpen,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  Users,
  Wrench,
  Package,
  ShieldCheck,
  AlertCircle,
  Filter,
  Trash2,
  MoreHorizontal,
  Camera,
  FileText,
  HardHat,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getMutationHeaders } from "@/lib/csrf-client";

// ===== Types =====
interface SiteDiaryItem {
  id: string;
  projectId: string;
  date: string;
  weather: string;
  workerCount: number;
  workDescription: string;
  issues: string;
  safetyNotes: string;
  equipment: string;
  materials: string;
  createdAt: string;
  project: { id: string; name: string; nameEn: string; number: string } | null;
}

interface ProjectOption { id: string; name: string; nameEn: string; number: string; }

// ===== Helpers =====
function getWeatherIcon(weather: string) {
  const w = (weather || "").toLowerCase();
  if (w.includes("rain") || w.includes("مطر")) return <CloudRain className="h-4 w-4 text-blue-500" />;
  if (w.includes("sun") || w.includes("مشمس") || w.includes("حار")) return <Sun className="h-4 w-4 text-amber-500" />;
  if (w.includes("snow") || w.includes("ثلج")) return <CloudSnow className="h-4 w-4 text-slate-400" />;
  if (w.includes("cloud") || w.includes("غائم")) return <Cloud className="h-4 w-4 text-slate-400" />;
  return <Sun className="h-4 w-4 text-amber-400" />;
}

function getWeatherBgColor(weather: string) {
  const w = (weather || "").toLowerCase();
  if (w.includes("rain") || w.includes("مطر")) return "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50";
  if (w.includes("sun") || w.includes("مشمس") || w.includes("حار")) return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50";
  if (w.includes("snow") || w.includes("ثلج")) return "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
  if (w.includes("cloud") || w.includes("غائم")) return "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700";
  return "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700";
}

function groupByDate(entries: SiteDiaryItem[]) {
  const groups: Record<string, SiteDiaryItem[]> = {};
  entries.forEach((entry) => {
    const dateKey = new Date(entry.date).toLocaleDateString("en-CA");
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(entry);
  });
  return groups;
}

function getEntryTypeIcon(hasWork: boolean, hasIssues: boolean, hasSafety: boolean, hasEquipment: boolean, hasMaterials: boolean) {
  if (hasIssues) return { icon: AlertCircle, color: "text-red-500 bg-red-50 dark:bg-red-900/20" };
  if (hasSafety) return { icon: ShieldCheck, color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" };
  if (hasWork) return { icon: HardHat, color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" };
  if (hasEquipment) return { icon: Wrench, color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20" };
  if (hasMaterials) return { icon: Package, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" };
  return { icon: FileText, color: "text-slate-500 bg-slate-50 dark:bg-slate-800/50" };
}

// ===== Main Component =====
interface SiteDiaryProps { language: "ar" | "en"; projectId?: string; }

export default function SiteDiary({ language, projectId }: SiteDiaryProps) {
  const tAuto = useTranslations();
  const ar = language === "ar";
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterProject, setFilterProject] = useState<string>(projectId || "all");

  const { data: diaries = [], isLoading } = useQuery<SiteDiaryItem[]>({
    queryKey: ["site-diary", filterProject],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProject !== "all") params.set("projectId", filterProject);
      const res = await fetch(`/api/site-diary?${params}`);
      if (!res.ok) throw new Error("Failed to fetch site diaries");
      const json = await res.json(); return json.data || json;
    },
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await fetch("/api/projects-simple");
      if (!res.ok) return [];
      const json = await res.json(); return json.data || json;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/site-diary", {
        method: "POST",
        headers: getMutationHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create site diary");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-diary"] });
      setShowAddDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/site-diary/${id}`, { method: "DELETE", headers: getMutationHeaders() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["site-diary"] }),
  });



  const [formData, setFormData] = useState({
    projectId: projectId || "",
    date: new Date().toISOString().split("T")[0],
    weather: "",
    workerCount: "",
    workDescription: "",
    issues: "",
    safetyNotes: "",
    equipment: "",
    materials: "",
  });

  const resetForm = () => setFormData({
    projectId: projectId || (filterProject !== "all" ? filterProject : ""),
    date: new Date().toISOString().split("T")[0],
    weather: "",
    workerCount: "",
    workDescription: "",
    issues: "",
    safetyNotes: "",
    equipment: "",
    materials: "",
  });

  const grouped = groupByDate(diaries);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <BookOpen className="h-4.5 w-4.5 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{tAuto('auto.siteDiary')}</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {diaries.length} {tAuto('auto.entries')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ms-auto">
          {!projectId && (
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px] h-8 text-xs rounded-lg">
              <Filter className="h-3 w-3 me-1 text-slate-400" />
              <SelectValue placeholder={tAuto('auto.project')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tAuto('auto.allProjects')}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          )}
          <Button size="sm" className="h-8 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 me-1" />{tAuto('auto.newEntry')}
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" /><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" /></Card>
          ))}
        </div>
      ) : diaries.length === 0 ? (
        /* Enhanced Empty State */
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <BookOpen className="h-9 w-9 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="absolute -bottom-1 -end-1 w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center border-2 border-white dark:border-slate-950">
              <Plus className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{tAuto('auto.noDiaryEntries')}</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-xs">
            {tAuto('auto.startByAddingANewSiteDiaryEntryToTrackDa')}
          </p>
          <div className="flex items-center gap-6 justify-center text-xs text-slate-400 mb-6">
            <div className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-400" />
              <span>{tAuto('auto.weather')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardHat className="h-3.5 w-3.5 text-teal-400" />
              <span>{tAuto('auto.work')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>{tAuto('auto.safety')}</span>
            </div>
          </div>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm shadow-teal-600/20"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4 me-1.5" />
            {tAuto('auto.newDiaryEntry')}
          </Button>
        </div>
      ) : (
        <div className="relative space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto pb-4">
          {/* Timeline line */}
          <div className="absolute start-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-400 via-slate-200 to-slate-200 dark:from-teal-600 dark:via-slate-700 dark:to-slate-700" />

          {sortedDates.map((dateKey, dateIdx) => {
            const entries = grouped[dateKey];
            const dateObj = new Date(dateKey + "T00:00:00");
            const today = new Date();
            const isToday = dateObj.toDateString() === today.toDateString();
            const isYesterday = new Date(today.getTime() - 86400000).toDateString() === dateObj.toDateString();

            return (
              <div key={dateKey} className="relative ps-14">
                {/* Date marker with enhanced dot */}
                <div className={cn(
                  "absolute start-[19px] top-1.5 w-[18px] h-[18px] rounded-full border-[3px] z-10 flex items-center justify-center",
                  isToday
                    ? "bg-teal-500 border-white dark:border-slate-950 shadow-md shadow-teal-500/30"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600",
                )}>
                  {isToday && (
                    <div className="w-2 h-2 rounded-full bg-white dark:bg-teal-900" />
                  )}
                </div>

                {/* Date Grouping Header */}
                <div className={cn(
                  "flex items-center gap-2 mb-3 py-1.5 px-3 -ms-3 rounded-lg",
                  isToday && "bg-teal-50 dark:bg-teal-900/20",
                  !isToday && dateIdx % 2 === 0 && "bg-slate-50/50 dark:bg-slate-800/20",
                )}>
                  <span className={cn(
                    "text-sm font-bold",
                    isToday ? "text-teal-700 dark:text-teal-300" : "text-slate-900 dark:text-white",
                  )}>
                    {dateObj.toLocaleDateString(ar ? "ar-AE" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  </span>
                  {isToday && (
                    <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 text-[10px] h-5 border-0">
                      {tAuto('auto.today')}
                    </Badge>
                  )}
                  {isYesterday && !isToday && (
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] h-5 border-0">
                      {tAuto('auto.yesterday1')}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px] h-5 ms-auto">
                    {entries.length} {tAuto('auto.entries')}
                  </Badge>
                </div>

                {/* Entries for this date */}
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const entryType = getEntryTypeIcon(
                      !!entry.workDescription,
                      !!entry.issues,
                      !!entry.safetyNotes,
                      !!entry.equipment,
                      !!entry.materials,
                    );
                    const EntryIcon = entryType.icon;
                    const hasContent = entry.workDescription || entry.issues || entry.safetyNotes || entry.equipment || entry.materials;
                    const contentCount = [entry.workDescription, entry.issues, entry.safetyNotes, entry.equipment, entry.materials].filter(Boolean).length;

                    return (
                      <Card key={entry.id} className={cn(
                        "p-4 bg-white dark:bg-slate-900 group hover:shadow-md transition-shadow overflow-hidden",
                        entry.issues ? "border-red-200 dark:border-red-800/50 border-s-red-400 border-s-4" : "border-slate-200 dark:border-slate-700/50",
                      )}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {/* Entry type icon */}
                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", entryType.color)}>
                              <EntryIcon className="h-3.5 w-3.5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] h-5 border-slate-300 dark:border-slate-600">
                              {entry.project ? (ar ? entry.project.name : entry.project.nameEn || entry.project.name) : "-"}
                            </Badge>
                            {contentCount > 1 && (
                              <Badge variant="secondary" className="text-[9px] h-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {contentCount} {tAuto('auto.items')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Photo attachment indicator placeholder */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="More options">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={ar ? "start" : "end"} className="w-36">
                                  <DropdownMenuItem className="text-red-600 dark:text-red-400" onClick={() => { if (confirm(tAuto('auto.deleteThisEntry'))) deleteMutation.mutate(entry.id); }}>
                                    <Trash2 className="h-3.5 w-3.5 me-2" />{tAuto('auto.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>

                        {/* Weather + Workers + Temperature */}
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          {entry.weather && (
                            <div className={cn(
                              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
                              getWeatherBgColor(entry.weather),
                            )}>
                              {getWeatherIcon(entry.weather)}
                              <span className="font-medium">{entry.weather}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-medium">{entry.workerCount} {tAuto('auto.workers')}</span>
                          </div>
                        </div>

                        {/* Content Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {entry.workDescription && (
                            <div className="rounded-lg p-2.5 border border-teal-100 dark:border-teal-900/30 bg-teal-50/50 dark:bg-teal-950/10">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400 mb-1.5 uppercase tracking-wide">
                                <HardHat className="h-3 w-3" />
                                {tAuto('auto.workDone')}
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">{entry.workDescription}</p>
                            </div>
                          )}

                          {entry.issues && (
                            <div className="rounded-lg p-2.5 border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/10">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 mb-1.5 uppercase tracking-wide">
                                <AlertCircle className="h-3 w-3" />
                                {tAuto('auto.issues')}
                              </div>
                              <p className="text-xs text-red-700 dark:text-red-300 line-clamp-3 leading-relaxed">{entry.issues}</p>
                            </div>
                          )}

                          {entry.safetyNotes && (
                            <div className="rounded-lg p-2.5 border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 uppercase tracking-wide">
                                <ShieldCheck className="h-3 w-3" />
                                {tAuto('auto.safety')}
                              </div>
                              <p className="text-xs text-amber-700 dark:text-amber-300 line-clamp-3 leading-relaxed">{entry.safetyNotes}</p>
                            </div>
                          )}

                          {entry.equipment && (
                            <div className="rounded-lg p-2.5 border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1.5 uppercase tracking-wide">
                                <Wrench className="h-3 w-3" />
                                {tAuto('auto.equipment')}
                              </div>
                              <p className="text-xs text-blue-700 dark:text-blue-300 line-clamp-3 leading-relaxed">{entry.equipment}</p>
                            </div>
                          )}

                          {entry.materials && (
                            <div className="rounded-lg p-2.5 border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 md:col-span-2">
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 uppercase tracking-wide">
                                <Package className="h-3 w-3" />
                                {tAuto('auto.materials')}
                              </div>
                              <p className="text-xs text-emerald-700 dark:text-emerald-300 line-clamp-2 leading-relaxed">{entry.materials}</p>
                            </div>
                          )}
                        </div>

                        {/* Photo attachment indicator */}
                        {!hasContent && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                            <Camera className="h-3 w-3" />
                            <span>{tAuto('auto.quickEntryNoDetailsAdded')}</span>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tAuto('auto.newDiaryEntry')}</DialogTitle>
            <DialogDescription>{tAuto('auto.recordANewSiteDiaryEntry')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.project2')}</Label>
                <Select value={formData.projectId} onValueChange={(v) => setFormData({ ...formData, projectId: v })}>
                  <SelectTrigger><SelectValue placeholder={tAuto('auto.selectProject')} /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{ar ? p.name : p.nameEn || p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.date1')}</Label>
                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.weather')}</Label>
                <Input value={formData.weather} onChange={(e) => setFormData({ ...formData, weather: e.target.value })} placeholder={tAuto('auto.sunnyCloudyRainy')} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.workerCount')}</Label>
                <Input type="number" min={0} value={formData.workerCount} onChange={(e) => setFormData({ ...formData, workerCount: e.target.value })} placeholder="0" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.workDescription')}</Label>
              <Textarea value={formData.workDescription} onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })} placeholder={tAuto('auto.descriptionOfWorkDoneToday')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.issues')}</Label>
              <Textarea value={formData.issues} onChange={(e) => setFormData({ ...formData, issues: e.target.value })} placeholder={tAuto('auto.anyIssuesEncountered')} rows={2} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{tAuto('auto.safetyNotes')}</Label>
              <Textarea value={formData.safetyNotes} onChange={(e) => setFormData({ ...formData, safetyNotes: e.target.value })} placeholder={tAuto('auto.safetyObservations')} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.equipment')}</Label>
                <Textarea value={formData.equipment} onChange={(e) => setFormData({ ...formData, equipment: e.target.value })} placeholder={tAuto('auto.equipmentUsed')} rows={2} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{tAuto('auto.materials')}</Label>
                <Textarea value={formData.materials} onChange={(e) => setFormData({ ...formData, materials: e.target.value })} placeholder={tAuto('auto.materialsArrived')} rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>{tAuto('auto.cancel')}</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => createMutation.mutate(formData)} disabled={!formData.projectId || !formData.date || createMutation.isPending}>
              {createMutation.isPending ? (tAuto('auto.creating')) : (tAuto('auto.create'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
