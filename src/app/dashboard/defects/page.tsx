"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const DefectsPage = dynamic(() => import("@/components/pages/defects"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/defects
 */
export default function DefectsPageRoute() {
  return <DefectsPage language={useLang()} />;
}
