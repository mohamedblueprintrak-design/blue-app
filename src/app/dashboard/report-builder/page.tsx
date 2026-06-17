"use client";

import dynamic from "next/dynamic";

const ReportBuilderPage = dynamic(() => import("@/components/pages/report-builder"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/report-builder
 */
export default function ReportBuilderPageRoute() {
  return <ReportBuilderPage />;
}
