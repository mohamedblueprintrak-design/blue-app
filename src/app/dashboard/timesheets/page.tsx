"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const TimesheetsPage = dynamic(() => import("@/components/pages/timesheets"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/timesheets
 */
export default function TimesheetsPageRoute() {
  return <TimesheetsPage language={useLang()} />;
}
