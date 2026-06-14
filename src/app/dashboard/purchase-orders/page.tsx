"use client";

import dynamic from "next/dynamic";

const PurchaseOrdersPage = dynamic(() => import("@/components/pages/purchase-orders"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/purchase-orders
 */
export default function PurchaseOrdersPageRoute() {
  return <PurchaseOrdersPage />;
}
