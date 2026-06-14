"use client";

import dynamic from "next/dynamic";

const ProgressClaimsPage = dynamic(() => import("@/components/pages/progress-claims"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/progress-claims
 */
export default function ProgressClaimsPageRoute() {
  return <ProgressClaimsPage />;
}
