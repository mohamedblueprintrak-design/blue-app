"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const CommissionsPage = dynamic(() => import("@/components/pages/commissions"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/commissions
 */
export default function CommissionsPageRoute() {
  return <CommissionsPage language={useLang()} />;
}
