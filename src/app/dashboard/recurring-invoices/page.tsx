"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const RecurringInvoicesPage = dynamic(() => import("@/components/pages/recurring-invoices"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/recurring-invoices
 */
export default function RecurringInvoicesPageRoute() {
  return <RecurringInvoicesPage language={useLang()} />;
}
