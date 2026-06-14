"use client";

import dynamic from "next/dynamic";

const ChangeOrdersPage = dynamic(() => import("@/components/pages/change-orders"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/change-orders
 */
export default function ChangeOrdersPageRoute() {
  return <ChangeOrdersPage />;
}
