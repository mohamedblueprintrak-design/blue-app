"use client";

import dynamic from "next/dynamic";

const ActivityLogPage = dynamic(() => import("@/components/pages/activity-log"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/activity-log
 */
export default function ActivityLogPageRoute() {
  return <ActivityLogPage />;
}
