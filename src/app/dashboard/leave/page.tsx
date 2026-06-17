"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const LeavePage = dynamic(() => import("@/components/pages/leave"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/leave
 */
export default function LeavePageRoute() {
  return <LeavePage language={useLang()} />;
}
