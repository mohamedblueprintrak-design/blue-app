import { useTranslations } from 'next-intl';
import React, { RefObject } from "react";
import { GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GanttTask,
  FlattenedItem,
  isPhaseHeader,
  getBarColor,
} from "@/components/gantt/gantt-types";

interface TimelineHeader {
  date: Date;
  label: string;
  isToday: boolean;
  dayOfWeek: number;
}

interface MonthLabel {
  label: string;
  startIndex: number;
  count: number;
}

interface GanttTimelineProps {
  ar: boolean;
  timelineHeaders: TimelineHeader[];
  monthLabels: MonthLabel[];
  todayPosition: number | null;
  flattenedItems: FlattenedItem[];
  getTaskPosition: (task: GanttTask) => { left: string; width: string } | null;
  viewRange: { start: Date; end: Date };
  draggedTask: GanttTask | null;
  dragMode: "move" | "resize-left" | "resize-right" | null;
  onDragStart: (e: React.MouseEvent, task: GanttTask, mode: "move" | "resize-left" | "resize-right") => void;
  onTaskClick: (task: GanttTask) => void;
  timelineRef: RefObject<HTMLDivElement | null>;
}

export function GanttTimeline({
  ar,
  timelineHeaders,
  monthLabels,
  todayPosition,
  flattenedItems,
  getTaskPosition,
  viewRange,
  draggedTask,
  dragMode,
  onDragStart,
  onTaskClick,
  timelineRef,
}: GanttTimelineProps) {
  const tAuto = useTranslations();
  return (
    <div
      className="flex-1 overflow-x-auto"
      ref={timelineRef}
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Month labels row */}
      <div className="h-7 border-b border-slate-200 dark:border-slate-700/50 flex bg-slate-50 dark:bg-slate-800/30 sticky top-0 z-20">
        {monthLabels.map((ml, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 h-7 flex items-center px-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 border-e border-slate-200/50 dark:border-slate-700/30"
            style={{ width: `${(ml.count / timelineHeaders.length) * 100}%` }}
          >
            {ml.label}
          </div>
        ))}
      </div>

      {/* Day headers row */}
      <div className="h-8 border-b border-slate-200 dark:border-slate-700/50 flex bg-white dark:bg-slate-900 sticky top-7 z-20">
        {timelineHeaders.map((header, index) => (
          <div
            key={index}
            className={cn(
              "flex-shrink-0 w-10 h-8 flex flex-col items-center justify-center text-[10px] border-e border-slate-100 dark:border-slate-800/30 last:border-e-0",
              (header.dayOfWeek === 5 || header.dayOfWeek === 6) && "bg-slate-50/80 dark:bg-slate-800/20",
              header.isToday && "bg-brand-navy-50 dark:bg-brand-navy-900/20"
            )}
          >
            <span className={cn(header.isToday ? "text-brand-navy-600 dark:text-brand-navy-400 font-bold" : "text-slate-400 dark:text-slate-500")}>
              {header.label}
            </span>
          </div>
        ))}
      </div>

      {/* Task Bars + Today Line */}
      <div className="relative">
        {/* Today Line */}
        {todayPosition !== null && (
          <div className="absolute top-0 bottom-0 w-0.5 bg-brand-navy-500 z-10 pointer-events-none" style={{ left: `${todayPosition}%` }}>
            <div className="absolute -top-5 -translate-x-1/2 bg-brand-navy-500 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm">
              {tAuto('auto.today')}
            </div>
          </div>
        )}

        {/* Task Rows */}
        {flattenedItems.map((item) => {
          if (isPhaseHeader(item)) {
            return (
              <div key={`phase-bar-${item.category}`} className="h-9 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/10" />
            );
          }

          const task = item as GanttTask;
          const position = getTaskPosition(task);
          const isBeingDragged = draggedTask?.id === task.id;
          const barColor = getBarColor(task);

          return (
            <div key={task.id} className="h-11 border-b border-slate-100 dark:border-slate-800/50 relative">
              {position && (
                <div
                  className={cn(
                    "absolute top-1.5 h-8 rounded-lg flex items-center group shadow-sm",
                    isBeingDragged && "ring-2 ring-brand-navy-400 ring-opacity-50"
                  )}
                  style={{
                    left: position.left,
                    width: position.width,
                    backgroundColor: barColor,
                    cursor: dragMode === "move" ? "grabbing" : "grab",
                    opacity: task.status === "CANCELLED" ? 0.5 : 1,
                  }}
                >
                  {/* Left Resize Handle */}
                  <div
                    className="absolute start-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-s-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onDragStart(e, task, "resize-left");
                    }}
                  >
                    <GripHorizontal className="w-3 h-3 text-white/60" />
                  </div>

                  {/* Progress Fill */}
                  <div className="h-full rounded-s-lg" style={{ width: `${task.progress}%`, backgroundColor: "rgba(255,255,255,0.25)" }} />

                  {/* Task Title */}
                  <div
                    className="flex-1 px-2 cursor-grab min-w-0"
                    onMouseDown={(e) => onDragStart(e, task, "move")}
                    onClick={() => !draggedTask && onTaskClick(task)}
                  >
                    <span className="text-[10px] text-white truncate block font-medium">{task.title}</span>
                  </div>

                  {/* Right Resize Handle */}
                  <div
                    className="absolute end-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-e-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onDragStart(e, task, "resize-right");
                    }}
                  >
                    <GripHorizontal className="w-3 h-3 text-white/60" />
                  </div>
                </div>
              )}

              {/* Milestone Diamond */}
              {task.isMilestone && task.endDate && (() => {
                const endDateOffset = Math.floor((new Date(task.endDate).getTime() - viewRange.start.getTime()) / (1000 * 60 * 60 * 24));
                const milestonePct = (endDateOffset / timelineHeaders.length) * 100;
                if (milestonePct < 0 || milestonePct > 100) return null;
                return (
                  <div className="absolute top-2.5 z-[6] pointer-events-none" style={{ left: `${milestonePct}%` }}>
                    <div className="w-5 h-5 transform rotate-45 bg-amber-500 border-2 border-amber-300 shadow-lg shadow-amber-500/30" />
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
