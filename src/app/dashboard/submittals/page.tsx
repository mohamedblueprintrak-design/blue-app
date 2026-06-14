"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const SubmittalsPage = dynamic(() => import("@/components/pages/submittals"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/submittals
 */
export default function SubmittalsPageRoute() {
  return <SubmittalsPage language={useLang()} />;
}
