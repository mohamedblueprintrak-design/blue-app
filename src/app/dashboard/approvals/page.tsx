"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const ApprovalsPage = dynamic(() => import("@/components/pages/approvals"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/approvals
 */
export default function ApprovalsPageRoute() {
  return <ApprovalsPage language={useLang()} />;
}
