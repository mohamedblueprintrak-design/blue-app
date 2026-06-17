"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const ContractsPage = dynamic(() => import("@/components/pages/contracts"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/contracts
 */
export default function ContractsPageRoute() {
  return <ContractsPage language={useLang()} />;
}
