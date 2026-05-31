"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, MoreVertical, ChevronDown, ChevronUp, EyeOff, ArrowUp, ArrowDown, RotateCcw, LayoutDashboard, Plus, X, Settings2, PanelTop } from 'lucide-react'

// ===== Types =====
export interface DashboardWidgetConfig {
  id: string;
  title: string;
  titleEn: string;
  defaultOrder: number;
  defaultVisible: boolean;
  defaultSize: "sm" | "md" | "lg";
}

interface SavedLayout {
  order: string[];
  visibility: Record<string, boolean>;
  collapsed: Record<string, boolean>;
}

// ===== Default Widget Configuration =====
export const defaultWidgets: DashboardWidgetConfig[] = [
  { id: "kpi-cards", title: "المؤشرات الرئيسية", titleEn: "KPI Stats", defaultOrder: 0, defaultVisible: true, defaultSize: "md" },
  { id: "quick-overview", title: "نظرة سريعة", titleEn: "Quick Overview", defaultOrder: 1, defaultVisible: true, defaultSize: "md" },
  { id: "revenue-chart", title: "الإيرادات", titleEn: "Revenue Chart", defaultOrder: 2, defaultVisible: true, defaultSize: "md" },
  { id: "my-tasks", title: "مهامي + حالة النظام", titleEn: "My Tasks & System", defaultOrder: 3, defaultVisible: true, defaultSize: "md" },
  { id: "recent-projects", title: "أحدث المشاريع", titleEn: "Recent Projects", defaultOrder: 4, defaultVisible: true, defaultSize: "md" },
  { id: "gantt-timeline", title: "الجدول الزمني", titleEn: "Gantt Timeline", defaultOrder: 5, defaultVisible: true, defaultSize: "md" },
  { id: "deadlines-team", title: "المواعيد + أداء الفريق", titleEn: "Deadlines & Team", defaultOrder: 6, defaultVisible: true, defaultSize: "md" },
  { id: "activity-overview", title: "آخر النشاطات + نظرة سريعة", titleEn: "Activity & Overview", defaultOrder: 7, defaultVisible: true, defaultSize: "md" },
  { id: "charts-section", title: "الرسوم البيانية", titleEn: "Charts", defaultOrder: 8, defaultVisible: true, defaultSize: "md" },
  { id: "project-health", title: "صحة المشاريع", titleEn: "Project Health", defaultOrder: 9, defaultVisible: true, defaultSize: "md" },
];

const STORAGE_KEY = "blueprint-dashboard-layout";

