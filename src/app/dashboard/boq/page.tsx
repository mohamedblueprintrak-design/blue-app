"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const BoqPage = dynamic(() => import("@/components/pages/boq"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/boq
 */
export default function BoqPageRoute() {
  return <BoqPage language={useLang()} />;
}
