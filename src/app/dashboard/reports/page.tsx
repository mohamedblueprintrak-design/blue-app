"use client";

import dynamic from "next/dynamic";

const ReportsPage = dynamic(() => import("@/components/pages/reports"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/reports
 */
export default function ReportsPageRoute() {
  return <ReportsPage />;
}
