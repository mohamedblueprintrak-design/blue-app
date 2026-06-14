"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const TasksPage = dynamic(() => import("@/components/pages/tasks"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/tasks
 */
export default function TasksPageRoute() {
  return <TasksPage language={useLang()} />;
}
