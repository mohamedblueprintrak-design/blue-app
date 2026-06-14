"use client";

import dynamic from "next/dynamic";

const TasksPage = dynamic(() => import("@/components/pages/tasks"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/tasks
 */
export default function TasksPageRoute() {
  return <TasksPage />;
}
