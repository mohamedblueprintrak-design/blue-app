"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const SiteDiaryPage = dynamic(() => import("@/components/pages/site-diary"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/site-diary
 */
export default function SiteDiaryPageRoute() {
  return <SiteDiaryPage language={useLang()} />;
}
