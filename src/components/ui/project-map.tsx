"use client";


import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Layers, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ===== Constants =====
const RAK_CENTER: [number, number] = [25.7895, 55.9432];
const UAE_BOUNDS: L.LatLngBoundsExpression = [
  [22.5, 51.0],
  [26.5, 57.0],
];

// ===== Types =====
interface ProjectMapItem {
  id: string;
  name: string;
  nameEn?: string;
  client?: { name: string; company?: string } | null;
  status: string;
  progress: number;
  latitude: number;
  longitude: number;
  budget?: number;
  type?: string;
  location?: string;
}

interface ProjectMapProps {
  projects: ProjectMapItem[];
  selectedProject: ProjectMapItem | null;
  onSelectProject: (project: ProjectMapItem | null) => void;
  height?: string;
  language?: "ar" | "en";
}

// ===== Status Helpers =====
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#10b981",
  DELAYED: "#ef4444",
  COMPLETED: "#3b82f6",
  ON_HOLD: "#f59e0b",
  CANCELLED: "#6b7280",
};

const STATUS_LABELS_AR: Record<string, string> = {
  ACTIVE: "نشط",
  DELAYED: "متأخر",
  COMPLETED: "مكتمل",
  ON_HOLD: "متوقف",
  CANCELLED: "ملغي",
};

const STATUS_LABELS_EN: Record<string, string> = {
  ACTIVE: "Active",
  DELAYED: "Delayed",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
  CANCELLED: "Cancelled",
};

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || "#6b7280";
}

function getStatusLabel(status: string, lang: "ar" | "en" = "ar"): string {
  if (lang === "en") return STATUS_LABELS_EN[status] || status;
  return STATUS_LABELS_AR[status] || status;
}

function getStatusBgClass(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "DELAYED":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "COMPLETED":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "ON_HOLD":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
}

// ===== Custom Marker Icons =====
function createStatusIcon(status: string): L.DivIcon {
  const color = getStatusColor(status);
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        background: ${color};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        border: 2.5px solid white;
      ">
        <div style="
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

// ===== Map Event Handlers =====
function MapEventHandler({
  onMapClick,
}: {
  onMapClick: () => void;
}) {
  useMapEvents({
    click() {
      onMapClick();
    },
  });
  return null;
}

// ===== Fly To Component =====
function FlyToSelected({
  position,
}: {
  position: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.flyTo(position, 16, {
        duration: 0.8,
      });
    }
  }, [position, map]);

  return null;
}

// ===== Fit Bounds Component =====
function FitBounds({ projects }: { projects: ProjectMapItem[] }) {
  const map = useMap();

  useEffect(() => {
    if (projects.length === 0) return;

    const validProjects = projects.filter(
      (p) => p.latitude && p.longitude
    );

    if (validProjects.length === 1) {
      map.flyTo(
        [validProjects[0].latitude, validProjects[0].longitude],
        14,
        { duration: 1 }
      );
    } else if (validProjects.length > 1) {
      const bounds = L.latLngBounds(
        validProjects.map((p) => [p.latitude, p.longitude] as L.LatLngTuple)
      );
      map.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 1,
        maxZoom: 15,
      });
    }
  }, [projects, map]);

  return null;
}

// ===== Project Popup Content =====
function ProjectPopup({
  project,
  lang = "ar",
}: {
  project: ProjectMapItem;
  lang?: "ar" | "en";
}) {
  const isAr = lang === "ar";
  const name = isAr ? project.name : (project.nameEn || project.name);
  const clientName = project.client?.name || "";
  const clientCompany = project.client?.company || "";
  const location = project.location || "";

  return (
    <div className="min-w-[220px] max-w-[280px]" dir={isAr ? "rtl" : "ltr"}>
      <div className="space-y-2">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-medium",
              getStatusBgClass(project.status)
            )}
          >
            {getStatusLabel(project.status, lang)}
          </span>
          <span className="text-[10px] text-slate-400">
            {project.progress}%
          </span>
        </div>

        {/* Project Name */}
        <h3 className="font-bold text-sm text-slate-800 dark:text-white leading-tight">
          {name}
        </h3>

        {/* Client */}
        {clientName && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {clientCompany
              ? `${clientName} — ${clientCompany}`
              : clientName}
          </p>
        )}

        {/* Location */}
        {location && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {location}
          </p>
        )}

        {/* Progress Bar */}
        <div>
          <Progress
            value={project.progress}
            className="h-1.5"
          />
        </div>

        {/* Budget */}
        {project.budget && project.budget > 0 && (
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {new Intl.NumberFormat(isAr ? "ar-AE" : "en-AE", {
              style: "currency",
              currency: "AED",
              minimumFractionDigits: 0,
            }).format(project.budget)}
          </p>
        )}

        {/* Coordinates */}
        <p className="text-[10px] text-slate-400 font-mono">
          {project.latitude.toFixed(4)}, {project.longitude.toFixed(4)}
        </p>
      </div>
    </div>
  );
}

