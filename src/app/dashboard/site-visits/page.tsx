"use client";

import dynamic from "next/dynamic";

const SiteVisitsPage = dynamic(() => import("@/components/pages/site-visits"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/site-visits
 */
export default function SiteVisitsPageRoute() {
  return <SiteVisitsPage />;
}
