"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const PaymentsPage = dynamic(() => import("@/components/pages/payments"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/payments
 */
export default function PaymentsPageRoute() {
  return <PaymentsPage language={useLang()} />;
}
