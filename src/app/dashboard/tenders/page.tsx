"use client";

import dynamic from "next/dynamic";

const TendersPage = dynamic(() => import("@/components/pages/tenders"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/tenders
 */
export default function TendersPageRoute() {
  return <TendersPage />;
}
