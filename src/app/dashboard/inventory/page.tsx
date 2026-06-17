"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const InventoryPage = dynamic(() => import("@/components/pages/inventory"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/inventory
 */
export default function InventoryPageRoute() {
  return <InventoryPage language={useLang()} />;
}
