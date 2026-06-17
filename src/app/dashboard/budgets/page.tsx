"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const BudgetsPage = dynamic(() => import("@/components/pages/budgets"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/budgets
 */
export default function BudgetsPageRoute() {
  return <BudgetsPage language={useLang()} />;
}
