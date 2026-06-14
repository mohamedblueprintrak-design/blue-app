"use client";

import dynamic from "next/dynamic";

const RisksPage = dynamic(() => import("@/components/pages/risks"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/risks
 */
export default function RisksPageRoute() {
  return <RisksPage />;
}
