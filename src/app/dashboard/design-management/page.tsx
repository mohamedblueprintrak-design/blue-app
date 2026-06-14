"use client";

import dynamic from "next/dynamic";

const DesignManagementPage = dynamic(() => import("@/components/pages/design-management"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/design-management
 */
export default function DesignManagementPageRoute() {
  return <DesignManagementPage />;
}
