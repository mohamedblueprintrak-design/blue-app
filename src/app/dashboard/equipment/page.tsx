"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const EquipmentPage = dynamic(() => import("@/components/pages/equipment"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/equipment
 */
export default function EquipmentPageRoute() {
  return <EquipmentPage language={useLang()} />;
}
