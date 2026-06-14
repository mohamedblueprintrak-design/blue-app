"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const InvoicesPage = dynamic(() => import("@/components/pages/invoices"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/invoices
 */
export default function InvoicesPageRoute() {
  return <InvoicesPage language={useLang()} />;
}
