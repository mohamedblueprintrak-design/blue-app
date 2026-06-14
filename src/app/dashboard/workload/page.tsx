"use client";

import dynamic from "next/dynamic";

const WorkloadPage = dynamic(() => import("@/components/pages/workload"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/workload
 */
export default function WorkloadPageRoute() {
  return <WorkloadPage />;
}
