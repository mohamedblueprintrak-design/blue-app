"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const PurchaseOrdersPage = dynamic(() => import("@/components/pages/purchase-orders"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/purchase-orders
 */
export default function PurchaseOrdersPageRoute() {
  return <PurchaseOrdersPage language={useLang()} />;
}
