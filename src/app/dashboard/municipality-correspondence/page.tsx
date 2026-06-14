"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const MunicipalityCorrespondencePage = dynamic(() => import("@/components/pages/municipality-correspondence"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/municipality-correspondence
 */
export default function MunicipalityCorrespondencePageRoute() {
  return <MunicipalityCorrespondencePage language={useLang()} />;
}
