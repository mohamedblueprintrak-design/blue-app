"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const CalendarPage = dynamic(() => import("@/components/pages/calendar"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/calendar
 */
export default function CalendarPageRoute() {
  return <CalendarPage language={useLang()} />;
}
