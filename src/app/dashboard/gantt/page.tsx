"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const GanttPage = dynamic(() => import("@/components/pages/gantt"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/gantt
 */
export default function GanttPageRoute() {
  return <GanttPage language={useLang()} />;
}
