import { useState, useEffect, useCallback, useRef, RefObject } from "react";
import { GanttTask } from "@/components/gantt/gantt-types";

interface UseGanttDragOptions {
  tasks: GanttTask[];
  setTasks: React.Dispatch<React.SetStateAction<GanttTask[]>>;
  timelineHeadersLength: number;
  timelineRef: RefObject<HTMLDivElement | null>;
  onUpdateTask: (task: GanttTask) => void;
}

interface UseGanttDragReturn {
  draggedTask: GanttTask | null;
  dragMode: "move" | "resize-left" | "resize-right" | null;
  handleDragStart: (e: React.MouseEvent, task: GanttTask, mode: "move" | "resize-left" | "resize-right") => void;
}

export function useGanttDrag({
  tasks,
  setTasks,
  timelineHeadersLength,
  timelineRef,
  onUpdateTask,
}: UseGanttDragOptions): UseGanttDragReturn {
  const [draggedTask, setDraggedTask] = useState<GanttTask | null>(null);
  const [dragMode, setDragMode] = useState<"move" | "resize-left" | "resize-right" | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [originalDates, setOriginalDates] = useState<{ start: string | null; end: string | null } | null>(null);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggedTask || !dragMode || !originalDates || !timelineRef.current) return;
      const timelineWidth = timelineRef.current.offsetWidth;
      const deltaX = e.clientX - dragStartX;
      const daysDelta = Math.round((deltaX / timelineWidth) * timelineHeadersLength);
      if (daysDelta === 0) return;
      const ONE_DAY = 24 * 60 * 60 * 1000;
      let newStartDate = originalDates.start;
      let newEndDate = originalDates.end;
      if (dragMode === "move") {
        if (originalDates.start) newStartDate = new Date(new Date(originalDates.start).getTime() + daysDelta * ONE_DAY).toISOString();
        if (originalDates.end) newEndDate = new Date(new Date(originalDates.end).getTime() + daysDelta * ONE_DAY).toISOString();
      } else if (dragMode === "resize-left" && originalDates.start && originalDates.end) {
        const newStart = new Date(new Date(originalDates.start).getTime() + daysDelta * ONE_DAY);
        if (newStart < new Date(originalDates.end)) newStartDate = newStart.toISOString();
      } else if (dragMode === "resize-right" && originalDates.start && originalDates.end) {
        const newEnd = new Date(new Date(originalDates.end).getTime() + daysDelta * ONE_DAY);
        if (newEnd > new Date(originalDates.start)) newEndDate = newEnd.toISOString();
      }
      setTasks((prev) => prev.map((t) => (t.id === draggedTask.id ? { ...t, startDate: newStartDate, endDate: newEndDate } : t)));
    },
    [draggedTask, dragMode, dragStartX, originalDates, timelineHeadersLength, timelineRef, setTasks]
  );

  const handleDragEndRef = useRef<() => void>(() => {});
  const handleDragEnd = useCallback(() => {
    if (draggedTask) {
      const updatedTask = tasks.find((t) => t.id === draggedTask.id);
      if (updatedTask) onUpdateTask(updatedTask);
    }
    setDraggedTask(null);
    setDragMode(null);
    setOriginalDates(null);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEndRef.current);
  }, [draggedTask, tasks, onUpdateTask, handleDragMove]);
  useEffect(() => { handleDragEndRef.current = handleDragEnd; }, [handleDragEnd]);

  const handleDragStart = (e: React.MouseEvent, task: GanttTask, mode: "move" | "resize-left" | "resize-right") => {
    e.preventDefault();
    setDraggedTask(task);
    setDragMode(mode);
    setDragStartX(e.clientX);
    setOriginalDates({ start: task.startDate, end: task.endDate });
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
  };

  return { draggedTask, dragMode, handleDragStart };
}
