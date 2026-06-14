"use client";

import dynamic from "next/dynamic";

const AttendancePage = dynamic(() => import("@/components/pages/attendance"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/attendance
 */
export default function AttendancePageRoute() {
  return <AttendancePage />;
}