// ===== Hook: useDashboardLayout =====
export function useDashboardLayout() {
  const [order, setOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return defaultWidgets.map((w) => w.id);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedLayout = JSON.parse(saved);
        if (parsed.order && parsed.order.length > 0) {
          // Merge with defaults: add any new widgets that don't exist yet
          const defaultIds = defaultWidgets.map((w) => w.id);
          const merged = [...parsed.order];
          for (const id of defaultIds) {
            if (!merged.includes(id)) {
              merged.push(id);
            }
          }
          return merged;
        }
      }
    } catch {
      // ignore parse errors
    }
    return defaultWidgets.map((w) => w.id);
  });

  const [visibility, setVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      const v: Record<string, boolean> = {};
      defaultWidgets.forEach((w) => { v[w.id] = w.defaultVisible; });
      return v;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedLayout = JSON.parse(saved);
        if (parsed.visibility) {
          const v: Record<string, boolean> = {};
          defaultWidgets.forEach((w) => {
            v[w.id] = parsed.visibility[w.id] ?? w.defaultVisible;
          });
          return v;
        }
      }
    } catch {
      // ignore
    }
    const v: Record<string, boolean> = {};
    defaultWidgets.forEach((w) => { v[w.id] = w.defaultVisible; });
    return v;
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: SavedLayout = JSON.parse(saved);
        return parsed.collapsed || {};
      }
    } catch {
      // ignore
    }
    return {};
  });

  const [isCustomizing, setIsCustomizing] = useState(false);

  const saveLayout = useCallback((newOrder: string[], newVisibility: Record<string, boolean>, newCollapsed: Record<string, boolean>) => {
    const layout: SavedLayout = {
      order: newOrder,
      visibility: newVisibility,
      collapsed: newCollapsed,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // ignore storage errors
    }
  }, []);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    setOrder((prev) => {
      const newOrder = arrayMove(prev, fromIndex, toIndex);
      saveLayout(newOrder, visibility, collapsed);
      return newOrder;
    });
  }, [visibility, collapsed, saveLayout]);

  const hideWidget = useCallback((widgetId: string) => {
    setVisibility((prev) => {
      const newVis = { ...prev, [widgetId]: false };
      saveLayout(order, newVis, collapsed);
      return newVis;
    });
  }, [order, collapsed, saveLayout]);

  const showWidget = useCallback((widgetId: string) => {
    setVisibility((prev) => {
      const newVis = { ...prev, [widgetId]: true };
      saveLayout(order, newVis, collapsed);
      return newVis;
    });
  }, [order, collapsed, saveLayout]);

  const toggleCollapse = useCallback((widgetId: string) => {
    setCollapsed((prev) => {
      const newCollapsed = { ...prev, [widgetId]: !prev[widgetId] };
      saveLayout(order, visibility, newCollapsed);
      return newCollapsed;
    });
  }, [order, visibility, saveLayout]);

  const resetLayout = useCallback(() => {
    const newOrder = defaultWidgets.map((w) => w.id);
    const newVis: Record<string, boolean> = {};
    const newCollapsed: Record<string, boolean> = {};
    defaultWidgets.forEach((w) => { newVis[w.id] = w.defaultVisible; });
    setOrder(newOrder);
    setVisibility(newVis);
    setCollapsed(newCollapsed);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const visibleOrder = useMemo(() => order.filter((id) => visibility[id] !== false), [order, visibility]);
  const hiddenWidgets = useMemo(() => order.filter((id) => visibility[id] === false), [order, visibility]);

  const getWidgetConfig = useCallback((id: string) => {
    return defaultWidgets.find((w) => w.id === id);
  }, []);

  return {
    order,
    visibleOrder,
    hiddenWidgets,
    visibility,
    collapsed,
    isCustomizing,
    setIsCustomizing,
    moveWidget,
    hideWidget,
    showWidget,
    toggleCollapse,
    resetLayout,
    getWidgetConfig,
  };
}

// ===== Sortable Widget Item (DnD wrapper) =====
function SortableWidgetItem({
  id,
  isCustomizing,
  children,
}: {
  id: string;
  isCustomizing: boolean;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="relative group/widget">
        {/* Drag handle - only visible in customize mode */}
        {isCustomizing && (
          <div
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="absolute top-2 start-2 z-10 h-8 w-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-teal-50 dark:hover:bg-teal-950/30 hover:border-teal-300 dark:hover:border-teal-700 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4 text-slate-400 group-hover/widget:text-teal-500" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ===== Widget Options Menu =====
function WidgetOptionsMenu({
  widgetId: _widgetId,
  title,
  titleEn,
  isAr,
  isFirst,
  isLast,
  isCollapsed,
  onMoveUp,
  onMoveDown,
  onHide,
  onToggleCollapse,
}: {
  widgetId: string;
  title: string;
  titleEn: string;
  isAr: boolean;
  isFirst: boolean;
  isLast: boolean;
  isCollapsed: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onHide: () => void;
  onToggleCollapse: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="absolute top-2 end-2 z-10" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="h-7 w-7 rounded-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center opacity-0 group-hover/widget:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200"
        title={isAr ? "خيارات" : "Options"}
      >
        <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute end-0 top-8 z-50 min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Widget title */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
              {isAr ? title : titleEn}
            </p>
          </div>

          {/* Collapse/Expand */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); setIsOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            {isCollapsed
              ? <ChevronDown className="h-3.5 w-3.5 text-teal-500" />
              : <ChevronUp className="h-3.5 w-3.5 text-teal-500" />
            }
            {isCollapsed
              ? (isAr ? "توسيع" : "Expand")
              : (isAr ? "طي" : "Collapse")}
          </button>

          {/* Move Up */}
          {!isFirst && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveUp(); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              {isAr ? "نقل للأعلى" : "Move Up"}
            </button>
          )}

          {/* Move Down */}
          {!isLast && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveDown(); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {isAr ? "نقل للأسفل" : "Move Down"}
            </button>
          )}

          {/* Hide */}
          <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onHide(); setIsOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <EyeOff className="h-3.5 w-3.5" />
              {isAr ? "إخفاء" : "Hide"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Widget Slot: wraps each widget section =====
export function WidgetSlot({
  widgetId,
  children,
  layout,
  language,
}: {
  widgetId: string;
  children: React.ReactNode;
  layout: ReturnType<typeof useDashboardLayout>;
  language: "ar" | "en";
}) {
  const isAr = language === "ar";
  const config = layout.getWidgetConfig(widgetId);
  const isCollapsed = layout.collapsed[widgetId] === true;
  const isVisible = layout.visibility[widgetId] !== false;

  if (!isVisible) return null;

  const currentIndex = layout.visibleOrder.indexOf(widgetId);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === layout.visibleOrder.length - 1;

  const handleMoveUp = () => {
    if (currentIndex > 0) {
      layout.moveWidget(currentIndex, currentIndex - 1);
    }
  };

  const handleMoveDown = () => {
    if (currentIndex < layout.visibleOrder.length - 1) {
      layout.moveWidget(currentIndex, currentIndex + 1);
    }
  };

  return (
    <SortableWidgetItem id={widgetId} isCustomizing={layout.isCustomizing}>
      <div className="relative">
        {/* Options menu - always visible on hover */}
        <WidgetOptionsMenu
          widgetId={widgetId}
          title={config?.title || widgetId}
          titleEn={config?.titleEn || widgetId}
          isAr={isAr}
          isFirst={isFirst}
          isLast={isLast}
          isCollapsed={isCollapsed}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onHide={() => layout.hideWidget(widgetId)}
          onToggleCollapse={() => layout.toggleCollapse(widgetId)}
        />

        {/* Collapsed header bar */}
        {isCollapsed && (
          <div
            className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => layout.toggleCollapse(widgetId)}
          >
            <div className="flex items-center gap-2.5">
              <PanelTop className="h-4 w-4 text-teal-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isAr ? (config?.title || widgetId) : (config?.titleEn || widgetId)}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        )}

        {/* Widget content */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[9999px] opacity-100"
          )}
        >
          {children}
        </div>
      </div>
    </SortableWidgetItem>
  );
}

// ===== Hidden Widgets Panel =====
function HiddenWidgetsPanel({
  hiddenWidgets,
  getWidgetConfig,
  onShowWidget,
  isAr,
}: {
  hiddenWidgets: string[];
  getWidgetConfig: (id: string) => DashboardWidgetConfig | undefined;
  onShowWidget: (id: string) => void;
  isAr: boolean;
}) {
  if (hiddenWidgets.length === 0) return null;

  return (
    <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-950/10">
      <div className="flex items-center gap-2 mb-3">
        <EyeOff className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {isAr ? "العناصر المخفية" : "Hidden Widgets"}
        </h3>
        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/50 px-2 py-0.5 rounded-full">
          {hiddenWidgets.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {hiddenWidgets.map((id) => {
          const config = getWidgetConfig(id);
          return (
            <button
              key={id}
              onClick={() => onShowWidget(id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-400 hover:text-teal-600 dark:hover:border-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all duration-200 group"
            >
              <Plus className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
              {isAr ? (config?.title || id) : (config?.titleEn || id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===== Customize Bar =====
function CustomizeBar({
  isCustomizing,
  onToggle,
  onReset,
  hiddenCount,
  isAr,
}: {
  isCustomizing: boolean;
  onToggle: () => void;
  onReset: () => void;
  hiddenCount: number;
  isAr: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={onToggle}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200",
          isCustomizing
            ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-200 dark:shadow-teal-900/50"
            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700 hover:text-teal-600 dark:hover:text-teal-400"
        )}
      >
        <Settings2 className="h-3.5 w-3.5" />
        {isCustomizing
          ? (isAr ? "إنهاء التخصيص" : "Done Editing")
          : (isAr ? "تخصيص التخطيط" : "Customize Layout")
        }
      </button>

      {isCustomizing && (
        <>
          {hiddenCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <EyeOff className="h-3 w-3" />
              {hiddenCount} {isAr ? "مخفي" : "hidden"}
            </span>
          )}

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-300 hover:text-red-600 dark:hover:border-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 transition-all duration-200"
          >
            <RotateCcw className="h-3 w-3" />
            {isAr ? "إعادة تعيين" : "Reset Layout"}
          </button>
        </>
      )}
    </div>
  );
}

// ===== Main Dashboard Layout Manager =====
export function DashboardLayoutManager({
  children,
  layout,
  language,
}: {
  children: React.ReactNode;
  layout: ReturnType<typeof useDashboardLayout>;
  language: "ar" | "en";
}) {
  const isAr = language === "ar";
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layout.visibleOrder.indexOf(active.id as string);
      const newIndex = layout.visibleOrder.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        layout.moveWidget(oldIndex, newIndex);
      }
    }
  }, [layout]);

  return (
    <div className="space-y-6">
      {/* Customize toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div />
        <CustomizeBar
          isCustomizing={layout.isCustomizing}
          onToggle={() => layout.setIsCustomizing(!layout.isCustomizing)}
          onReset={layout.resetLayout}
          hiddenCount={layout.hiddenWidgets.length}
          isAr={isAr}
        />
      </div>

      {/* Edit mode banner */}
      {layout.isCustomizing && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800 rounded-xl text-xs text-teal-700 dark:text-teal-400">
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            {isAr
              ? "وضع التخصيص: اسحب العناصر لإعادة ترتيبها، أو استخدم القائمة (⋯) لإخفاء/طي العناصر"
              : "Customization mode: Drag items to reorder, or use the ⋯ menu to hide/collapse widgets"}
          </span>
          <button
            onClick={() => layout.setIsCustomizing(false)}
            className="ms-auto h-5 w-5 rounded-full flex items-center justify-center hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* DnD context with sortable widgets */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={layout.visibleOrder as UniqueIdentifier[]}
          strategy={verticalListSortingStrategy}
        >
          <div className={cn(
            "space-y-4",
            layout.isCustomizing && "select-none"
          )}>
            {children}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hidden widgets panel */}
      {layout.isCustomizing && layout.hiddenWidgets.length > 0 && (
        <HiddenWidgetsPanel
          hiddenWidgets={layout.hiddenWidgets}
          getWidgetConfig={layout.getWidgetConfig}
          onShowWidget={layout.showWidget}
          isAr={isAr}
        />
      )}
    </div>
  );
}