// ===== Empty Map State =====
function EmptyMapState({ isAr }: { isAr: boolean }) {
  const tAuto = useTranslations();
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 z-[500]">
      <div className="text-center space-y-3 p-6">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
          <MapPin className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">
            {tAuto('auto.noProjectsOnMap')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {tAuto('auto.createAProjectAndSetItsLocationOnTheMapT')}
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function ProjectMap({
  projects,
  selectedProject,
  onSelectProject,
  height = "500px",
  language = "ar",
}: ProjectMapProps) {
  const tAuto = useTranslations();
  const [showSidebar, setShowSidebar] = useState(false);

  const isAr = language === "ar";

  // Filter projects with valid coordinates
  const mappedProjects = useMemo(
    () => projects.filter((p) => p.latitude && p.longitude),
    [projects]
  );

  const selectedPosition: [number, number] | null = selectedProject
    ? [selectedProject.latitude, selectedProject.longitude]
    : null;

  // Status filter counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mappedProjects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [mappedProjects]);

  // Stats
  const totalBudget = useMemo(
    () => mappedProjects.reduce((acc, p) => acc + (p.budget || 0), 0),
    [mappedProjects]
  );

  const formatBudget = (amount: number) =>
    new Intl.NumberFormat(isAr ? "ar-AE" : "en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="relative" style={{ height }}>
      {/* Map Container */}
      <MapContainer
        center={RAK_CENTER}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        maxBounds={UAE_BOUNDS}
        maxBoundsViscosity={0.5}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fly to selected project */}
        <FlyToSelected position={selectedPosition} />

        {/* Fit bounds to all projects when no project selected */}
        {!selectedProject && <FitBounds projects={mappedProjects} />}

        {/* Click map to deselect */}
        <MapEventHandler onMapClick={() => onSelectProject(null)} />

        {/* Project Markers */}
        {mappedProjects.map((project) => (
          <Marker
            key={project.id}
            position={[project.latitude, project.longitude]}
            icon={createStatusIcon(project.status)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                onSelectProject(project);
              },
            }}
          >
            <Popup>
              <ProjectPopup project={project} lang={language} />
            </Popup>
          </Marker>
        ))}

        {/* Empty state overlay */}
        {mappedProjects.length === 0 && <EmptyMapState isAr={isAr} />}
      </MapContainer>

      {/* Status Legend */}
      <div className="absolute top-3 left-3 z-[400] bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2.5 space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-500 mb-1 px-0.5">
          {tAuto('auto.status1')}
        </p>
        {["ACTIVE", "DELAYED", "COMPLETED", "ON_HOLD"].map((status) => (
          <div
            key={status}
            className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer hover:bg-slate-50 rounded px-0.5 py-0.5 transition-colors"
            onClick={() => {
              const project = mappedProjects.find((p) => p.status === status);
              if (project) onSelectProject(project);
            }}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: getStatusColor(status) }}
            />
            <span>{getStatusLabel(status, language)}</span>
            <span className="text-slate-400">({statusCounts[status] || 0})</span>
          </div>
        ))}
      </div>

      {/* Stats Overlay (top right) */}
      <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-2.5 space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="h-3.5 w-3.5 text-brand-navy-500" />
          <span className="font-semibold text-slate-600">
            {tAuto('auto.projects')}: {mappedProjects.length}
          </span>
        </div>
        {totalBudget > 0 && (
          <div className="text-[11px] text-slate-500">
            {tAuto('auto.budget')}: {formatBudget(totalBudget)}
          </div>
        )}
      </div>

      {/* Toggle Sidebar Button (mobile) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] md:hidden">
        <Button
          size="sm"
          variant="outline"
          className="bg-white/90 backdrop-blur-sm shadow-md rounded-full"
          onClick={() => setShowSidebar(!showSidebar)}
        >
          {showSidebar ? (
            <>
              <Layers className="h-4 w-4 me-1.5" />
              {tAuto('auto.map')}
            </>
          ) : (
            <>
              <List className="h-4 w-4 me-1.5" />
              {tAuto('auto.list')}
            </>
          )}
        </Button>
      </div>

      {/* Project List Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0, x: isAr ? 100 : -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isAr ? 100 : -100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-14 left-3 right-3 md:left-auto md:right-3 md:bottom-3 md:w-72 z-[400] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-slate-100 max-h-[40vh] md:max-h-[300px]"
            dir={isAr ? "rtl" : "ltr"}
          >
            <ScrollArea className="h-full max-h-[40vh] md:max-h-[300px]">
              <div className="p-2 space-y-1">
                {mappedProjects.map((project) => {
                  const name = isAr
                    ? project.name
                    : (project.nameEn || project.name);
                  const isSelected =
                    selectedProject?.id === project.id;

                  return (
                    <button
                      key={project.id}
                      onClick={() => onSelectProject(project)}
                      className={cn(
                        "w-full text-start p-2.5 rounded-lg transition-all hover:bg-slate-50",
                        isSelected && "bg-brand-navy-50 ring-1 ring-brand-navy-200"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                          style={{
                            backgroundColor: getStatusColor(project.status),
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {project.client?.name}{" "}
                            {project.client?.company
                              ? `— ${project.client.company}`
                              : ""}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0 rounded-full",
                                getStatusBgClass(project.status)
                              )}
                            >
                              {getStatusLabel(project.status, language)}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {project.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Show All" button when a project is selected */}
      {selectedProject && (
        <div className="absolute bottom-3 right-3 z-[400] hidden md:block">
          <Button
            size="sm"
            variant="outline"
            className="bg-white/90 backdrop-blur-sm shadow-md"
            onClick={() => onSelectProject(null)}
          >
            <MapPin className="h-4 w-4 me-1.5" />
            {tAuto('auto.showAll')}
          </Button>
        </div>
      )}
    </div>
  );
}
