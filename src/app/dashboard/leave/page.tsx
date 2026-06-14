"use client";

import dynamic from "next/dynamic";

const LeavePage = dynamic(() => import("@/components/pages/leave"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/leave
 */
export default function LeavePageRoute() {
  return <LeavePage />;
}
