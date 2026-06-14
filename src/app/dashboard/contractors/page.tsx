"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const ContractorsPage = dynamic(() => import("@/components/pages/contractors"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/contractors
 */
export default function ContractorsPageRoute() {
  return <ContractorsPage language={useLang()} />;
}
