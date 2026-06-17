"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const BillingPage = dynamic(() => import("@/components/pages/billing"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/billing
 */
export default function BillingPageRoute() {
  return <BillingPage language={useLang()} />;
}
