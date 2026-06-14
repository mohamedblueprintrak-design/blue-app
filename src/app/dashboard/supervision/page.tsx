"use client";

import dynamic from "next/dynamic";

const SupervisionPage = dynamic(() => import("@/components/pages/supervision"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/supervision
 */
export default function SupervisionPageRoute() {
  return <SupervisionPage />;
}
