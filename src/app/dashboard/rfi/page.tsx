"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const RfiPage = dynamic(() => import("@/components/pages/rfi"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/rfi
 */
export default function RfiPageRoute() {
  return <RfiPage language={useLang()} />;
}
