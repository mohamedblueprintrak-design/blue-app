"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const InspectionsPage = dynamic(() => import("@/components/pages/inspections"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/inspections
 */
export default function InspectionsPageRoute() {
  return <InspectionsPage language={useLang()} />;
}
